import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Du är en personlig träningscoach som hjälper användare att sätta upp realistiska och motiverande träningsmål.

Baserat på användarens svar, föreslå 2-3 konkreta mål. Varje mål ska vara:
- SMART (Specifikt, Mätbart, Uppnåeligt, Relevant, Tidsbundet)
- Motiverande och personligt anpassat
- Ha en tydlig målsättning med siffror

Svara ENDAST med JSON i detta format:
{
  "goals": [
    {
      "title": "Kort titel för målet",
      "description": "Förklaring varför detta mål passar användaren",
      "goal_type": "strength|cardio|weight|habit|custom",
      "target_value": 12,
      "target_unit": "sessions|kg|km|minutes",
      "weeks_to_complete": 8
    }
  ],
  "encouragement": "En personlig uppmuntring till användaren"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "För många förfrågningar, försök igen senare." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Betalning krävs." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Parse the JSON response
    let suggestions;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      suggestions = JSON.parse(jsonMatch[1].trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      suggestions = {
        goals: [
          {
            title: "Träna regelbundet",
            description: "Bygg en stabil träningsvana genom att träna minst 3 gånger per vecka",
            goal_type: "habit",
            target_value: 12,
            target_unit: "sessions",
            weeks_to_complete: 4
          }
        ],
        encouragement: "Varje träningspass är ett steg mot ditt bästa jag!"
      };
    }

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-goals:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
