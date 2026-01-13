import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Updated: verify_jwt = false in config.toml
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('[admin-users] No auth header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Create client with user's auth header
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user using getUser
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.log('[admin-users] User error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = user.id;
    console.log('[admin-users] User ID:', userId);

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      console.log('[admin-users] Not admin');
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[admin-users] Admin verified');

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';

    // Fetch ALL users by paginating through all pages
    let allUsers: any[] = [];
    let currentPage = 1;
    let hasMore = true;
    
    while (hasMore) {
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: currentPage,
        perPage: 1000, // Max allowed per page
      });

      if (authError) {
        console.error('Error fetching users:', authError);
        throw authError;
      }

      allUsers = [...allUsers, ...authUsers.users];
      
      // If we got less than 1000, we've reached the end
      if (authUsers.users.length < 1000) {
        hasMore = false;
      } else {
        currentPage++;
      }
    }

    const totalUsers = allUsers.length;

    // Filter by search if provided
    let filteredUsers = allUsers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = allUsers.filter(u => 
        u.email?.toLowerCase().includes(searchLower) ||
        u.user_metadata?.display_name?.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination after filtering
    const startIndex = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

    // Get workout counts for paginated users only (for performance)
    const userIds = paginatedUsers.map(u => u.id);
    
    const { data: workoutCounts } = await supabaseAdmin
      .from('workout_logs')
      .select('user_id')
      .in('user_id', userIds);

    const { data: cardioCounts } = await supabaseAdmin
      .from('cardio_logs')
      .select('user_id')
      .in('user_id', userIds);

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    // Count workouts per user
    const workoutCountMap: Record<string, number> = {};
    workoutCounts?.forEach(w => {
      workoutCountMap[w.user_id] = (workoutCountMap[w.user_id] || 0) + 1;
    });

    const cardioCountMap: Record<string, number> = {};
    cardioCounts?.forEach(c => {
      cardioCountMap[c.user_id] = (cardioCountMap[c.user_id] || 0) + 1;
    });

    const profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    profiles?.forEach(p => {
      profileMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
    });

    // Map users with stats
    const usersWithStats = paginatedUsers.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      display_name: profileMap[u.id]?.display_name || u.user_metadata?.display_name || null,
      avatar_url: profileMap[u.id]?.avatar_url || null,
      workout_count: workoutCountMap[u.id] || 0,
      cardio_count: cardioCountMap[u.id] || 0,
      email_confirmed_at: u.email_confirmed_at,
    }));

    // Sort by last sign in (most recent first)
    usersWithStats.sort((a, b) => {
      if (!a.last_sign_in_at) return 1;
      if (!b.last_sign_in_at) return -1;
      return new Date(b.last_sign_in_at).getTime() - new Date(a.last_sign_in_at).getTime();
    });

    return new Response(JSON.stringify({
      users: usersWithStats,
      total: search ? filteredUsers.length : totalUsers,
      page,
      limit,
      totalPages: Math.ceil((search ? filteredUsers.length : totalUsers) / limit),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in admin-users:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
