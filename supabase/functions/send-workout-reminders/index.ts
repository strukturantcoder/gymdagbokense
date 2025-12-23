import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base64url encoding for VAPID
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateVapidHeaders(endpoint: string, vapidPublicKey: string, vapidPrivateKey: string) {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;

  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: "mailto:info@gymdagboken.se",
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyBytes = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  return {
    Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    "Content-Type": "application/octet-stream",
    TTL: "86400",
  };
}

interface WorkoutDay {
  name: string;
  exercises: Array<{ name: string; sets: number; reps: string }>;
}

// Get day name in Swedish
function getSwedishDayName(dayIndex: number): string {
  const days = ["Söndag", "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag"];
  return days[dayIndex];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayOfWeek = now.getDay(); // 0 = Sunday
    const today = now.toISOString().split("T")[0];

    console.log(`[WORKOUT-REMINDERS] Running at ${currentHour}:${currentMinute} on day ${currentDayOfWeek}`);

    let totalSent = 0;

    // 1. Process morning reminders (around 08:00)
    if (currentHour === 8 && currentMinute < 15) {
      console.log("[WORKOUT-REMINDERS] Processing morning reminders...");

      // Get users with morning reminders enabled for today
      const { data: morningReminders, error: morningError } = await supabase
        .from("workout_reminders")
        .select("user_id")
        .eq("reminder_type", "morning")
        .eq("is_enabled", true)
        .contains("days_of_week", [currentDayOfWeek]);

      if (morningError) {
        console.error("[WORKOUT-REMINDERS] Error fetching morning reminders:", morningError);
      } else if (morningReminders?.length) {
        console.log(`[WORKOUT-REMINDERS] Found ${morningReminders.length} users for morning reminders`);

        for (const reminder of morningReminders) {
          // Check if already sent today
          const { data: existingLog } = await supabase
            .from("reminder_logs")
            .select("id")
            .eq("user_id", reminder.user_id)
            .eq("reminder_type", "morning")
            .eq("reminder_date", today)
            .maybeSingle();

          if (existingLog) {
            console.log(`[WORKOUT-REMINDERS] Morning reminder already sent to ${reminder.user_id}`);
            continue;
          }

          // Get user's workout program for today
          const { data: programs } = await supabase
            .from("workout_programs")
            .select("name, program_data")
            .eq("user_id", reminder.user_id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(1);

          let workoutInfo = "";
          if (programs?.length) {
            const program = programs[0];
            const days = program.program_data?.days as WorkoutDay[] || [];
            const todayDayName = getSwedishDayName(currentDayOfWeek);
            
            // Try to find matching day
            const todayWorkout = days.find((d) => 
              d.name.toLowerCase().includes(todayDayName.toLowerCase()) ||
              d.name.toLowerCase().includes(`dag ${days.indexOf(d) + 1}`)
            );

            if (todayWorkout) {
              workoutInfo = ` Idag: ${todayWorkout.name}`;
            }
          }

          // Get push subscriptions
          const { data: subscriptions } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", reminder.user_id);

          if (subscriptions?.length) {
            const payload = JSON.stringify({
              title: "🏋️ Dags att träna!",
              message: `God morgon! Glöm inte dagens träning.${workoutInfo}`,
              url: "/training",
            });

            for (const sub of subscriptions) {
              try {
                const headers = await generateVapidHeaders(sub.endpoint, vapidPublicKey, vapidPrivateKey);
                const response = await fetch(sub.endpoint, {
                  method: "POST",
                  headers,
                  body: payload,
                });

                if (response.status === 201 || response.status === 200) {
                  totalSent++;
                  console.log(`[WORKOUT-REMINDERS] Morning push sent to ${reminder.user_id}`);
                } else if (response.status === 410 || response.status === 404) {
                  await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                }
              } catch (e) {
                console.error(`[WORKOUT-REMINDERS] Push error:`, e);
              }
            }

            // Log that we sent the reminder
            await supabase.from("reminder_logs").insert({
              user_id: reminder.user_id,
              reminder_type: "morning",
              reminder_date: today,
            });
          }
        }
      }
    }

    // 2. Process "before workout" reminders
    // Check users who have workout sessions scheduled soon
    const { data: beforeReminders, error: beforeError } = await supabase
      .from("workout_reminders")
      .select("user_id, minutes_before, reminder_time")
      .eq("reminder_type", "before_workout")
      .eq("is_enabled", true)
      .contains("days_of_week", [currentDayOfWeek]);

    if (beforeError) {
      console.error("[WORKOUT-REMINDERS] Error fetching before_workout reminders:", beforeError);
    } else if (beforeReminders?.length) {
      console.log(`[WORKOUT-REMINDERS] Checking ${beforeReminders.length} before_workout reminders`);

      for (const reminder of beforeReminders) {
        // Parse reminder time
        const [reminderHour, reminderMinute] = reminder.reminder_time.split(":").map(Number);
        const minutesBefore = reminder.minutes_before || 60;

        // Calculate when to send the reminder
        const reminderSendHour = reminderHour - Math.floor(minutesBefore / 60);
        const reminderSendMinute = reminderMinute - (minutesBefore % 60);

        // Check if it's time to send (within 15 min window)
        const isTimeToSend =
          currentHour === reminderSendHour &&
          currentMinute >= reminderSendMinute &&
          currentMinute < reminderSendMinute + 15;

        if (!isTimeToSend) continue;

        // Check if already sent today
        const { data: existingLog } = await supabase
          .from("reminder_logs")
          .select("id")
          .eq("user_id", reminder.user_id)
          .eq("reminder_type", "before_workout")
          .eq("reminder_date", today)
          .maybeSingle();

        if (existingLog) continue;

        // Get push subscriptions
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", reminder.user_id);

        if (subscriptions?.length) {
          const payload = JSON.stringify({
            title: "⏰ Träning snart!",
            message: `Du har träning planerad om ${minutesBefore} minuter.`,
            url: "/training",
          });

          for (const sub of subscriptions) {
            try {
              const headers = await generateVapidHeaders(sub.endpoint, vapidPublicKey, vapidPrivateKey);
              const response = await fetch(sub.endpoint, {
                method: "POST",
                headers,
                body: payload,
              });

              if (response.status === 201 || response.status === 200) {
                totalSent++;
                console.log(`[WORKOUT-REMINDERS] Before workout push sent to ${reminder.user_id}`);
              } else if (response.status === 410 || response.status === 404) {
                await supabase.from("push_subscriptions").delete().eq("id", sub.id);
              }
            } catch (e) {
              console.error(`[WORKOUT-REMINDERS] Push error:`, e);
            }
          }

          await supabase.from("reminder_logs").insert({
            user_id: reminder.user_id,
            reminder_type: "before_workout",
            reminder_date: today,
          });
        }
      }
    }

    // 3. Process scheduled workout reminders
    console.log("[WORKOUT-REMINDERS] Processing scheduled workout reminders...");
    
    // Get all scheduled workouts for today with reminders enabled
    const { data: scheduledWorkouts, error: scheduledError } = await supabase
      .from("scheduled_workouts")
      .select("id, user_id, title, scheduled_date, reminder_minutes_before, workout_type")
      .eq("scheduled_date", today)
      .eq("reminder_enabled", true)
      .is("completed_at", null);

    if (scheduledError) {
      console.error("[WORKOUT-REMINDERS] Error fetching scheduled workouts:", scheduledError);
    } else if (scheduledWorkouts?.length) {
      console.log(`[WORKOUT-REMINDERS] Found ${scheduledWorkouts.length} scheduled workouts for today`);

      for (const workout of scheduledWorkouts) {
        const minutesBefore = workout.reminder_minutes_before || 60;
        
        // For scheduled workouts, we send reminder at a reasonable time before
        // Since we don't have exact time, we'll send based on minutes_before from a default time (e.g., 18:00)
        const defaultWorkoutHour = 18; // Assume workouts are at 18:00 by default
        const defaultWorkoutMinute = 0;
        
        // Calculate reminder send time
        let reminderSendHour = defaultWorkoutHour;
        let reminderSendMinute = defaultWorkoutMinute - minutesBefore;
        
        // Handle negative minutes
        while (reminderSendMinute < 0) {
          reminderSendMinute += 60;
          reminderSendHour -= 1;
        }

        // Check if it's time to send (within 15 min window)
        const isTimeToSend =
          currentHour === reminderSendHour &&
          currentMinute >= reminderSendMinute &&
          currentMinute < reminderSendMinute + 15;

        if (!isTimeToSend) {
          continue;
        }

        // Check if already sent for this specific workout
        const logKey = `scheduled_${workout.id}`;
        const { data: existingLog } = await supabase
          .from("reminder_logs")
          .select("id")
          .eq("user_id", workout.user_id)
          .eq("reminder_type", logKey)
          .eq("reminder_date", today)
          .maybeSingle();

        if (existingLog) {
          console.log(`[WORKOUT-REMINDERS] Reminder already sent for scheduled workout ${workout.id}`);
          continue;
        }

        // Get push subscriptions
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", workout.user_id);

        if (subscriptions?.length) {
          const workoutTypeEmoji = workout.workout_type === "cardio" ? "🏃" : "🏋️";
          const payload = JSON.stringify({
            title: `${workoutTypeEmoji} Schemalagt pass!`,
            message: `Glöm inte: ${workout.title}`,
            url: "/dashboard",
          });

          for (const sub of subscriptions) {
            try {
              const headers = await generateVapidHeaders(sub.endpoint, vapidPublicKey, vapidPrivateKey);
              const response = await fetch(sub.endpoint, {
                method: "POST",
                headers,
                body: payload,
              });

              if (response.status === 201 || response.status === 200) {
                totalSent++;
                console.log(`[WORKOUT-REMINDERS] Scheduled workout push sent for ${workout.id} to ${workout.user_id}`);
              } else if (response.status === 410 || response.status === 404) {
                await supabase.from("push_subscriptions").delete().eq("id", sub.id);
              }
            } catch (e) {
              console.error(`[WORKOUT-REMINDERS] Push error:`, e);
            }
          }

          await supabase.from("reminder_logs").insert({
            user_id: workout.user_id,
            reminder_type: logKey,
            reminder_date: today,
          });
        }
      }
    }

    // Cleanup old reminder logs (older than 7 days)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    await supabase.from("reminder_logs").delete().lt("reminder_date", weekAgo);

    console.log(`[WORKOUT-REMINDERS] Completed. Total sent: ${totalSent}`);

    return new Response(JSON.stringify({ success: true, sent: totalSent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[WORKOUT-REMINDERS] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
