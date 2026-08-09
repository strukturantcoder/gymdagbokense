import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const now = new Date();

    // Is there already an ongoing challenge?
    const { data: existing, error: existingError } = await supabase
      .from("community_challenges")
      .select("id")
      .eq("is_active", true)
      .gt("end_date", now.toISOString())
      .limit(1);

    if (existingError) throw existingError;

    if ((existing?.length ?? 0) > 0) {
      return new Response(JSON.stringify({ created: false, reason: "active_challenge_exists" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a challenge for the remainder of the current month
    const monthNames = [
      "januari", "februari", "mars", "april", "maj", "juni",
      "juli", "augusti", "september", "oktober", "november", "december",
    ];
    const monthName = monthNames[now.getUTCMonth()];
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    const { data: challenge, error: insertError } = await supabase
      .from("community_challenges")
      .insert({
        title: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}utmaningen`,
        description: `Logga så många träningspass du kan under ${monthName}. Alla är med automatiskt!`,
        goal_description: `Logga 8 träningspass i ${monthName}`,
        goal_unit: "pass",
        target_value: 8,
        winner_type: "first_to_goal",
        theme: "Månadens utmaning",
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Enroll every existing user
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id");

    if (profilesError) throw profilesError;

    const participants = (profiles || []).map((p) => ({
      challenge_id: challenge.id,
      user_id: p.user_id,
      current_value: 0,
    }));

    for (let i = 0; i < participants.length; i += 500) {
      const { error: participantError } = await supabase
        .from("community_challenge_participants")
        .insert(participants.slice(i, i + 500));
      if (participantError) console.error("Error enrolling batch:", participantError);
    }

    console.log(`Created challenge ${challenge.id} with ${participants.length} participants`);

    return new Response(
      JSON.stringify({ created: true, challenge_id: challenge.id, participants: participants.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in ensure-community-challenge:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
