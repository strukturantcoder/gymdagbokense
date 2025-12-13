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

    const { action, query, userId } = await req.json();

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
