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

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { message, history } = await req.json();

    // Fetch user's training data for context
    const [workoutLogsResult, cardioLogsResult, wodLogsResult, userStatsResult, exerciseLogsResult] = await Promise.all([
      supabaseClient
        .from('workout_logs')
        .select('id, completed_at, duration_minutes, workout_day')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(50),
      supabaseClient
        .from('cardio_logs')
        .select('id, activity_type, duration_minutes, distance_km, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(50),
      supabaseClient
        .from('wod_logs')
        .select('id, wod_name, wod_format, completed_at, rounds_completed')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(20),
      supabaseClient
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      supabaseClient
        .from('exercise_logs')
        .select('exercise_name, weight_kg, sets_completed, reps_completed, created_at')
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    const workoutLogs = workoutLogsResult.data || [];
    const cardioLogs = cardioLogsResult.data || [];
    const wodLogs = wodLogsResult.data || [];
    const userStats = userStatsResult.data;
    const exerciseLogs = exerciseLogsResult.data || [];

    // Calculate some statistics for context
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentWorkouts = workoutLogs.filter(w => new Date(w.completed_at) > last30Days);
    const recentCardio = cardioLogs.filter(c => new Date(c.completed_at) > last30Days);
    const recentWods = wodLogs.filter(w => new Date(w.completed_at) > last30Days);

    // Get unique exercises and their frequencies
    const exerciseFrequency: Record<string, number> = {};
    exerciseLogs.forEach(log => {
      exerciseFrequency[log.exercise_name] = (exerciseFrequency[log.exercise_name] || 0) + 1;
    });

    // Activity type breakdown
    const cardioActivities: Record<string, number> = {};
    cardioLogs.forEach(log => {
      cardioActivities[log.activity_type] = (cardioActivities[log.activity_type] || 0) + 1;
    });

    const trainingContext = `
Användarens träningsdata:

ÖVERGRIPANDE STATISTIK:
- Total XP: ${userStats?.total_xp || 0}
- Nivå: ${userStats?.level || 1}
- Totalt antal styrkepass: ${userStats?.total_workouts || 0}
- Totalt antal konditionspass: ${userStats?.total_cardio_sessions || 0}
- Total träningstid (styrka): ${userStats?.total_minutes || 0} minuter
- Total konditionstid: ${userStats?.total_cardio_minutes || 0} minuter
- Total konditionsdistans: ${(userStats?.total_cardio_distance_km || 0).toFixed(1)} km

SENASTE 30 DAGARNA:
- Styrkepass: ${recentWorkouts.length}
- Konditionspass: ${recentCardio.length}
- CrossFit WODs: ${recentWods.length}

ÖVNINGSFREKVENS (topp 10):
${Object.entries(exerciseFrequency)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([exercise, count]) => `- ${exercise}: ${count} gånger`)
  .join('\n')}

KONDITIONSAKTIVITETER:
${Object.entries(cardioActivities)
  .sort(([,a], [,b]) => b - a)
  .map(([activity, count]) => `- ${activity}: ${count} pass`)
  .join('\n')}

SENASTE 5 STYRKEPASS:
${workoutLogs.slice(0, 5).map(w => `- ${new Date(w.completed_at).toLocaleDateString('sv-SE')}: ${w.workout_day || 'Okänd dag'}, ${w.duration_minutes || '?'} min`).join('\n')}

SENASTE 5 KONDITIONSPASS:
${cardioLogs.slice(0, 5).map(c => `- ${new Date(c.completed_at).toLocaleDateString('sv-SE')}: ${c.activity_type}, ${c.duration_minutes} min, ${c.distance_km ? c.distance_km.toFixed(1) + ' km' : 'ingen distans'}`).join('\n')}
`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Du är en personlig träningscoach och analysexpert. Du har tillgång till användarens träningsdata och ska ge personlig, användbar feedback baserat på deras frågor.

Riktlinjer:
- Svara alltid på svenska
- Var uppmuntrande men ärlig
- Ge konkreta, actionbara tips
- Basera dina svar på den faktiska träningsdatan
- Om användaren frågar något du inte har data för, var ärlig om det
- Håll svaren koncisa men informativa (max 200 ord)
- Använd emojis sparsamt för att göra svaren mer engagerande

${trainingContext}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('Calling Lovable AI with message:', message);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'För många förfrågningar. Vänta en stund och försök igen.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI-krediter slut. Kontakta support.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Kunde inte generera ett svar.';

    console.log('AI response received successfully');

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Error in analyze-training:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ett fel uppstod';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
