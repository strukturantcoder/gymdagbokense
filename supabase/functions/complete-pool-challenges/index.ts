import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('Starting pool challenge completion check...');

    // Find all active challenges that have ended
    const { data: expiredChallenges, error: fetchError } = await supabase
      .from('pool_challenges')
      .select('*')
      .eq('status', 'active')
      .lt('end_date', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired challenges:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredChallenges?.length || 0} expired challenges to complete`);

    let completedCount = 0;

    for (const challenge of expiredChallenges || []) {
      console.log(`Processing challenge ${challenge.id}...`);

      // Get participants for this challenge
      const { data: participants, error: partError } = await supabase
        .from('pool_challenge_participants')
        .select('*')
        .eq('challenge_id', challenge.id)
        .order('current_value', { ascending: false });

      if (partError) {
        console.error(`Error fetching participants for challenge ${challenge.id}:`, partError);
        continue;
      }

      const winner = participants && participants.length > 0 ? participants[0] : null;

      if (winner && winner.current_value > 0) {
        console.log(`Winner for challenge ${challenge.id}: user ${winner.user_id} with value ${winner.current_value}`);

        // Update challenge with winner
        const { error: updateError } = await supabase
          .from('pool_challenges')
          .update({ 
            status: 'completed', 
            winner_id: winner.user_id 
          })
          .eq('id', challenge.id);

        if (updateError) {
          console.error(`Error updating challenge ${challenge.id}:`, updateError);
          continue;
        }

        // Award XP to winner - fetch current stats first
        const { data: stats } = await supabase
          .from('user_stats')
          .select('total_xp')
          .eq('user_id', winner.user_id)
          .single();

        if (stats) {
          await supabase
            .from('user_stats')
            .update({ 
              total_xp: stats.total_xp + challenge.xp_reward,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', winner.user_id);
        }

        // Create notification for winner
        await supabase
          .from('notifications')
          .insert({
            user_id: winner.user_id,
            type: 'pool_challenge_won',
            title: 'Du vann! 🏆',
            message: `Grattis! Du vann utmaningen och fick +${challenge.xp_reward} XP!`,
            related_id: challenge.id
          });

        // Notify other participants
        for (const participant of participants || []) {
          if (participant.user_id !== winner.user_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: participant.user_id,
                type: 'pool_challenge_ended',
                title: 'Utmaningen avslutad',
                message: 'Utmaningen har avslutats. Bättre lycka nästa gång!',
                related_id: challenge.id
              });
          }
        }

        completedCount++;
      } else {
        // No winner (no activity) - just mark as completed
        console.log(`No winner for challenge ${challenge.id} - no activity`);
        
        await supabase
          .from('pool_challenges')
          .update({ status: 'completed' })
          .eq('id', challenge.id);

        // Notify all participants
        for (const participant of participants || []) {
          await supabase
            .from('notifications')
            .insert({
              user_id: participant.user_id,
              type: 'pool_challenge_ended',
              title: 'Utmaningen avslutad',
              message: 'Utmaningen avslutades utan vinnare - ingen aktivitet registrerades.',
              related_id: challenge.id
            });
        }

        completedCount++;
      }
    }

    console.log(`Completed ${completedCount} challenges`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        completed: completedCount,
        message: `${completedCount} challenges completed` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error completing challenges:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
