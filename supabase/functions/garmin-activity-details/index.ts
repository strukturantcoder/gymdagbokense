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

function isCardioActivity(activityType: string): boolean {
  const cardioTypes = ["running", "cycling", "swimming", "walking", "hiking", "cardio"];
  return cardioTypes.includes(activityType.toLowerCase());
}

// This endpoint handles Activity Details notifications from Garmin
// Called when detailed activity data is available
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    
    console.log("Garmin activity details webhook received:", JSON.stringify(body));
    
    // Process activity details
    const activityDetails = body.activityDetails || [];
    
    for (const detail of activityDetails) {
      const userAccessToken = detail.userAccessToken;
      const activityId = detail.activityId?.toString();
      
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
      
      const activityType = mapActivityType(detail.activityType || "OTHER");
      const startTime = detail.startTimeInSeconds 
        ? new Date(detail.startTimeInSeconds * 1000).toISOString()
        : new Date().toISOString();
      
      // Check if activity already exists
      const { data: existingActivity } = await supabase
        .from("garmin_activities")
        .select("id, synced_to_cardio_log_id")
        .eq("garmin_activity_id", activityId)
        .eq("user_id", connection.user_id)
        .maybeSingle();
      
      // If it's a cardio activity and not yet synced, create cardio log
      if (isCardioActivity(activityType) && (!existingActivity || !existingActivity.synced_to_cardio_log_id)) {
        const durationMinutes = detail.durationInSeconds 
          ? Math.round(detail.durationInSeconds / 60) 
          : 0;
        const distanceKm = detail.distanceInMeters 
          ? detail.distanceInMeters / 1000 
          : null;
        
        if (durationMinutes > 0) {
          const { data: cardioLog } = await supabase
            .from("cardio_logs")
            .insert({
              user_id: connection.user_id,
              activity_type: activityType,
              duration_minutes: durationMinutes,
              distance_km: distanceKm,
              calories_burned: detail.activeKilocalories || null,
              completed_at: startTime,
              notes: `Synkad från Garmin (detaljerad): ${detail.activityName || activityType}`,
            })
            .select("id")
            .single();
          
          if (cardioLog) {
            // Update or insert the garmin activity with cardio log reference
            await supabase
              .from("garmin_activities")
              .upsert({
                garmin_activity_id: activityId,
                user_id: connection.user_id,
                activity_type: activityType,
                activity_name: detail.activityName,
                start_time: startTime,
                duration_seconds: detail.durationInSeconds,
                distance_meters: detail.distanceInMeters,
                calories: detail.activeKilocalories,
                average_heart_rate: detail.averageHeartRateInBeatsPerMinute,
                max_heart_rate: detail.maxHeartRateInBeatsPerMinute,
                average_speed: detail.averageSpeedInMetersPerSecond,
                elevation_gain: detail.totalElevationGainInMeters,
                synced_to_cardio_log_id: cardioLog.id,
                raw_data: detail,
              }, {
                onConflict: "garmin_activity_id,user_id",
              });
            
            console.log("Created cardio log from activity details:", cardioLog.id);
          }
        }
      } else {
        // Just update the activity with detailed data
        await supabase
          .from("garmin_activities")
          .upsert({
            garmin_activity_id: activityId,
            user_id: connection.user_id,
            activity_type: activityType,
            activity_name: detail.activityName,
            start_time: startTime,
            duration_seconds: detail.durationInSeconds,
            distance_meters: detail.distanceInMeters,
            calories: detail.activeKilocalories,
            average_heart_rate: detail.averageHeartRateInBeatsPerMinute,
            max_heart_rate: detail.maxHeartRateInBeatsPerMinute,
            average_speed: detail.averageSpeedInMetersPerSecond,
            elevation_gain: detail.totalElevationGainInMeters,
            raw_data: detail,
          }, {
            onConflict: "garmin_activity_id,user_id",
          });
      }
      
      // Update last sync time
      await supabase
        .from("garmin_connections")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", connection.id);
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
    console.error("Error processing Garmin activity details:", err);
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
