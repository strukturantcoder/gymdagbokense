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
    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Du måste vara inloggad för att använda denna funktion." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Ogiltig autentisering. Logga in igen." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", user.id);

    const { userInput, conversationHistory, action } = await req.json();
    
    console.log("Spontaneous workout request:", { action, userInput });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Fetch user's recent workout history for context
    const { data: recentWorkouts } = await supabaseClient
      .from("workout_logs")
      .select("workout_day, completed_at")
      .order("completed_at", { ascending: false })
      .limit(5);

    const { data: recentExercises } = await supabaseClient
      .from("exercise_logs")
      .select("exercise_name, weight_kg, sets_completed, reps_completed")
      .order("created_at", { ascending: false })
      .limit(20);

    // Build context from recent training
    let trainingContext = "";
    if (recentWorkouts && recentWorkouts.length > 0) {
      trainingContext = `\n\nAnvändarens senaste träning:
${recentWorkouts.map(w => `- ${w.workout_day} (${new Date(w.completed_at).toLocaleDateString('sv-SE')})`).join('\n')}`;
    }
    if (recentExercises && recentExercises.length > 0) {
      const exerciseFreq = recentExercises.reduce((acc, e) => {
        acc[e.exercise_name] = (acc[e.exercise_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const topExercises = Object.entries(exerciseFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);
      trainingContext += `\nVanliga övningar: ${topExercises.join(', ')}`;
    }

    const systemPrompt = `Du är en entusiastisk och kunnig personlig tränare som hjälper användare skapa spontana träningspass. 
Du är coachande, uppmuntrande och anpassar dig efter vad användaren vill träna.

${trainingContext}

VIKTIGT:
- Var personlig och använd ett varmt, coachande tonfall
- Ställ följdfrågor om du behöver mer information
- Anpassa passet efter användarens önskemål och energinivå
- Föreslå supersets där det passar för att spara tid

När du genererar ett pass, svara i följande JSON-format:
{
  "type": "workout",
  "message": "Din coachande kommentar till användaren",
  "workout": {
    "name": "Passnamn",
    "focus": "Fokusområde",
    "estimatedDuration": 45,
    "exercises": [
      {
        "name": "Övningsnamn",
        "sets": 3,
        "reps": "8-12",
        "rest": "60 sek",
        "notes": "Tips eller teknikråd",
        "supersetGroup": null
      }
    ]
  },
  "followUp": "Fråga om de vill justera något"
}

När du har en vanlig konversation (inte genererar pass), svara med:
{
  "type": "chat",
  "message": "Ditt svar till användaren"
}`;

    // Build messages array with conversation history
    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []),
      { role: "user", content: userInput }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "För många förfrågningar. Vänta en stund och försök igen." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-krediter slut. Kontakta administratören." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log("AI response:", content);

    // Parse the JSON from the response
    let parsedResponse;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON, treat as chat message
        parsedResponse = {
          type: "chat",
          message: content
        };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      parsedResponse = {
        type: "chat",
        message: content
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-spontaneous-workout:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ett fel uppstod" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
