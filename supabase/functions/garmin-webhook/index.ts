import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Garmin activity types to our types
function mapActivityType(garminType: string): string {
  const typeMap: Record<string, string> = {
    running: "running",
    cycling: "cycling",
    swimming: "swimming",
    walking: "walking",
    hiking: "hiking",
    fitness_equipment: "gym",
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
    other: "other",
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

Deno.serve(async (req) => {
  // IMPORTANT: Respond quickly with 200 to meet Garmin's 30-second requirement
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    
    console.log("Garmin webhook received:", JSON.stringify(body).substring(0, 500));
    
    // Garmin sends different types of notifications
    // Activities, Daily Summaries, Sleep, Body Composition, etc.
    
    // Handle activity data push
    if (body.activities || body.activityDetails) {
      const activities = body.activities || body.activityDetails || [];
      
      for (const activity of activities) {
        // Find user by their Garmin user access token or user ID
        const garminUserId = activity.userId || activity.userAccessToken;
        
        if (!garminUserId) {
          console.log("No Garmin user ID in activity, skipping");
          continue;
        }
        
        // Find the user connection
        const { data: connection, error: connectionError } = await supabase
          .from("garmin_connections")
          .select("user_id")
          .eq("garmin_user_id", garminUserId)
          .eq("is_active", true)
          .maybeSingle();
        
        if (connectionError || !connection) {
          // Try matching by oauth_token as fallback
          console.log("No connection found for Garmin user:", garminUserId);
          continue;
        }
        
        const userId = connection.user_id;
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
          .eq("user_id", userId)
          .eq("garmin_activity_id", garminActivityId)
          .maybeSingle();

        let cardioLogId: string | null = existingActivity?.synced_to_cardio_log_id || null;

        // If it's a cardio activity and not already synced to cardio_logs, create one
        if (isCardioActivity(activity.activityType || "") && !cardioLogId) {
          const cardioLogData = {
            user_id: userId,
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
          }
        }

        const activityData = {
          user_id: userId,
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

        await supabase
          .from("garmin_activities")
          .upsert(activityData, { onConflict: "user_id,garmin_activity_id" });
        
        // Update last_sync_at
        await supabase
          .from("garmin_connections")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("user_id", userId);
      }
    }
    
    // Handle daily summaries
    if (body.dailies) {
      console.log("Received daily summaries:", body.dailies.length);
      // Store or process daily summaries if needed
    }
    
    // Handle sleep data
    if (body.sleeps) {
      console.log("Received sleep data:", body.sleeps.length);
      // Store or process sleep data if needed
    }

    // IMPORTANT: Always return 200 quickly
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    console.error("Error processing Garmin webhook:", err);
    // Still return 200 to acknowledge receipt per Garmin requirements
    return new Response(
      JSON.stringify({ success: true, error: "Processing error" }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
