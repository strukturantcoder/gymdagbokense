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
      
      const garminActivityType = detail.activityType || "OTHER";
      const mapped = mapActivityType(garminActivityType);
      const startTime = detail.startTimeInSeconds 
        ? new Date(detail.startTimeInSeconds * 1000).toISOString()
        : new Date().toISOString();
      const durationSeconds = detail.durationInSeconds;
      const durationMinutes = durationSeconds ? Math.round(durationSeconds / 60) : 0;
      const distanceKm = detail.distanceInMeters ? detail.distanceInMeters / 1000 : null;
      const calories = detail.activeKilocalories;
      const activityName = detail.activityName || garminActivityType.replace(/_/g, " ");
      
      // Check if activity already exists
      const { data: existingActivity } = await supabase
        .from("garmin_activities")
        .select("id, synced_to_cardio_log_id, synced_to_workout_log_id")
        .eq("garmin_activity_id", activityId)
        .eq("user_id", connection.user_id)
        .maybeSingle();
      
      let cardioLogId: string | null = existingActivity?.synced_to_cardio_log_id || null;
      let workoutLogId: string | null = existingActivity?.synced_to_workout_log_id || null;

      // If it's a cardio activity and not yet synced, create cardio log
      if (mapped.category === "cardio" && !cardioLogId && durationMinutes > 0) {
        const { data: cardioLog } = await supabase
          .from("cardio_logs")
          .insert({
            user_id: connection.user_id,
            activity_type: mapped.type,
            duration_minutes: durationMinutes,
            distance_km: distanceKm,
            calories_burned: calories || null,
            completed_at: startTime,
            notes: `Synkad från Garmin: ${activityName}`,
          })
          .select("id")
          .single();
        
        if (cardioLog) {
          cardioLogId = cardioLog.id;
          console.log("Created cardio log from activity details:", cardioLog.id);
        }
      }

      // If it's a strength activity and not yet synced, create workout log
      if (mapped.category === "strength" && !workoutLogId && durationMinutes > 0) {
        const notesParts: string[] = [`Synkad från Garmin: ${activityName}`];
        if (detail.averageHeartRateInBeatsPerMinute) {
          notesParts.push(`Snitthjärta: ${detail.averageHeartRateInBeatsPerMinute} bpm`);
        }
        if (calories) {
          notesParts.push(`Kalorier: ${Math.round(calories)} kcal`);
        }

        const { data: workoutLog } = await supabase
          .from("workout_logs")
          .insert({
            user_id: connection.user_id,
            workout_day: `Garmin: ${activityName}`,
            duration_minutes: durationMinutes,
            completed_at: startTime,
            notes: notesParts.join(" | "),
          })
          .select("id")
          .single();
        
        if (workoutLog) {
          workoutLogId = workoutLog.id;
          console.log("Created workout log from activity details:", workoutLog.id);

          // Award XP for strength: 50 base + duration bonus (capped at 200 XP)
          const xpEarned = Math.min(200, 50 + Math.floor(durationMinutes / 5) * 5);
          
          const { data: currentStats } = await supabase
            .from("user_stats")
            .select("total_xp, total_workouts, total_minutes")
            .eq("user_id", connection.user_id)
            .maybeSingle();

          if (currentStats) {
            await supabase
              .from("user_stats")
              .update({
                total_xp: currentStats.total_xp + xpEarned,
                total_workouts: currentStats.total_workouts + 1,
                total_minutes: currentStats.total_minutes + durationMinutes,
              })
              .eq("user_id", connection.user_id);
          } else {
            await supabase
              .from("user_stats")
              .insert({
                user_id: connection.user_id,
                total_xp: xpEarned,
                total_workouts: 1,
                total_minutes: durationMinutes,
              });
          }
        }
      }

      // Upsert the garmin activity with references
      await supabase
        .from("garmin_activities")
        .upsert({
          garmin_activity_id: activityId,
          user_id: connection.user_id,
          activity_type: mapped.type,
          activity_name: activityName,
          start_time: startTime,
          duration_seconds: durationSeconds,
          distance_meters: detail.distanceInMeters,
          calories: calories,
          average_heart_rate: detail.averageHeartRateInBeatsPerMinute,
          max_heart_rate: detail.maxHeartRateInBeatsPerMinute,
          average_speed: detail.averageSpeedInMetersPerSecond,
          elevation_gain: detail.totalElevationGainInMeters,
          synced_to_cardio_log_id: cardioLogId,
          synced_to_workout_log_id: workoutLogId,
          raw_data: detail,
        }, {
          onConflict: "garmin_activity_id,user_id",
        });
      
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
