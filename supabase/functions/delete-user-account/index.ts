import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Not authenticated");

    const userId = userData.user.id;
    console.log(`[DELETE-ACCOUNT] Deleting account for user: ${userId}`);

    // Delete user data from all tables (order matters for foreign keys)
    const tables = [
      'exercise_logs',
      'cardio_plan_sessions',
      'cardio_routes',
      'challenge_progress',
      'community_challenge_participants',
      'pool_challenge_participants',
      'pool_challenge_messages',
      'team_invitations',
      'team_members',
      'user_achievements',
      'user_follows',
      'notification_preferences',
      'notifications',
      'push_subscriptions',
      'personal_bests',
      'exercise_goals',
      'cardio_goals',
      'progress_photos',
      'scheduled_workouts',
      'workout_logs',
      'cardio_logs',
      'cardio_plans',
      'saved_wods',
      'weight_logs',
      'friendships',
      'referrals',
      'invite_codes',
      'garmin_connections',
      'garmin_oauth_temp',
      'garmin_activities',
      'user_stats',
      'user_roles',
      'profiles',
    ];

    for (const table of tables) {
      try {
        const col = table === 'friendships' ? 'user_id' : 
                    table === 'exercise_logs' ? null :
                    table === 'team_invitations' ? 'invited_user_id' :
                    'user_id';
        
        if (table === 'exercise_logs') {
          // Delete via workout_logs
          const { data: wlogs } = await supabaseAdmin
            .from('workout_logs')
            .select('id')
            .eq('user_id', userId);
          if (wlogs && wlogs.length > 0) {
            await supabaseAdmin
              .from('exercise_logs')
              .delete()
              .in('workout_log_id', wlogs.map(w => w.id));
          }
        } else if (table === 'friendships') {
          await supabaseAdmin.from(table).delete().or(`user_id.eq.${userId},friend_id.eq.${userId}`);
        } else if (col) {
          await supabaseAdmin.from(table).delete().eq(col, userId);
        }
      } catch (e) {
        console.log(`[DELETE-ACCOUNT] Skipping ${table}: ${e}`);
      }
    }

    // Delete storage files
    try {
      const { data: files } = await supabaseAdmin.storage
        .from('progress-photos')
        .list(userId);
      if (files && files.length > 0) {
        await supabaseAdmin.storage
          .from('progress-photos')
          .remove(files.map(f => `${userId}/${f.name}`));
      }
    } catch (e) {
      console.log(`[DELETE-ACCOUNT] Storage cleanup error: ${e}`);
    }

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    console.log(`[DELETE-ACCOUNT] Successfully deleted user: ${userId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[DELETE-ACCOUNT] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
