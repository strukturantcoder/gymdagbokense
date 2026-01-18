import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type DeleteWorkoutLogBody = {
  workoutLogId?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { workoutLogId }: DeleteWorkoutLogBody = await req.json().catch(() => ({}))

    if (!workoutLogId) {
      return new Response(JSON.stringify({ error: 'workoutLogId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // User-scoped client (for verifying identity)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin client (performs deletion)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify ownership
    const { data: log, error: logError } = await supabaseAdmin
      .from('workout_logs')
      .select('id, user_id')
      .eq('id', workoutLogId)
      .maybeSingle()

    if (logError) {
      console.error('[delete-workout-log] Fetch error:', logError)
      return new Response(JSON.stringify({ error: 'Failed to fetch workout log' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!log) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (log.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Delete children first (in case FK is not cascading)
    const { error: exError } = await supabaseAdmin
      .from('exercise_logs')
      .delete()
      .eq('workout_log_id', workoutLogId)

    if (exError) {
      console.error('[delete-workout-log] exercise_logs delete error:', exError)
      return new Response(JSON.stringify({ error: 'Failed to delete exercise logs' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: wlError } = await supabaseAdmin
      .from('workout_logs')
      .delete()
      .eq('id', workoutLogId)

    if (wlError) {
      console.error('[delete-workout-log] workout_logs delete error:', wlError)
      return new Response(JSON.stringify({ error: 'Failed to delete workout log' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[delete-workout-log] Error:', error)
    return new Response(JSON.stringify({ error: 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
