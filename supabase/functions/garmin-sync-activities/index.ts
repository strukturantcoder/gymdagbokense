import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

function createSignatureBaseString(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");

  return `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
}

async function createSignature(
  baseString: string,
  consumerSecret: string,
  tokenSecret: string = ""
): Promise<string> {
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(baseString));
  return base64Encode(signature);
}

async function makeGarminRequest(
  url: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  queryParams: Record<string, string> = {}
): Promise<Response> {
  const nonce = generateNonce();
  const timestamp = generateTimestamp();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: "1.0",
  };

  const allParams = { ...oauthParams, ...queryParams };
  const baseString = createSignatureBaseString("GET", url, allParams);
  const signature = await createSignature(baseString, consumerSecret, accessTokenSecret);
  oauthParams.oauth_signature = signature;

  const authHeaderValue = "OAuth " + Object.keys(oauthParams)
    .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(", ");

  const queryString = Object.keys(queryParams).length > 0
    ? "?" + new URLSearchParams(queryParams).toString()
    : "";

  return fetch(url + queryString, {
    method: "GET",
    headers: {
      Authorization: authHeaderValue,
    },
  });
}

// Map Garmin activity types to our activity types
function mapActivityType(garminType: string): string {
  const typeMap: Record<string, string> = {
    running: "running",
    cycling: "cycling",
    swimming: "swimming",
    walking: "walking",
    hiking: "hiking",
    strength_training: "strength",
    cardio: "cardio",
    indoor_cycling: "cycling",
    indoor_running: "running",
    treadmill_running: "running",
    elliptical: "cardio",
    stair_climbing: "cardio",
    rowing: "rowing",
    yoga: "yoga",
    pilates: "pilates",
  };

  return typeMap[garminType.toLowerCase()] || "other";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const consumerKey = Deno.env.get("GARMIN_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("GARMIN_CONSUMER_SECRET");

    if (!consumerKey || !consumerSecret) {
      return new Response(
        JSON.stringify({ error: "Garmin API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's Garmin connection
    const { data: connection, error: connError } = await supabase
      .from("garmin_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ error: "Garmin not connected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse optional date range from request
    let startDate: string;
    let endDate: string;

    try {
      const body = await req.json();
      startDate = body.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      endDate = body.endDate || new Date().toISOString().split("T")[0];
    } catch {
      // Default to last 30 days
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      endDate = new Date().toISOString().split("T")[0];
    }

    // Fetch activities from Garmin
    const activitiesUrl = "https://apis.garmin.com/wellness-api/rest/activities";
    const response = await makeGarminRequest(
      activitiesUrl,
      consumerKey,
      consumerSecret,
      connection.oauth_token,
      connection.oauth_token_secret,
      {
        uploadStartTimeInSeconds: Math.floor(new Date(startDate).getTime() / 1000).toString(),
        uploadEndTimeInSeconds: Math.floor(new Date(endDate).getTime() / 1000).toString(),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Garmin API error:", errorText);
      
      // Check if token is expired/invalid
      if (response.status === 401) {
        await supabase
          .from("garmin_connections")
          .update({ is_active: false })
          .eq("user_id", user.id);
        
        return new Response(
          JSON.stringify({ error: "Garmin token expired. Please reconnect." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to fetch activities from Garmin" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activities = await response.json();
    let syncedCount = 0;
    const syncedActivities: any[] = [];

    // Process and store each activity
    for (const activity of activities) {
      const garminActivityId = activity.activityId?.toString() || activity.summaryId?.toString();
      
      if (!garminActivityId) continue;

      const activityData = {
        user_id: user.id,
        garmin_activity_id: garminActivityId,
        activity_type: mapActivityType(activity.activityType || "other"),
        activity_name: activity.activityName || activity.activityType || "Garmin Activity",
        start_time: new Date(activity.startTimeInSeconds * 1000).toISOString(),
        duration_seconds: activity.durationInSeconds || activity.activeTimeInSeconds,
        distance_meters: activity.distanceInMeters,
        calories: activity.activeKilocalories || activity.calories,
        average_heart_rate: activity.averageHeartRateInBeatsPerMinute,
        max_heart_rate: activity.maxHeartRateInBeatsPerMinute,
        average_speed: activity.averageSpeedInMetersPerSecond,
        elevation_gain: activity.elevationGainInMeters,
        raw_data: activity,
      };

      const { error: upsertError } = await supabase
        .from("garmin_activities")
        .upsert(activityData, {
          onConflict: "user_id,garmin_activity_id",
        });

      if (!upsertError) {
        syncedCount++;
        syncedActivities.push(activityData);
      }
    }

    // Update last sync time
    await supabase
      .from("garmin_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(
      JSON.stringify({
        success: true,
        syncedCount,
        totalActivities: activities.length,
        message: `Synced ${syncedCount} activities from Garmin`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in garmin-sync-activities:", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
