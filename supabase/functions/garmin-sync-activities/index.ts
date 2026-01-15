import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Check if activity type should be synced to cardio_logs
function isCardioActivity(activityType: string): boolean {
  const cardioTypes = [
    "running", "cycling", "swimming", "walking", "hiking", 
    "cardio", "rowing", "elliptical", "stair_climbing",
    "indoor_cycling", "indoor_running", "treadmill_running"
  ];
  return cardioTypes.includes(activityType.toLowerCase());
}

// Garmin OAuth2 token refresh
async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  try {
    const tokenUrl = "https://diauth.garmin.com/di-oauth2-service/oauth/token";
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      console.error("Token refresh failed:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GARMIN_CONSUMER_KEY");
    const clientSecret = Deno.env.get("GARMIN_CONSUMER_SECRET");

    if (!clientId || !clientSecret) {
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

    // oauth_token = access_token, oauth_token_secret = refresh_token (for OAuth2)
    let accessToken = connection.oauth_token;
    const refreshToken = connection.oauth_token_secret;

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

    // Calculate epoch seconds for date range
    const uploadStartTime = Math.floor(new Date(startDate).getTime() / 1000);
    const uploadEndTime = Math.floor(new Date(endDate + "T23:59:59").getTime() / 1000);

    // Fetch activities from Garmin using OAuth2 Bearer token
    const activitiesUrl = `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${uploadStartTime}&uploadEndTimeInSeconds=${uploadEndTime}`;
    
    console.log("Fetching activities from:", activitiesUrl);
    
    let response = await fetch(activitiesUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    // If token is expired, try to refresh it
    if (response.status === 401 && refreshToken) {
      console.log("Access token expired, attempting refresh...");
      
      const newTokens = await refreshAccessToken(refreshToken, clientId, clientSecret);
      
      if (newTokens) {
        // Update stored tokens
        await supabase
          .from("garmin_connections")
          .update({
            oauth_token: newTokens.accessToken,
            oauth_token_secret: newTokens.refreshToken,
          })
          .eq("user_id", user.id);
        
        accessToken = newTokens.accessToken;
        
        // Retry the request with new token
        response = await fetch(activitiesUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Garmin API error:", response.status, errorText);
      
      // If still 401, mark connection as inactive
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
        JSON.stringify({ error: "Failed to fetch activities from Garmin", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const activities = await response.json();
    console.log(`Received ${Array.isArray(activities) ? activities.length : 0} activities from Garmin`);
    
    // Handle case where activities is not an array
    const activityList = Array.isArray(activities) ? activities : [];
    
    let syncedCount = 0;
    let cardioLogsSynced = 0;

    // Process and store each activity
    for (const activity of activityList) {
      const garminActivityId = activity.activityId?.toString() || activity.summaryId?.toString();
      
      if (!garminActivityId) continue;

      const mappedActivityType = mapActivityType(activity.activityType || "other");
      const startTime = activity.startTimeInSeconds 
        ? new Date(activity.startTimeInSeconds * 1000).toISOString()
        : new Date().toISOString();
      const durationSeconds = activity.durationInSeconds || activity.activeTimeInSeconds;
      const distanceMeters = activity.distanceInMeters;
      const calories = activity.activeKilocalories || activity.calories;

      // Check if this activity already exists
      const { data: existingActivity } = await supabase
        .from("garmin_activities")
        .select("id, synced_to_cardio_log_id")
        .eq("user_id", user.id)
        .eq("garmin_activity_id", garminActivityId)
        .maybeSingle();

      let cardioLogId: string | null = existingActivity?.synced_to_cardio_log_id || null;

      // If it's a cardio activity and not already synced to cardio_logs, create one
      if (isCardioActivity(activity.activityType || "") && !cardioLogId) {
        const cardioLogData = {
          user_id: user.id,
          activity_type: mappedActivityType,
          duration_minutes: durationSeconds ? Math.round(durationSeconds / 60) : 0,
          distance_km: distanceMeters ? Number((distanceMeters / 1000).toFixed(2)) : null,
          calories_burned: calories || null,
          completed_at: startTime,
          notes: `Synkad från Garmin: ${activity.activityName || activity.activityType || "Aktivitet"}`,
        };

        const { data: newCardioLog, error: cardioError } = await supabase
          .from("cardio_logs")
          .insert(cardioLogData)
          .select("id")
          .single();

        if (!cardioError && newCardioLog) {
          cardioLogId = newCardioLog.id;
          cardioLogsSynced++;
        }
      }

      const activityData = {
        user_id: user.id,
        garmin_activity_id: garminActivityId,
        activity_type: mappedActivityType,
        activity_name: activity.activityName || activity.activityType || "Garmin Activity",
        start_time: startTime,
        duration_seconds: durationSeconds,
        distance_meters: distanceMeters,
        calories: calories,
        average_heart_rate: activity.averageHeartRateInBeatsPerMinute,
        max_heart_rate: activity.maxHeartRateInBeatsPerMinute,
        average_speed: activity.averageSpeedInMetersPerSecond,
        elevation_gain: activity.elevationGainInMeters,
        raw_data: activity,
        synced_to_cardio_log_id: cardioLogId,
      };

      const { error: upsertError } = await supabase
        .from("garmin_activities")
        .upsert(activityData, {
          onConflict: "user_id,garmin_activity_id",
        });

      if (!upsertError) {
        syncedCount++;
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
        cardioLogsSynced,
        totalActivities: activityList.length,
        message: `Synkade ${syncedCount} aktiviteter från Garmin (${cardioLogsSynced} nya cardio-loggar)`,
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
