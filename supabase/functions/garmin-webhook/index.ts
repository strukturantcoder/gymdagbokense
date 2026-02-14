import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Garmin activity types to our types
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

        const garminActivityType = activity.activityType || "other";
        const mapped = mapActivityType(garminActivityType);
        const startTime = activity.startTimeInSeconds 
          ? new Date(activity.startTimeInSeconds * 1000).toISOString()
          : new Date().toISOString();
        const durationSeconds = activity.durationInSeconds || activity.activeTimeInSeconds;
        const durationMinutes = durationSeconds ? Math.round(durationSeconds / 60) : 0;
        const distanceMeters = activity.distanceInMeters;
        const calories = activity.activeKilocalories || activity.calories;
        const activityName = activity.activityName || garminActivityType.replace(/_/g, " ");

        // Check if this activity already exists
        const { data: existingActivity } = await supabase
          .from("garmin_activities")
          .select("id, synced_to_cardio_log_id, synced_to_workout_log_id")
          .eq("user_id", userId)
          .eq("garmin_activity_id", garminActivityId)
          .maybeSingle();

        let cardioLogId: string | null = existingActivity?.synced_to_cardio_log_id || null;
        let workoutLogId: string | null = existingActivity?.synced_to_workout_log_id || null;

        // If it's a cardio activity and not already synced to cardio_logs, create one
        if (mapped.category === "cardio" && !cardioLogId && durationMinutes > 0) {
          const cardioLogData = {
            user_id: userId,
            activity_type: mapped.type,
            duration_minutes: durationMinutes,
            distance_km: distanceMeters ? Number((distanceMeters / 1000).toFixed(2)) : null,
            calories_burned: calories || null,
            completed_at: startTime,
            notes: `Synkad från Garmin: ${activityName}`,
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

        // If it's a strength activity and not already synced to workout_logs, create one
        if (mapped.category === "strength" && !workoutLogId && durationMinutes > 0) {
          const notesParts: string[] = [`Synkad från Garmin: ${activityName}`];
          if (activity.averageHeartRateInBeatsPerMinute) {
            notesParts.push(`Snitthjärta: ${activity.averageHeartRateInBeatsPerMinute} bpm`);
          }
          if (calories) {
            notesParts.push(`Kalorier: ${Math.round(calories)} kcal`);
          }

          const workoutLogData = {
            user_id: userId,
            workout_day: `Garmin: ${activityName}`,
            duration_minutes: durationMinutes,
            completed_at: startTime,
            notes: notesParts.join(" | "),
          };

          const { data: newWorkoutLog, error: workoutError } = await supabase
            .from("workout_logs")
            .insert(workoutLogData)
            .select("id")
            .single();

          if (!workoutError && newWorkoutLog) {
            workoutLogId = newWorkoutLog.id;
            console.log("Created workout log from webhook:", workoutLogId);

            // Award XP for strength: 50 base + duration bonus (capped at 200 XP)
            const xpEarned = Math.min(200, 50 + Math.floor(durationMinutes / 5) * 5);
            
            const { data: currentStats } = await supabase
              .from("user_stats")
              .select("total_xp, total_workouts, total_minutes")
              .eq("user_id", userId)
              .maybeSingle();

            if (currentStats) {
              await supabase
                .from("user_stats")
                .update({
                  total_xp: currentStats.total_xp + xpEarned,
                  total_workouts: currentStats.total_workouts + 1,
                  total_minutes: currentStats.total_minutes + durationMinutes,
                })
                .eq("user_id", userId);
            } else {
              await supabase
                .from("user_stats")
                .insert({
                  user_id: userId,
                  total_xp: xpEarned,
                  total_workouts: 1,
                  total_minutes: durationMinutes,
                });
            }
          }
        }

        const activityData = {
          user_id: userId,
          garmin_activity_id: garminActivityId,
          activity_type: mapped.type,
          activity_name: activityName,
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
          synced_to_workout_log_id: workoutLogId,
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
