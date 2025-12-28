import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
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

    // Fetch statistics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get total users count
    const { count: totalUsers } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // Get new users last 30 days
    const { count: newUsersMonth } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString());

    // Get new users last 7 days
    const { count: newUsersWeek } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    // Get total workout logs
    const { count: totalWorkouts } = await supabaseAdmin
      .from("workout_logs")
      .select("*", { count: "exact", head: true });

    // Get workouts last 30 days
    const { count: workoutsMonth } = await supabaseAdmin
      .from("workout_logs")
      .select("*", { count: "exact", head: true })
      .gte("completed_at", thirtyDaysAgo.toISOString());

    // Get workouts last 7 days
    const { count: workoutsWeek } = await supabaseAdmin
      .from("workout_logs")
      .select("*", { count: "exact", head: true })
      .gte("completed_at", sevenDaysAgo.toISOString());

    // Get total cardio logs
    const { count: totalCardio } = await supabaseAdmin
      .from("cardio_logs")
      .select("*", { count: "exact", head: true });

    // Get cardio last 30 days
    const { count: cardioMonth } = await supabaseAdmin
      .from("cardio_logs")
      .select("*", { count: "exact", head: true })
      .gte("completed_at", thirtyDaysAgo.toISOString());

    // Get total workout programs
    const { count: totalPrograms } = await supabaseAdmin
      .from("workout_programs")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null);

    // Get active community challenge participants
    const { count: activeChallengeParticipants } = await supabaseAdmin
      .from("community_challenge_participants")
      .select("*", { count: "exact", head: true });

    // Get active pool challenge participants
    const { count: activePoolParticipants } = await supabaseAdmin
      .from("pool_challenge_participants")
      .select("*", { count: "exact", head: true });

    // Get users with workouts in last 7 days (active users)
    const { data: activeUsersData } = await supabaseAdmin
      .from("workout_logs")
      .select("user_id")
      .gte("completed_at", sevenDaysAgo.toISOString());
    
    const activeUsers = new Set(activeUsersData?.map(w => w.user_id) || []).size;

    // Get users with workouts in last 30 days
    const { data: monthlyActiveData } = await supabaseAdmin
      .from("workout_logs")
      .select("user_id")
      .gte("completed_at", thirtyDaysAgo.toISOString());
    
    const monthlyActiveUsers = new Set(monthlyActiveData?.map(w => w.user_id) || []).size;

    // Get total friendships
    const { count: totalFriendships } = await supabaseAdmin
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted");

    // Get aggregate user stats
    const { data: userStatsData } = await supabaseAdmin
      .from("user_stats")
      .select("total_workouts, total_sets, total_minutes, total_cardio_sessions, total_cardio_minutes, total_xp");

    let totalSets = 0;
    let totalMinutes = 0;
    let totalCardioMinutes = 0;
    let totalXP = 0;

    userStatsData?.forEach(stat => {
      totalSets += stat.total_sets || 0;
      totalMinutes += stat.total_minutes || 0;
      totalCardioMinutes += stat.total_cardio_minutes || 0;
      totalXP += stat.total_xp || 0;
    });

    // ===== NEW DETAILED USER ENGAGEMENT STATS =====
    
    // Get all user IDs
    const { data: allProfiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, created_at");
    
    const allUserIds = new Set(allProfiles?.map(p => p.user_id) || []);
    const totalUserCount = allUserIds.size;

    // Users who have created at least one program
    const { data: usersWithPrograms } = await supabaseAdmin
      .from("workout_programs")
      .select("user_id")
      .is("deleted_at", null);
    const usersWithProgramsSet = new Set(usersWithPrograms?.map(p => p.user_id) || []);
    const usersWithProgramsCount = usersWithProgramsSet.size;
    const usersWithoutPrograms = totalUserCount - usersWithProgramsCount;

    // Users who have logged at least one workout (strength or cardio)
    const { data: usersWithWorkouts } = await supabaseAdmin
      .from("workout_logs")
      .select("user_id");
    const { data: usersWithCardio } = await supabaseAdmin
      .from("cardio_logs")
      .select("user_id");
    const usersWhoTrained = new Set([
      ...(usersWithWorkouts?.map(w => w.user_id) || []),
      ...(usersWithCardio?.map(c => c.user_id) || [])
    ]);
    const usersWhoTrainedCount = usersWhoTrained.size;
    const usersNeverTrained = totalUserCount - usersWhoTrainedCount;

    // Active in last 30 days (any activity: strength or cardio)
    const { data: monthlyStrengthActive } = await supabaseAdmin
      .from("workout_logs")
      .select("user_id")
      .gte("completed_at", thirtyDaysAgo.toISOString());
    const { data: monthlyCardioActive } = await supabaseAdmin
      .from("cardio_logs")
      .select("user_id")
      .gte("completed_at", thirtyDaysAgo.toISOString());
    const activeInLast30Days = new Set([
      ...(monthlyStrengthActive?.map(w => w.user_id) || []),
      ...(monthlyCardioActive?.map(c => c.user_id) || [])
    ]).size;

    // Dormant users (have trained before but not in last 90 days)
    const { data: recentStrengthActive } = await supabaseAdmin
      .from("workout_logs")
      .select("user_id")
      .gte("completed_at", ninetyDaysAgo.toISOString());
    const { data: recentCardioActive } = await supabaseAdmin
      .from("cardio_logs")
      .select("user_id")
      .gte("completed_at", ninetyDaysAgo.toISOString());
    const activeInLast90Days = new Set([
      ...(recentStrengthActive?.map(w => w.user_id) || []),
      ...(recentCardioActive?.map(c => c.user_id) || [])
    ]);
    
    // Dormant = trained before but not in last 90 days
    let dormantUsers = 0;
    usersWhoTrained.forEach(userId => {
      if (!activeInLast90Days.has(userId)) {
        dormantUsers++;
      }
    });

    // Referral statistics
    const { count: totalReferrals } = await supabaseAdmin
      .from("referrals")
      .select("*", { count: "exact", head: true });

    // Users who have referred at least one person
    const { data: referrersData } = await supabaseAdmin
      .from("referrals")
      .select("inviter_id");
    const uniqueReferrers = new Set(referrersData?.map(r => r.inviter_id) || []).size;

    // Users registered this week vs last week (for trend)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const { count: usersLastWeek } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString());

    // Retention rate: users who trained in first week and also in week 4
    // (Simplified: active last week who registered more than 3 weeks ago)
    const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    const { data: veteranProfiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .lt("created_at", threeWeeksAgo.toISOString());
    const veteranUserIds = new Set(veteranProfiles?.map(p => p.user_id) || []);
    
    let retainedVeterans = 0;
    activeInLast30Days; // already calculated
    const { data: activeLastWeekData } = await supabaseAdmin
      .from("workout_logs")
      .select("user_id")
      .gte("completed_at", sevenDaysAgo.toISOString());
    const { data: activeLastWeekCardio } = await supabaseAdmin
      .from("cardio_logs")
      .select("user_id")
      .gte("completed_at", sevenDaysAgo.toISOString());
    const activeLastWeek = new Set([
      ...(activeLastWeekData?.map(w => w.user_id) || []),
      ...(activeLastWeekCardio?.map(c => c.user_id) || [])
    ]);
    
    veteranUserIds.forEach(userId => {
      if (activeLastWeek.has(userId)) {
        retainedVeterans++;
      }
    });
    const retentionRate = veteranUserIds.size > 0 
      ? Math.round((retainedVeterans / veteranUserIds.size) * 100) 
      : 0;

    // Average workouts per active user
    const avgWorkoutsPerActiveUser = usersWhoTrainedCount > 0
      ? Math.round((totalWorkouts || 0) / usersWhoTrainedCount * 10) / 10
      : 0;

    // Users by streak
    const { data: streakData } = await supabaseAdmin
      .from("user_stats")
      .select("current_streak");
    
    let streakDistribution = { noStreak: 0, streak1_7: 0, streak8_30: 0, streak30plus: 0 };
    streakData?.forEach(s => {
      const streak = s.current_streak || 0;
      if (streak === 0) streakDistribution.noStreak++;
      else if (streak <= 7) streakDistribution.streak1_7++;
      else if (streak <= 30) streakDistribution.streak8_30++;
      else streakDistribution.streak30plus++;
    });

    // Gender distribution
    const { data: genderData } = await supabaseAdmin
      .from("profiles")
      .select("gender");
    
    let genderDistribution: Record<string, number> = {};
    genderData?.forEach(p => {
      const gender = p.gender || "unknown";
      genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
    });

    // Get recent signups per day (last 7 days)
    const signupsByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      signupsByDay[dateStr] = 0;
    }

    const { data: recentSignups } = await supabaseAdmin
      .from("profiles")
      .select("created_at")
      .gte("created_at", sevenDaysAgo.toISOString());

    recentSignups?.forEach(signup => {
      const dateStr = signup.created_at.split("T")[0];
      if (signupsByDay[dateStr] !== undefined) {
        signupsByDay[dateStr]++;
      }
    });

    // Get workouts per day (last 7 days)
    const workoutsByDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      workoutsByDay[dateStr] = 0;
    }

    const { data: recentWorkouts } = await supabaseAdmin
      .from("workout_logs")
      .select("completed_at")
      .gte("completed_at", sevenDaysAgo.toISOString());

    recentWorkouts?.forEach(workout => {
      const dateStr = workout.completed_at.split("T")[0];
      if (workoutsByDay[dateStr] !== undefined) {
        workoutsByDay[dateStr]++;
      }
    });

    const stats = {
      users: {
        total: totalUsers || 0,
        newMonth: newUsersMonth || 0,
        newWeek: newUsersWeek || 0,
        newWeekPrevious: usersLastWeek || 0,
        activeWeek: activeUsers,
        activeMonth: monthlyActiveUsers,
      },
      workouts: {
        total: totalWorkouts || 0,
        month: workoutsMonth || 0,
        week: workoutsWeek || 0,
      },
      cardio: {
        total: totalCardio || 0,
        month: cardioMonth || 0,
      },
      programs: {
        total: totalPrograms || 0,
        usersWithPrograms: usersWithProgramsCount,
        usersWithoutPrograms,
      },
      challenges: {
        communityParticipants: activeChallengeParticipants || 0,
        poolParticipants: activePoolParticipants || 0,
      },
      social: {
        friendships: totalFriendships || 0,
        totalReferrals: totalReferrals || 0,
        uniqueReferrers,
      },
      aggregate: {
        totalSets,
        totalMinutes,
        totalCardioMinutes,
        totalXP,
      },
      engagement: {
        usersWhoTrained: usersWhoTrainedCount,
        usersNeverTrained,
        activeInLast30Days,
        dormantUsers,
        retentionRate,
        avgWorkoutsPerActiveUser,
      },
      distributions: {
        streaks: streakDistribution,
        gender: genderDistribution,
      },
      charts: {
        signupsByDay: Object.entries(signupsByDay).map(([date, count]) => ({ date, count })),
        workoutsByDay: Object.entries(workoutsByDay).map(([date, count]) => ({ date, count })),
      },
    };

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
