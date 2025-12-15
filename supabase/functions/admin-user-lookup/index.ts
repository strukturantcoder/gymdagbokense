import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify requesting user is admin
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, query, userId, limit = 50, offset = 0 } = await req.json();

    // List all users with pagination
    if (action === "listAll") {
      console.log("Fetching all users with limit:", limit, "offset:", offset);
      
      const { data: profiles, count } = await supabaseAdmin
        .from("profiles")
        .select("user_id, display_name, avatar_url, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Get stats for these users
      const userIds = profiles?.map(p => p.user_id) || [];
      const { data: statsData } = await supabaseAdmin
        .from("user_stats")
        .select("user_id, level, total_xp, total_workouts, total_cardio_sessions")
        .in("user_id", userIds);

      const statsMap = new Map(statsData?.map(s => [s.user_id, s]) || []);

      const usersWithStats = profiles?.map(p => ({
        ...p,
        stats: statsMap.get(p.user_id) || null
      })) || [];

      return new Response(JSON.stringify({ 
        users: usersWithStats,
        total: count || 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List workout logs with user info
    if (action === "listWorkouts") {
      console.log("Fetching workout logs with limit:", limit, "offset:", offset);
      
      const { data: workouts, count } = await supabaseAdmin
        .from("workout_logs")
        .select("id, user_id, workout_day, duration_minutes, completed_at, notes", { count: "exact" })
        .order("completed_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Get user profiles for these workouts
      const userIds = [...new Set(workouts?.map(w => w.user_id) || [])];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Get exercise counts for each workout
      const workoutIds = workouts?.map(w => w.id) || [];
      const { data: exerciseLogs } = await supabaseAdmin
        .from("exercise_logs")
        .select("workout_log_id, sets_completed")
        .in("workout_log_id", workoutIds);

      const exerciseCountMap = new Map<string, { exercises: number; sets: number }>();
      exerciseLogs?.forEach(e => {
        const current = exerciseCountMap.get(e.workout_log_id) || { exercises: 0, sets: 0 };
        current.exercises++;
        current.sets += e.sets_completed || 0;
        exerciseCountMap.set(e.workout_log_id, current);
      });

      const workoutsWithUsers = workouts?.map(w => ({
        ...w,
        profile: profileMap.get(w.user_id) || null,
        exerciseCount: exerciseCountMap.get(w.id)?.exercises || 0,
        totalSets: exerciseCountMap.get(w.id)?.sets || 0
      })) || [];

      return new Response(JSON.stringify({ 
        workouts: workoutsWithUsers,
        total: count || 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List cardio logs with user info
    if (action === "listCardio") {
      console.log("Fetching cardio logs with limit:", limit, "offset:", offset);
      
      const { data: cardioLogs, count } = await supabaseAdmin
        .from("cardio_logs")
        .select("id, user_id, activity_type, duration_minutes, distance_km, calories_burned, completed_at, notes", { count: "exact" })
        .order("completed_at", { ascending: false })
        .range(offset, offset + limit - 1);

      // Get user profiles for these logs
      const userIds = [...new Set(cardioLogs?.map(c => c.user_id) || [])];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const cardioWithUsers = cardioLogs?.map(c => ({
        ...c,
        profile: profileMap.get(c.user_id) || null
      })) || [];

      return new Response(JSON.stringify({ 
        cardioLogs: cardioWithUsers,
        total: count || 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List active users (users who logged workout or cardio in last 7 days)
    if (action === "listActiveUsers") {
      console.log("Fetching active users with limit:", limit, "offset:", offset);
      
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Get unique users who logged workouts in last 7 days
      const { data: workoutUsers } = await supabaseAdmin
        .from("workout_logs")
        .select("user_id")
        .gte("completed_at", sevenDaysAgo.toISOString());
      
      // Get unique users who logged cardio in last 7 days
      const { data: cardioUsers } = await supabaseAdmin
        .from("cardio_logs")
        .select("user_id")
        .gte("completed_at", sevenDaysAgo.toISOString());
      
      // Combine and deduplicate
      const allActiveUserIds = [...new Set([
        ...(workoutUsers?.map(w => w.user_id) || []),
        ...(cardioUsers?.map(c => c.user_id) || [])
      ])];
      
      const totalActive = allActiveUserIds.length;
      const paginatedIds = allActiveUserIds.slice(offset, offset + limit);
      
      // Get profiles for paginated users
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, display_name, avatar_url, created_at")
        .in("user_id", paginatedIds);
      
      // Get stats for these users
      const { data: statsData } = await supabaseAdmin
        .from("user_stats")
        .select("user_id, level, total_xp, total_workouts, total_cardio_sessions")
        .in("user_id", paginatedIds);
      
      const statsMap = new Map(statsData?.map(s => [s.user_id, s]) || []);
      
      // Count recent activity for each user
      const usersWithActivity = await Promise.all((profiles || []).map(async (p) => {
        const { count: recentWorkouts } = await supabaseAdmin
          .from("workout_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", p.user_id)
          .gte("completed_at", sevenDaysAgo.toISOString());
        
        const { count: recentCardio } = await supabaseAdmin
          .from("cardio_logs")
          .select("*", { count: "exact", head: true })
          .eq("user_id", p.user_id)
          .gte("completed_at", sevenDaysAgo.toISOString());
        
        return {
          ...p,
          stats: statsMap.get(p.user_id) || null,
          recentWorkouts: recentWorkouts || 0,
          recentCardio: recentCardio || 0
        };
      }));
      
      return new Response(JSON.stringify({ 
        users: usersWithActivity,
        total: totalActive
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List challenge participants (both community and pool)
    if (action === "listChallengeParticipants") {
      console.log("Fetching challenge participants with limit:", limit, "offset:", offset);
      
      // Get community challenge participants
      const { data: communityParticipants } = await supabaseAdmin
        .from("community_challenge_participants")
        .select(`
          id, user_id, current_value, joined_at,
          challenge:community_challenges(id, title, is_active, end_date)
        `)
        .order("joined_at", { ascending: false });
      
      // Get pool challenge participants
      const { data: poolParticipants } = await supabaseAdmin
        .from("pool_challenge_participants")
        .select(`
          id, user_id, current_value, joined_at,
          challenge:pool_challenges(id, challenge_type, challenge_category, status, end_date)
        `)
        .order("joined_at", { ascending: false });
      
      // Combine all participants
      const allParticipants = [
        ...(communityParticipants || []).map(p => ({
          ...p,
          type: "community" as const,
          challengeTitle: (p.challenge as any)?.title || "Okänd",
          isActive: (p.challenge as any)?.is_active,
          endDate: (p.challenge as any)?.end_date
        })),
        ...(poolParticipants || []).map(p => ({
          ...p,
          type: "pool" as const,
          challengeTitle: `${(p.challenge as any)?.challenge_category || ""} - ${(p.challenge as any)?.challenge_type || ""}`,
          isActive: (p.challenge as any)?.status === "active",
          endDate: (p.challenge as any)?.end_date
        }))
      ].sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());
      
      const total = allParticipants.length;
      const paginated = allParticipants.slice(offset, offset + limit);
      
      // Get profiles for paginated participants
      const userIds = [...new Set(paginated.map(p => p.user_id))];
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      const participantsWithProfiles = paginated.map(p => ({
        ...p,
        profile: profileMap.get(p.user_id) || null
      }));
      
      return new Response(JSON.stringify({ 
        participants: participantsWithProfiles,
        total
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "search") {
      // Search users by name or email
      const searchTerm = `%${query}%`;
      
      // Get profiles matching name
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .ilike("display_name", searchTerm)
        .limit(20);

      // Also search auth.users for email matches
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 100
      });

      const emailMatches = authUsers?.users?.filter(u => 
        u.email?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20) || [];

      // Combine results
      const userMap = new Map<string, { user_id: string; display_name: string | null; avatar_url: string | null; email?: string }>();
      
      // Add profile matches
      profiles?.forEach(p => {
        userMap.set(p.user_id, { ...p, email: undefined });
      });

      // Add email matches and merge with profile data if exists
      for (const authUser of emailMatches) {
        const existing = userMap.get(authUser.id);
        if (existing) {
          existing.email = authUser.email;
        } else {
          // Get profile for this user
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("user_id", authUser.id)
            .single();
          
          userMap.set(authUser.id, {
            user_id: authUser.id,
            display_name: profile?.display_name || null,
            avatar_url: profile?.avatar_url || null,
            email: authUser.email
          });
        }
      }

      return new Response(JSON.stringify({ users: Array.from(userMap.values()) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "details" && userId) {
      // Get detailed stats for a specific user
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name, avatar_url, created_at, gender, birth_year")
        .eq("user_id", userId)
        .single();

      const { data: stats } = await supabaseAdmin
        .from("user_stats")
        .select("level, total_xp, total_workouts, total_sets, total_minutes, total_cardio_sessions, total_cardio_minutes, total_cardio_distance_km")
        .eq("user_id", userId)
        .single();

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { count: recentWorkouts } = await supabaseAdmin
        .from("workout_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("completed_at", sevenDaysAgo.toISOString());

      const { count: recentCardio } = await supabaseAdmin
        .from("cardio_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("completed_at", sevenDaysAgo.toISOString());

      return new Response(JSON.stringify({
        profile: profile || { display_name: null, avatar_url: null, created_at: new Date().toISOString(), gender: null, birth_year: null },
        stats,
        recentWorkouts: recentWorkouts || 0,
        recentCardio: recentCardio || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in admin-user-lookup:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
