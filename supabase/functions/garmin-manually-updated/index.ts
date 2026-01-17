import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maps Garmin activity types to our internal types
function mapActivityType(garminType: string): { type: string; category: "cardio" | "strength" | "other" } {
  const lowerType = garminType?.toLowerCase() || "";
  
  // Strength activities
  const strengthTypes = [
    "strength_training", "weight_training", "weightlifting", 
    "gym", "crossfit", "functional_training", "bodyweight",
    "kettlebell", "resistance_training"
  ];
  
  if (strengthTypes.some(t => lowerType.includes(t))) {
    return { type: "strength", category: "strength" };
  }
  
  // Cardio type mapping
  const cardioMap: Record<string, string> = {
    running: "running",
    trail_running: "running",
    treadmill_running: "running",
    indoor_running: "running",
    cycling: "cycling",
    indoor_cycling: "cycling",
    virtual_cycling: "cycling",
    mountain_biking: "cycling",
    swimming: "swimming",
    pool_swimming: "swimming",
    open_water_swimming: "swimming",
    walking: "walking",
    hiking: "hiking",
    elliptical: "elliptical",
    stair_climbing: "stair_climbing",
    rowing: "rowing",
    indoor_rowing: "rowing",
    cardio: "cardio",
    fitness_equipment: "cardio",
  };
  
  for (const [key, value] of Object.entries(cardioMap)) {
    if (lowerType.includes(key)) {
      return { type: value, category: "cardio" };
    }
  }
  
  // Flexibility/other
  const otherTypes = ["yoga", "pilates", "stretching", "meditation", "breathwork"];
  if (otherTypes.some(t => lowerType.includes(t))) {
    return { type: lowerType.replace(/_/g, " "), category: "other" };
  }
  
  // Default to other
  return { type: "other", category: "other" };
}

// This endpoint handles Manually Updated Activities notifications from Garmin
// Called when a user manually edits an activity in Garmin Connect
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    
    console.log("Garmin manually updated activities webhook received:", JSON.stringify(body));
    
    // Process manually updated activities
    const manuallyUpdatedActivities = body.manuallyUpdatedActivities || body.activityDetails || [];
    
    for (const activity of manuallyUpdatedActivities) {
      const userAccessToken = activity.userAccessToken;
      const activityId = activity.activityId?.toString();
      
      if (!userAccessToken || !activityId) continue;
      
      // Find the user by their access token
      const { data: connection, error: findError } = await supabase
        .from("garmin_connections")
        .select("id, user_id")
        .eq("oauth_token", userAccessToken)
        .eq("is_active", true)
        .maybeSingle();
      
      if (findError || !connection) {
        console.log("No active connection found for token");
        continue;
      }
      
      const garminActivityType = activity.activityType || "OTHER";
      const mapped = mapActivityType(garminActivityType);
      const startTime = activity.startTimeInSeconds 
        ? new Date(activity.startTimeInSeconds * 1000).toISOString()
        : new Date().toISOString();
      const durationSeconds = activity.durationInSeconds;
      const durationMinutes = durationSeconds ? Math.round(durationSeconds / 60) : null;
      
      // Update the existing activity with new data
      const { error: updateError } = await supabase
        .from("garmin_activities")
        .update({
          activity_type: mapped.type,
          activity_name: activity.activityName,
          start_time: startTime,
          duration_seconds: durationSeconds,
          distance_meters: activity.distanceInMeters,
          calories: activity.activeKilocalories,
          average_heart_rate: activity.averageHeartRateInBeatsPerMinute,
          max_heart_rate: activity.maxHeartRateInBeatsPerMinute,
          average_speed: activity.averageSpeedInMetersPerSecond,
          elevation_gain: activity.totalElevationGainInMeters,
          raw_data: activity,
        })
        .eq("garmin_activity_id", activityId)
        .eq("user_id", connection.user_id);
      
      if (updateError) {
        console.log("Error updating activity:", updateError);
        continue;
      }
      
      // Get the linked logs
      const { data: garminActivity } = await supabase
        .from("garmin_activities")
        .select("synced_to_cardio_log_id, synced_to_workout_log_id")
        .eq("garmin_activity_id", activityId)
        .eq("user_id", connection.user_id)
        .maybeSingle();
      
      // Update linked cardio log if it exists
      if (garminActivity?.synced_to_cardio_log_id) {
        const distanceKm = activity.distanceInMeters 
          ? activity.distanceInMeters / 1000 
          : null;
        
        await supabase
          .from("cardio_logs")
          .update({
            activity_type: mapped.type,
            duration_minutes: durationMinutes,
            distance_km: distanceKm,
            calories_burned: activity.activeKilocalories || null,
            completed_at: startTime,
            notes: `Uppdaterad från Garmin: ${activity.activityName || mapped.type}`,
          })
          .eq("id", garminActivity.synced_to_cardio_log_id);
        
        console.log("Updated linked cardio log:", garminActivity.synced_to_cardio_log_id);
      }
      
      // Update linked workout log if it exists
      if (garminActivity?.synced_to_workout_log_id) {
        const notesParts: string[] = [`Uppdaterad från Garmin: ${activity.activityName || 'Styrkepass'}`];
        if (activity.averageHeartRateInBeatsPerMinute) {
          notesParts.push(`Snitthjärta: ${activity.averageHeartRateInBeatsPerMinute} bpm`);
        }
        if (activity.activeKilocalories) {
          notesParts.push(`Kalorier: ${Math.round(activity.activeKilocalories)} kcal`);
        }

        await supabase
          .from("workout_logs")
          .update({
            workout_day: `Garmin: ${activity.activityName || 'Styrkepass'}`,
            duration_minutes: durationMinutes,
            completed_at: startTime,
            notes: notesParts.join(" | "),
          })
          .eq("id", garminActivity.synced_to_workout_log_id);
        
        console.log("Updated linked workout log:", garminActivity.synced_to_workout_log_id);
      }
      
      // Update last sync time
      await supabase
        .from("garmin_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", connection.id);
      
      console.log("Updated manually edited activity:", activityId);
    }
    
    // IMPORTANT: Always return 200 quickly per Garmin requirements
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    console.error("Error processing Garmin manually updated activities:", err);
    // Still return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
