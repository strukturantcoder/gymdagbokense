import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkoutDay {
  name: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    rest?: string;
  }>;
}

interface CardioSession {
  day: string;
  type: string;
  duration?: string;
  distance?: string;
  intensity?: string;
  description?: string;
}

interface CardioWeek {
  week: number;
  sessions: CardioSession[];
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

// Get next occurrence of a weekday
function getNextWeekday(dayName: string, startFrom: Date = new Date()): Date {
  const days: Record<string, number> = {
    "Måndag": 1, "Tisdag": 2, "Onsdag": 3, "Torsdag": 4,
    "Fredag": 5, "Lördag": 6, "Söndag": 0,
    "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4,
    "Friday": 5, "Saturday": 6, "Sunday": 0,
    "Day 1": 1, "Day 2": 2, "Day 3": 3, "Day 4": 4, "Day 5": 5, "Day 6": 6, "Day 7": 0,
    "Dag 1": 1, "Dag 2": 2, "Dag 3": 3, "Dag 4": 4, "Dag 5": 5, "Dag 6": 6, "Dag 7": 0,
  };
  
  const targetDay = days[dayName] ?? 1;
  const result = new Date(startFrom);
  const currentDay = result.getDay();
  const diff = (targetDay - currentDay + 7) % 7 || 7;
  result.setDate(result.getDate() + diff);
  return result;
}

// Escape special characters for ICS
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// Generate ICS content for workout programs
function generateWorkoutICS(programs: Array<{ name: string; program_data: { days: WorkoutDay[] } }>): string {
  let events = "";
  const startDate = new Date();
  
  for (const program of programs) {
    const days = program.program_data?.days || [];
    
    for (const day of days) {
      const exerciseList = day.exercises?.map(e => `• ${e.name}: ${e.sets} set x ${e.reps}`).join("\\n") || "";
      const eventDate = getNextWeekday(day.name, startDate);
      
      events += `BEGIN:VEVENT
UID:${generateUID()}
DTSTART;VALUE=DATE:${formatICSDate(eventDate)}
DTEND;VALUE=DATE:${formatICSDate(eventDate)}
SUMMARY:${escapeICS(`🏋️ ${program.name} - ${day.name}`)}
DESCRIPTION:${escapeICS(`Träningspass: ${day.name}\\n\\nÖvningar:\\n${exerciseList}`)}
RRULE:FREQ=WEEKLY;COUNT=12
END:VEVENT
`;
    }
  }
  
  return events;
}

// Generate ICS content for cardio plans
function generateCardioICS(plans: Array<{ name: string; plan_data: { weeks: CardioWeek[] }; created_at: string }>): string {
  let events = "";
  
  for (const plan of plans) {
    const weeks = plan.plan_data?.weeks || [];
    const planStartDate = new Date(plan.created_at);
    
    for (const week of weeks) {
      for (const session of week.sessions || []) {
        const eventDate = getNextWeekday(session.day, planStartDate);
        eventDate.setDate(eventDate.getDate() + (week.week - 1) * 7);
        
        const description = [
          session.type && `Typ: ${session.type}`,
          session.duration && `Längd: ${session.duration}`,
          session.distance && `Distans: ${session.distance}`,
          session.intensity && `Intensitet: ${session.intensity}`,
          session.description,
        ].filter(Boolean).join("\\n");
        
        events += `BEGIN:VEVENT
UID:${generateUID()}
DTSTART;VALUE=DATE:${formatICSDate(eventDate)}
DTEND;VALUE=DATE:${formatICSDate(eventDate)}
SUMMARY:${escapeICS(`🏃 ${plan.name} - ${session.type || session.day}`)}
DESCRIPTION:${escapeICS(description)}
END:VEVENT
`;
      }
    }
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
    const format = url.searchParams.get("format") || "download"; // "download" or "subscribe"
    
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

    // Fetch workout programs
    if (includeStrength) {
      const { data: programs, error: programError } = await supabase
        .from("workout_programs")
        .select("name, program_data")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);

      if (programError) {
        console.error("[CALENDAR-EXPORT] Error fetching programs:", programError);
      } else if (programs?.length) {
        console.log(`[CALENDAR-EXPORT] Found ${programs.length} workout programs`);
        events += generateWorkoutICS(programs);
      }
    }

    // Fetch cardio plans
    if (includeCardio) {
      const { data: cardioPlans, error: cardioError } = await supabase
        .from("cardio_plans")
        .select("name, plan_data, created_at")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (cardioError) {
        console.error("[CALENDAR-EXPORT] Error fetching cardio plans:", cardioError);
      } else if (cardioPlans?.length) {
        console.log(`[CALENDAR-EXPORT] Found ${cardioPlans.length} cardio plans`);
        events += generateCardioICS(cardioPlans);
      }
    }

    if (!events) {
      return new Response(JSON.stringify({ error: "No programs or plans found" }), {
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
