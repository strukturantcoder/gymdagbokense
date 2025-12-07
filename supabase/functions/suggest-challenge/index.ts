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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const currentDate = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toLocaleString('sv-SE', { month: 'long' });

    const systemPrompt = `Du är en expert på att skapa engagerande veckovisa träningstävlingar för en fitness-app. 
Skapa ett förslag på en veckovis community-tävling som är motiverande och uppnåelig.

Viktiga regler:
- Tävlingen ska vara 7 dagar lång (en vecka)
- Använd svenska
- Var kreativ med tema baserat på säsong eller aktuella händelser
- Målet ska vara realistiskt men utmanande
- Använd någon av dessa enheter för automatisk progress-tracking: "pass" (träningspass), "set" (antal set), "minuter" (träningstid), "km" (konditionsdistans), "konditionspass" (kardiopass)

Dagens datum: ${currentDate}
Månad: ${currentMonth}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Ge mig ett förslag på en veckovis tävling." }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_challenge_suggestion",
              description: "Skapa ett tävlingsförslag med alla nödvändiga fält",
              parameters: {
                type: "object",
                properties: {
                  title: { 
                    type: "string",
                    description: "Kort, catchy titel för tävlingen (max 50 tecken)"
                  },
                  description: { 
                    type: "string",
                    description: "Motiverande beskrivning av tävlingen (max 200 tecken)"
                  },
                  theme: { 
                    type: "string",
                    description: "Tema för tävlingen, t.ex. 'Vinter', 'Nystart', 'Sommar' (max 20 tecken)"
                  },
                  goal_description: { 
                    type: "string",
                    description: "Beskrivning av målet, t.ex. 'Totalt antal träningspass' (max 50 tecken)"
                  },
                  goal_unit: { 
                    type: "string",
                    enum: ["pass", "set", "minuter", "km", "konditionspass"],
                    description: "Enhet för målet"
                  },
                  target_value: { 
                    type: "number",
                    description: "Målvärde för tävlingen (valfritt, används för 'först till mål')"
                  },
                  winner_type: {
                    type: "string",
                    enum: ["highest", "first_to_goal"],
                    description: "Hur vinnaren avgörs"
                  }
                },
                required: ["title", "description", "theme", "goal_description", "goal_unit", "winner_type"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_challenge_suggestion" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Försök igen senare." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Betalning krävs. Lägg till krediter." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data, null, 2));

    // Extract the tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_challenge_suggestion") {
      throw new Error("Unexpected response format");
    }

    const suggestion = JSON.parse(toolCall.function.arguments);

    // Calculate dates (start tomorrow, end in 7 days)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);

    return new Response(JSON.stringify({
      ...suggestion,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-challenge:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
