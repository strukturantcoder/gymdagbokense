import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledWorkout {
  id: string;
  scheduled_date: string;
  title: string;
  workout_type: string;
  description: string | null;
  duration_minutes: number | null;
  reminder_enabled: boolean;
  reminder_minutes_before: number | null;
  workout_day_name: string | null;
}

// Generate unique ID for ICS events
function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}@gymdagboken.se`;
}

// Format date for ICS (YYYYMMDD)
function formatICSDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

// Format datetime for ICS (YYYYMMDDTHHMMSS)
function formatICSDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

// Escape special characters for ICS
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Generate ICS content for scheduled workouts
function generateScheduledWorkoutICS(workouts: ScheduledWorkout[]): string {
  let events = "";

  for (const workout of workouts) {
    const eventDate = new Date(workout.scheduled_date);
    const icon = workout.workout_type === "cardio" ? "🏃" : "🏋️";
    
    let description = workout.workout_day_name || "";
    if (workout.description) {
      description += description ? `\\n\\n${workout.description}` : workout.description;
    }
    if (workout.duration_minutes) {
      description += `\\n\\nPlanerad längd: ${workout.duration_minutes} minuter`;
    }

    events += `BEGIN:VEVENT
UID:${workout.id}@gymdagboken.se
DTSTART;VALUE=DATE:${formatICSDate(eventDate)}
DTEND;VALUE=DATE:${formatICSDate(eventDate)}
SUMMARY:${escapeICS(`${icon} ${workout.title}`)}
DESCRIPTION:${escapeICS(description || "Schemalagt träningspass")}`;

    // Add alarm/reminder if enabled
    if (workout.reminder_enabled && workout.reminder_minutes_before) {
      events += `
BEGIN:VALARM
TRIGGER:-PT${workout.reminder_minutes_before}M
ACTION:DISPLAY
DESCRIPTION:Påminnelse: ${escapeICS(workout.title)}
END:VALARM`;
    }

    events += `
END:VEVENT
`;
  }

  return events;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const includeStrength = url.searchParams.get("strength") !== "false";
    const includeCardio = url.searchParams.get("cardio") !== "false";
    const format = url.searchParams.get("format") || "download";

    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[CALENDAR-EXPORT] Generating calendar for user ${userId}, strength=${includeStrength}, cardio=${includeCardio}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let events = "";
    const calendarName = "Gymdagboken Träningsschema";

    // Fetch scheduled workouts - this is the main source now
    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const sixMonthsAhead = new Date(today);
    sixMonthsAhead.setMonth(sixMonthsAhead.getMonth() + 6);

    let query = supabase
      .from("scheduled_workouts")
      .select("*")
      .eq("user_id", userId)
      .gte("scheduled_date", threeMonthsAgo.toISOString().split("T")[0])
      .lte("scheduled_date", sixMonthsAhead.toISOString().split("T")[0])
      .is("completed_at", null) // Only include non-completed workouts
      .order("scheduled_date", { ascending: true });

    // Filter by workout type if needed
    if (includeStrength && !includeCardio) {
      query = query.neq("workout_type", "cardio");
    } else if (!includeStrength && includeCardio) {
      query = query.eq("workout_type", "cardio");
    }

    const { data: scheduledWorkouts, error: scheduledError } = await query;

    if (scheduledError) {
      console.error("[CALENDAR-EXPORT] Error fetching scheduled workouts:", scheduledError);
    } else if (scheduledWorkouts?.length) {
      console.log(`[CALENDAR-EXPORT] Found ${scheduledWorkouts.length} scheduled workouts`);
      events += generateScheduledWorkoutICS(scheduledWorkouts as ScheduledWorkout[]);
    }

    if (!events) {
      return new Response(JSON.stringify({ error: "No scheduled workouts found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build ICS file
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Gymdagboken//Träningsschema//SV
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${escapeICS(calendarName)}
X-WR-TIMEZONE:Europe/Stockholm
${events}END:VCALENDAR`;

    console.log(`[CALENDAR-EXPORT] Generated ICS with ${events.split("BEGIN:VEVENT").length - 1} events`);

    const headers: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
    };

    if (format === "download") {
      headers["Content-Disposition"] = 'attachment; filename="gymdagboken-schema.ics"';
    } else {
      // For subscription, add cache control headers to ensure updates are fetched
      headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
      headers["Pragma"] = "no-cache";
      headers["Expires"] = "0";
    }

    return new Response(icsContent, { status: 200, headers });
  } catch (error: unknown) {
    console.error("[CALENDAR-EXPORT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
