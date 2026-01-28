import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REFERRAL_XP_REWARD = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find unrewarded referrals
    const { data: unrewardedReferrals, error: fetchError } = await supabase
      .from("referrals")
      .select("id, inviter_id, invited_id")
      .eq("xp_rewarded", false);

    if (fetchError) throw fetchError;

    if (!unrewardedReferrals || unrewardedReferrals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No unrewarded referrals found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processedCount = 0;

    for (const referral of unrewardedReferrals) {
      // Check if the invited user has completed at least one workout
      const { count: workoutCount } = await supabase
        .from("workout_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", referral.invited_id);

      // Only reward if invited user has actually started using the app
      if (workoutCount && workoutCount > 0) {
        // Add XP to inviter
        const { data: stats } = await supabase
          .from("user_stats")
          .select("total_xp")
          .eq("user_id", referral.inviter_id)
          .single();

        const currentXP = stats?.total_xp || 0;

        await supabase
          .from("user_stats")
          .upsert({
            user_id: referral.inviter_id,
            total_xp: currentXP + REFERRAL_XP_REWARD
          }, { onConflict: "user_id" });

        // Mark referral as rewarded
        await supabase
          .from("referrals")
          .update({ xp_rewarded: true })
          .eq("id", referral.id);

        // Create notification for inviter
        await supabase.from("notifications").insert({
          user_id: referral.inviter_id,
          type: "referral_reward",
          title: "Referral-bonus! 🎉",
          message: `Du fick ${REFERRAL_XP_REWARD} XP för att din vän började träna!`,
          related_id: referral.id
        });

        processedCount++;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Referral rewards processed", 
        processed: processedCount 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing referral rewards:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
