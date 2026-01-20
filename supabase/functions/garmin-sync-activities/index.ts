import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Garmin activity types to our activity types
// Map Garmin activity types to our activity types
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
    other: "other",
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
  
  // Default to cardio for unknown workout types
  return { type: "other", category: "cardio" };
}

// Check if activity type should be synced to cardio_logs
function isCardioActivity(garminType: string): boolean {
  return mapActivityType(garminType).category === "cardio";
}

// Check if activity type should be synced to workout_logs (strength)
function isStrengthActivity(garminType: string): boolean {
  return mapActivityType(garminType).category === "strength";
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

    // Garmin API has a max time range of 86400 seconds (24 hours)
    // We need to fetch in 24-hour chunks
    const MAX_RANGE_SECONDS = 86400;
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate + "T23:59:59").getTime() / 1000);

    // deno-lint-ignore no-explicit-any
    let allActivities: any[] = [];
    let currentStart = startTimestamp;

    // Fetch activities in 24-hour chunks
    while (currentStart < endTimestamp) {
      const currentEnd = Math.min(currentStart + MAX_RANGE_SECONDS - 1, endTimestamp);
      
      const activitiesUrl = `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${currentStart}&uploadEndTimeInSeconds=${currentEnd}`;
      
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
        
        // If 401, mark connection as inactive and return error
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

        // For other errors, continue to next chunk
        console.error(`Error fetching chunk ${currentStart}-${currentEnd}, continuing...`);
      } else {
        const activities = await response.json();
        if (Array.isArray(activities)) {
          allActivities = allActivities.concat(activities);
        }
      }

      // Move to next 24-hour chunk
      currentStart = currentEnd + 1;
    }

    console.log(`Total activities received from Garmin: ${allActivities.length}`);
    
    const activityList = allActivities;
    
    let syncedCount = 0;
    let cardioLogsSynced = 0;
    let workoutLogsSynced = 0;

    // Process and store each activity
    for (const activity of activityList) {
      const garminActivityId = activity.activityId?.toString() || activity.summaryId?.toString();
      
      if (!garminActivityId) continue;

      const garminType = activity.activityType || "other";
      const mapped = mapActivityType(garminType);
      const startTime = activity.startTimeInSeconds 
        ? new Date(activity.startTimeInSeconds * 1000).toISOString()
        : new Date().toISOString();
      const durationSeconds = activity.durationInSeconds || activity.activeTimeInSeconds;
      const durationMinutes = durationSeconds ? Math.round(durationSeconds / 60) : 0;
      const distanceMeters = activity.distanceInMeters;
      const calories = activity.activeKilocalories || activity.calories;
      const activityName = activity.activityName || garminType.replace(/_/g, " ") || "Aktivitet";

      // Check if this activity already exists
      const { data: existingActivity } = await supabase
        .from("garmin_activities")
        .select("id, synced_to_cardio_log_id, synced_to_workout_log_id")
        .eq("user_id", user.id)
        .eq("garmin_activity_id", garminActivityId)
        .maybeSingle();

      let cardioLogId: string | null = existingActivity?.synced_to_cardio_log_id || null;
      let workoutLogId: string | null = existingActivity?.synced_to_workout_log_id || null;

      // Sync to cardio_logs for cardio activities
      if (isCardioActivity(garminType) && !cardioLogId) {
        // Build detailed notes with Garmin data
        const notesParts: string[] = [`Synkad från Garmin: ${activityName}`];
        if (activity.averageHeartRateInBeatsPerMinute) {
          notesParts.push(`Snitthjärta: ${activity.averageHeartRateInBeatsPerMinute} bpm`);
        }
        if (activity.maxHeartRateInBeatsPerMinute) {
          notesParts.push(`Maxhjärta: ${activity.maxHeartRateInBeatsPerMinute} bpm`);
        }
        if (activity.elevationGainInMeters) {
          notesParts.push(`Höjdmeter: ${Math.round(activity.elevationGainInMeters)} m`);
        }
        if (calories) {
          notesParts.push(`Kalorier: ${Math.round(calories)} kcal`);
        }

        const cardioLogData = {
          user_id: user.id,
          activity_type: mapped.type,
          duration_minutes: durationMinutes,
          distance_km: distanceMeters ? Number((distanceMeters / 1000).toFixed(2)) : null,
          calories_burned: calories ? Math.round(calories) : null,
          completed_at: startTime,
          notes: notesParts.join(" | "),
        };

        const { data: newCardioLog, error: cardioError } = await supabase
          .from("cardio_logs")
          .insert(cardioLogData)
          .select("id")
          .single();

        if (!cardioError && newCardioLog) {
          cardioLogId = newCardioLog.id;
          cardioLogsSynced++;
          console.log(`Created cardio_log for ${activityName}: ${cardioLogId}`);

          // Award XP for cardio: 2 XP per minute + 10 XP per km
          const distanceKm = distanceMeters ? distanceMeters / 1000 : 0;
          const xpEarned = Math.round(durationMinutes * 2 + distanceKm * 10);
          
          // Update user stats with XP and cardio totals
          const { data: currentStats } = await supabase
            .from("user_stats")
            .select("total_xp, total_cardio_sessions, total_cardio_minutes, total_cardio_distance_km")
            .eq("user_id", user.id)
            .maybeSingle();

          if (currentStats) {
            await supabase
              .from("user_stats")
              .update({
                total_xp: currentStats.total_xp + xpEarned,
                total_cardio_sessions: currentStats.total_cardio_sessions + 1,
                total_cardio_minutes: currentStats.total_cardio_minutes + durationMinutes,
                total_cardio_distance_km: Number(currentStats.total_cardio_distance_km) + distanceKm,
              })
              .eq("user_id", user.id);
            console.log(`Awarded ${xpEarned} XP for cardio activity`);
          } else {
            // Create user_stats if it doesn't exist
            await supabase
              .from("user_stats")
              .insert({
                user_id: user.id,
                total_xp: xpEarned,
                total_cardio_sessions: 1,
                total_cardio_minutes: durationMinutes,
                total_cardio_distance_km: distanceKm,
              });
          }
        } else if (cardioError) {
          console.error(`Failed to create cardio_log for ${activityName}:`, cardioError);
        }
      }

      // Sync to workout_logs for strength activities
      if (isStrengthActivity(garminType) && !workoutLogId) {
        // Build detailed notes with Garmin data
        const notesParts: string[] = [`Synkad från Garmin: ${activityName}`];
        if (activity.averageHeartRateInBeatsPerMinute) {
          notesParts.push(`Snitthjärta: ${activity.averageHeartRateInBeatsPerMinute} bpm`);
        }
        if (calories) {
          notesParts.push(`Kalorier: ${Math.round(calories)} kcal`);
        }

        const workoutLogData = {
          user_id: user.id,
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
          workoutLogsSynced++;
          console.log(`Created workout_log for ${activityName}: ${workoutLogId}`);

          // Award XP for strength: 50 base + duration bonus (capped at 200 XP)
          const xpEarned = Math.min(200, 50 + Math.floor(durationMinutes / 5) * 5);
          
          // Update user stats with XP and workout totals
          const { data: currentStats } = await supabase
            .from("user_stats")
            .select("total_xp, total_workouts, total_minutes")
            .eq("user_id", user.id)
            .maybeSingle();

          if (currentStats) {
            await supabase
              .from("user_stats")
              .update({
                total_xp: currentStats.total_xp + xpEarned,
                total_workouts: currentStats.total_workouts + 1,
                total_minutes: currentStats.total_minutes + durationMinutes,
              })
              .eq("user_id", user.id);
            console.log(`Awarded ${xpEarned} XP for strength activity`);
          } else {
            // Create user_stats if it doesn't exist
            await supabase
              .from("user_stats")
              .insert({
                user_id: user.id,
                total_xp: xpEarned,
                total_workouts: 1,
                total_minutes: durationMinutes,
              });
          }

          // Try to fetch detailed exercises from FIT file
          try {
            const fetchExercisesUrl = `${supabaseUrl}/functions/v1/garmin-fetch-strength-exercises`;
            const exerciseResponse = await fetch(fetchExercisesUrl, {
              method: "POST",
              headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                garminActivityId,
                workoutLogId: newWorkoutLog.id,
              }),
            });
            
            if (exerciseResponse.ok) {
              const exerciseData = await exerciseResponse.json();
              console.log(`Synced ${exerciseData.exercisesCreated || 0} exercises for ${activityName}`);
            } else {
              console.log("Could not fetch detailed exercises (this is normal for some activities)");
            }
          } catch (fetchError) {
            console.log("Error fetching exercises (non-critical):", fetchError);
          }
        } else if (workoutError) {
          console.error(`Failed to create workout_log for ${activityName}:`, workoutError);
        }
      }

      const activityData = {
        user_id: user.id,
        garmin_activity_id: garminActivityId,
        activity_type: mapped.type,
        activity_name: activityName,
        start_time: startTime,
        duration_seconds: durationSeconds,
        distance_meters: distanceMeters,
        calories: calories ? Math.round(calories) : null,
        average_heart_rate: activity.averageHeartRateInBeatsPerMinute,
        max_heart_rate: activity.maxHeartRateInBeatsPerMinute,
        average_speed: activity.averageSpeedInMetersPerSecond,
        elevation_gain: activity.elevationGainInMeters,
        raw_data: activity,
        synced_to_cardio_log_id: cardioLogId,
        synced_to_workout_log_id: workoutLogId,
      };

      const { error: upsertError } = await supabase
        .from("garmin_activities")
        .upsert(activityData, {
          onConflict: "user_id,garmin_activity_id",
        });

      if (!upsertError) {
        syncedCount++;
      } else {
        console.error(`Failed to upsert garmin_activity ${garminActivityId}:`, upsertError);
      }
    }

    // Update last sync time
    await supabase
      .from("garmin_connections")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", user.id);

    console.log(`Sync complete: ${syncedCount} activities, ${cardioLogsSynced} cardio, ${workoutLogsSynced} strength`);

    return new Response(
      JSON.stringify({
        success: true,
        syncedCount,
        cardioLogsSynced,
        workoutLogsSynced,
        totalActivities: activityList.length,
        message: `Synkade ${syncedCount} aktiviteter från Garmin (${cardioLogsSynced} kondition, ${workoutLogsSynced} styrka)`,
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
