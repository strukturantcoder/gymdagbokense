import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Validate internal cron secret to prevent public access
    // This function should only be called by scheduled cron jobs or internal systems
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!cronSecret || cronSecret !== expectedSecret) {
      console.error('Unauthorized access attempt to match-pool-challenges');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const currentYear = new Date().getFullYear();

    // Get all waiting entries that haven't expired
    const { data: waitingEntries, error: entriesError } = await supabase
      .from('challenge_pool_entries')
      .select(`
        *,
        profile:profiles!challenge_pool_entries_user_id_fkey(user_id, display_name, avatar_url, birth_year, gender)
      `)
      .eq('status', 'waiting')
      .gte('latest_start_date', new Date().toISOString());

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      throw entriesError;
    }

    console.log(`Found ${waitingEntries?.length || 0} waiting entries`);

    const matchedEntryIds: string[] = [];
    const createdChallenges: any[] = [];

    // Try to match entries
    for (const entry of waitingEntries || []) {
      if (matchedEntryIds.includes(entry.id)) continue;

      const entryAge = entry.profile?.birth_year ? currentYear - entry.profile.birth_year : null;
      const entryGender = entry.profile?.gender;

      // Find compatible entries
      const compatibleEntries = (waitingEntries || []).filter(other => {
        if (other.id === entry.id) return false;
        if (matchedEntryIds.includes(other.id)) return false;
        if (other.user_id === entry.user_id) return false;
        
        // Must match challenge category and type
        if (other.challenge_category !== entry.challenge_category) return false;
        if (other.challenge_type !== entry.challenge_type) return false;
        
        const otherAge = other.profile?.birth_year ? currentYear - other.profile.birth_year : null;
        const otherGender = other.profile?.gender;

        // Check gender preferences
        if (entry.preferred_gender && otherGender && entry.preferred_gender !== otherGender) return false;
        if (other.preferred_gender && entryGender && other.preferred_gender !== entryGender) return false;

        // Check age preferences
        if (entry.min_age && otherAge && otherAge < entry.min_age) return false;
        if (entry.max_age && otherAge && otherAge > entry.max_age) return false;
        if (other.min_age && entryAge && entryAge < other.min_age) return false;
        if (other.max_age && entryAge && entryAge > other.max_age) return false;

        return true;
      });

      if (compatibleEntries.length === 0) continue;

      // Determine participants
      const participants = [entry];
      
      if (entry.allow_multiple && entry.max_participants && entry.max_participants > 2) {
        // Multi-participant challenge - gather as many as possible
        const maxToAdd = entry.max_participants - 1;
        for (let i = 0; i < Math.min(compatibleEntries.length, maxToAdd); i++) {
          participants.push(compatibleEntries[i]);
        }
      } else {
        // 1v1 challenge
        participants.push(compatibleEntries[0]);
      }

      // Use the minimum duration and target from all participants
      const durationDays = Math.min(...participants.map(p => p.duration_days));
      const targetValue = Math.max(...participants.map(p => p.target_value));

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      // Create the pool challenge
      const { data: challenge, error: challengeError } = await supabase
        .from('pool_challenges')
        .insert({
          challenge_category: entry.challenge_category,
          challenge_type: entry.challenge_type,
          target_value: targetValue,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          xp_reward: 100 + (durationDays * 5)
        })
        .select()
        .single();

      if (challengeError) {
        console.error('Error creating challenge:', challengeError);
        continue;
      }

      // Add all participants
      const participantInserts = participants.map(p => ({
        challenge_id: challenge.id,
        user_id: p.user_id,
        pool_entry_id: p.id
      }));

      const { error: participantsError } = await supabase
        .from('pool_challenge_participants')
        .insert(participantInserts);

      if (participantsError) {
        console.error('Error adding participants:', participantsError);
        // Rollback challenge creation
        await supabase.from('pool_challenges').delete().eq('id', challenge.id);
        continue;
      }

      // Update entry statuses
      const entryIds = participants.map(p => p.id);
      await supabase
        .from('challenge_pool_entries')
        .update({ status: 'matched', updated_at: new Date().toISOString() })
        .in('id', entryIds);

      matchedEntryIds.push(...entryIds);
      createdChallenges.push(challenge);

      // Create notifications for all participants
      for (const participant of participants) {
        await supabase
          .from('notifications')
          .insert({
            user_id: participant.user_id,
            type: 'pool_challenge_matched',
            title: 'Utmaning matchad!',
            message: `Du har matchats i en ${entry.challenge_category === 'strength' ? 'styrke' : 'konditions'}utmaning!`,
            related_id: challenge.id
          });
      }

      console.log(`Created challenge ${challenge.id} with ${participants.length} participants`);
    }

    // Expire old entries
    await supabase
      .from('challenge_pool_entries')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('status', 'waiting')
      .lt('latest_start_date', new Date().toISOString());

    return new Response(JSON.stringify({
      matched: createdChallenges.length,
      challenges: createdChallenges
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Match error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
