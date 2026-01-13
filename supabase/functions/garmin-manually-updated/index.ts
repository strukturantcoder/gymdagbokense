import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maps Garmin activity types to our internal types
function mapActivityType(garminType: string): string {
  const typeMap: Record<string, string> = {
    "RUNNING": "running",
    "CYCLING": "cycling",
    "SWIMMING": "swimming",
    "WALKING": "walking",
    "HIKING": "hiking",
    "STRENGTH_TRAINING": "strength",
    "CARDIO": "cardio",
    "OTHER": "other",
  };
  return typeMap[garminType?.toUpperCase()] || "other";
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
      
      const activityType = mapActivityType(activity.activityType || "OTHER");
      const startTime = activity.startTimeInSeconds 
        ? new Date(activity.startTimeInSeconds * 1000).toISOString()
        : new Date().toISOString();
      
      // Update the existing activity with new data
      const { error: updateError } = await supabase
        .from("garmin_activities")
        .update({
          activity_type: activityType,
          activity_name: activity.activityName,
          start_time: startTime,
          duration_seconds: activity.durationInSeconds,
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
      
      // Also update the linked cardio log if it exists
      const { data: garminActivity } = await supabase
        .from("garmin_activities")
        .select("synced_to_cardio_log_id")
        .eq("garmin_activity_id", activityId)
        .eq("user_id", connection.user_id)
        .maybeSingle();
      
      if (garminActivity?.synced_to_cardio_log_id) {
        const durationMinutes = activity.durationInSeconds 
          ? Math.round(activity.durationInSeconds / 60) 
          : null;
        const distanceKm = activity.distanceInMeters 
          ? activity.distanceInMeters / 1000 
          : null;
        
        await supabase
          .from("cardio_logs")
          .update({
            activity_type: activityType,
            duration_minutes: durationMinutes,
            distance_km: distanceKm,
            calories_burned: activity.activeKilocalories || null,
            completed_at: startTime,
            notes: `Uppdaterad från Garmin: ${activity.activityName || activityType}`,
          })
          .eq("id", garminActivity.synced_to_cardio_log_id);
        
        console.log("Updated linked cardio log:", garminActivity.synced_to_cardio_log_id);
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
