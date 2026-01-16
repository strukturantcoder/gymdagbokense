import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HMAC-SHA1 implementation using Web Crypto API
async function hmacSha1(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return base64Encode(signature);
}

// OAuth 1.0a signature helper
async function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): Promise<string> {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join("&");

  const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  return await hmacSha1(signingKey, signatureBase);
}

function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

// Haversine formula to calculate distance between two GPS points
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Decode Google-style polyline
function decodePolyline(encoded: string): number[][] {
  const points: number[][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

// Fetch GPS route data from Garmin API
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const consumerKey = Deno.env.get("GARMIN_CONSUMER_KEY")!;
  const consumerSecret = Deno.env.get("GARMIN_CONSUMER_SECRET")!;

  // Authenticate user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { garminActivityId } = await req.json();

    if (!garminActivityId) {
      return new Response(JSON.stringify({ error: "Missing garminActivityId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's Garmin connection
    const adminSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    
    const { data: connection } = await adminSupabase
      .from("garmin_connections")
      .select("oauth_token, oauth_token_secret")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!connection) {
      return new Response(JSON.stringify({ error: "No Garmin connection found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get activity details from database (may have cached route)
    const { data: activity } = await adminSupabase
      .from("garmin_activities")
      .select("raw_data, synced_to_cardio_log_id")
      .eq("garmin_activity_id", garminActivityId)
      .eq("user_id", user.id)
      .maybeSingle();

    // Check if we already have route data cached
    const rawData = activity?.raw_data as Record<string, unknown> | null;
    if (rawData?.gps_route) {
      console.log("Returning cached GPS route");
      return new Response(JSON.stringify({ 
        route: rawData.gps_route,
        cached: true 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch activity details from Garmin Health API
    const apiUrl = `https://apis.garmin.com/wellness-api/rest/activityDetails`;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();

    // Build OAuth parameters
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_token: connection.oauth_token,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: "1.0",
    };

    // For GET with query params
    const queryParams = new URLSearchParams({ activityId: garminActivityId });
    const fullUrl = `${apiUrl}?${queryParams.toString()}`;
    
    // Include query params in signature
    const allParams = { ...oauthParams, activityId: garminActivityId };
    
    const signature = await generateOAuthSignature(
      "GET",
      apiUrl,
      allParams,
      consumerSecret,
      connection.oauth_token_secret
    );

    oauthParams.oauth_signature = signature;

    const authHeaderValue = "OAuth " + Object.keys(oauthParams)
      .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(", ");

    console.log("Fetching activity details from Garmin:", fullUrl);

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: authHeaderValue,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Garmin API error:", response.status, errorText);
      return new Response(JSON.stringify({ 
        error: "Failed to fetch from Garmin",
        status: response.status 
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const activityDetails = await response.json();
    console.log("Received activity details keys:", Object.keys(activityDetails));

    // Extract GPS samples if available
    let gpsRoute = null;
    
    // Garmin activity details might have samples with lat/lon
    if (activityDetails.samples) {
      const gpsPoints = activityDetails.samples
        .filter((s: { latitudeInDegree?: number; longitudeInDegree?: number }) => 
          s.latitudeInDegree !== undefined && s.longitudeInDegree !== undefined
        )
        .map((s: { 
          latitudeInDegree: number; 
          longitudeInDegree: number; 
          clockDurationInSeconds?: number;
          speedMetersPerSecond?: number;
        }) => ({
          latitude: s.latitudeInDegree,
          longitude: s.longitudeInDegree,
          timestamp: s.clockDurationInSeconds || 0,
          speed: s.speedMetersPerSecond || null,
        }));

      if (gpsPoints.length >= 2) {
        // Calculate stats
        let totalDistance = 0;
        let maxSpeed = 0;
        
        for (let i = 1; i < gpsPoints.length; i++) {
          const prev = gpsPoints[i - 1];
          const curr = gpsPoints[i];
          totalDistance += haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
          if (curr.speed && curr.speed > maxSpeed) {
            maxSpeed = curr.speed;
          }
        }

        const speedPoints = gpsPoints.filter((p: { speed: number | null }) => p.speed);
        const avgSpeed = speedPoints.length > 0
          ? gpsPoints.reduce((sum: number, p: { speed: number | null }) => sum + (p.speed || 0), 0) / speedPoints.length
          : 0;

        gpsRoute = {
          positions: gpsPoints,
          totalDistanceKm: totalDistance / 1000,
          averageSpeedKmh: avgSpeed * 3.6,
          maxSpeedKmh: maxSpeed * 3.6,
        };

        // Cache the route in raw_data
        const updatedRawData = {
          ...(rawData || {}),
          gps_route: gpsRoute,
        };

        await adminSupabase
          .from("garmin_activities")
          .update({ raw_data: updatedRawData })
          .eq("garmin_activity_id", garminActivityId)
          .eq("user_id", user.id);

        console.log(`Cached GPS route with ${gpsPoints.length} points`);
      }
    }

    // Also check for polyline in summary data
    if (!gpsRoute && activityDetails.polyline) {
      // Decode polyline if present
      const decoded = decodePolyline(activityDetails.polyline);
      if (decoded.length >= 2) {
        gpsRoute = {
          positions: decoded.map((coord, idx) => ({
            latitude: coord[0],
            longitude: coord[1],
            timestamp: idx,
            speed: null,
          })),
          totalDistanceKm: activityDetails.distanceInMeters ? activityDetails.distanceInMeters / 1000 : 0,
          averageSpeedKmh: activityDetails.averageSpeedInMetersPerSecond ? activityDetails.averageSpeedInMetersPerSecond * 3.6 : 0,
          maxSpeedKmh: 0,
        };
      }
    }

    return new Response(JSON.stringify({ 
      route: gpsRoute,
      cached: false 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Error fetching Garmin route:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
