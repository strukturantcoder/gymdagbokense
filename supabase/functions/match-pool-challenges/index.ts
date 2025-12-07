import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[MATCH-POOL] Function started');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: Get the triggering entry ID from request body
    let triggerEntryId: string | null = null;
    try {
      const body = await req.json();
      triggerEntryId = body?.entryId || null;
      console.log('[MATCH-POOL] Triggered for entry:', triggerEntryId);
    } catch {
      console.log('[MATCH-POOL] No entry ID provided, running full match');
    }

    const currentYear = new Date().getFullYear();

    // Get all waiting entries that haven't expired
    const { data: waitingEntries, error: entriesError } = await supabase
      .from('challenge_pool_entries')
      .select(`
        *,
        profile:profiles(user_id, display_name, avatar_url, birth_year, gender)
      `)
      .eq('status', 'waiting')
      .gte('latest_start_date', new Date().toISOString());

    if (entriesError) {
      console.error('[MATCH-POOL] Error fetching entries:', entriesError);
      throw entriesError;
    }

    console.log(`[MATCH-POOL] Found ${waitingEntries?.length || 0} waiting entries`);

    if (!waitingEntries || waitingEntries.length < 2) {
      console.log('[MATCH-POOL] Not enough entries to match');
      return new Response(JSON.stringify({
        matched: 0,
        message: 'Not enough entries to match'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const matchedEntryIds: string[] = [];
    const createdChallenges: any[] = [];

    // If a specific entry triggered this, prioritize matching it
    const sortedEntries = triggerEntryId 
      ? [...waitingEntries].sort((a, b) => {
          if (a.id === triggerEntryId) return -1;
          if (b.id === triggerEntryId) return 1;
          return 0;
        })
      : waitingEntries;

    // Try to match entries
    for (const entry of sortedEntries) {
      if (matchedEntryIds.includes(entry.id)) continue;

      // Get profile data - handle both array and object formats from Supabase
      const profileData = Array.isArray(entry.profile) ? entry.profile[0] : entry.profile;
      const entryAge = profileData?.birth_year ? currentYear - profileData.birth_year : null;
      const entryGender = profileData?.gender;

      console.log(`[MATCH-POOL] Checking entry ${entry.id}: category=${entry.challenge_category}, type=${entry.challenge_type}`);

      // Find compatible entries
      const compatibleEntries = sortedEntries.filter(other => {
        if (other.id === entry.id) return false;
        if (matchedEntryIds.includes(other.id)) return false;
        if (other.user_id === entry.user_id) return false;
        
        // Must match challenge category and type
        if (other.challenge_category !== entry.challenge_category) return false;
        if (other.challenge_type !== entry.challenge_type) return false;
        
        const otherProfileData = Array.isArray(other.profile) ? other.profile[0] : other.profile;
        const otherAge = otherProfileData?.birth_year ? currentYear - otherProfileData.birth_year : null;
        const otherGender = otherProfileData?.gender;

        // Check gender preferences (null means any)
        if (entry.preferred_gender && otherGender && entry.preferred_gender !== otherGender) return false;
        if (other.preferred_gender && entryGender && other.preferred_gender !== entryGender) return false;

        // Check age preferences
        if (entry.min_age && otherAge && otherAge < entry.min_age) return false;
        if (entry.max_age && otherAge && otherAge > entry.max_age) return false;
        if (other.min_age && entryAge && entryAge < other.min_age) return false;
        if (other.max_age && entryAge && entryAge > other.max_age) return false;

        return true;
      });

      console.log(`[MATCH-POOL] Found ${compatibleEntries.length} compatible entries for ${entry.id}`);

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

      console.log(`[MATCH-POOL] Creating challenge with ${participants.length} participants, duration=${durationDays}, target=${targetValue}`);

      // Create the pool challenge
      const { data: challenge, error: challengeError } = await supabase
        .from('pool_challenges')
        .insert({
          challenge_category: entry.challenge_category,
          challenge_type: entry.challenge_type,
          target_value: targetValue,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
          xp_reward: Math.min(100 + (durationDays * 5), 1000) // Cap XP at 1000
        })
        .select()
        .single();

      if (challengeError) {
        console.error('[MATCH-POOL] Error creating challenge:', challengeError);
        continue;
      }

      console.log(`[MATCH-POOL] Created challenge ${challenge.id}`);

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
        console.error('[MATCH-POOL] Error adding participants:', participantsError);
        // Rollback challenge creation
        await supabase.from('pool_challenges').delete().eq('id', challenge.id);
        continue;
      }

      // Update entry statuses
      const entryIds = participants.map(p => p.id);
      const { error: updateError } = await supabase
        .from('challenge_pool_entries')
        .update({ status: 'matched', updated_at: new Date().toISOString() })
        .in('id', entryIds);

      if (updateError) {
        console.error('[MATCH-POOL] Error updating entries:', updateError);
      }

      matchedEntryIds.push(...entryIds);
      createdChallenges.push(challenge);

      // Create notifications for all participants
      for (const participant of participants) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: participant.user_id,
            type: 'pool_challenge_matched',
            title: 'Utmaning matchad! 🎯',
            message: `Du har matchats i en ${entry.challenge_category === 'strength' ? 'styrke' : 'konditions'}utmaning mot ${participants.length - 1} ${participants.length === 2 ? 'motståndare' : 'motståndare'}!`,
            related_id: challenge.id
          });

        if (notifError) {
          console.error('[MATCH-POOL] Error creating notification:', notifError);
        }
      }

      console.log(`[MATCH-POOL] Successfully matched ${participants.length} participants in challenge ${challenge.id}`);
    }

    // Expire old entries
    const { error: expireError } = await supabase
      .from('challenge_pool_entries')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('status', 'waiting')
      .lt('latest_start_date', new Date().toISOString());

    if (expireError) {
      console.error('[MATCH-POOL] Error expiring entries:', expireError);
    }

    console.log(`[MATCH-POOL] Completed. Created ${createdChallenges.length} challenges`);

    return new Response(JSON.stringify({
      matched: createdChallenges.length,
      challenges: createdChallenges.map(c => ({ id: c.id }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[MATCH-POOL] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
