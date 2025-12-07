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

    const { goal, experienceLevel, daysPerWeek, customDescription } = await req.json();
    
    console.log("Generating workout for:", { goal, experienceLevel, daysPerWeek, customDescription });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Du är en expert personlig tränare som skapar skräddarsydda träningsprogram på svenska. 
Du skapar alltid realistiska, effektiva program baserade på användarens mål och erfarenhetsnivå.

VIKTIGT: Du kan gruppera övningar som supersets genom att ge dem samma "supersetGroup" nummer (1, 2, 3 osv).
Övningar utan supersetGroup eller med supersetGroup: null utförs som vanliga övningar.

Svara ALLTID i JSON-format med följande struktur:
{
  "name": "Programnamn",
  "description": "Kort beskrivning av programmet",
  "weeks": 4,
  "days": [
    {
      "day": "Dag 1",
      "focus": "Fokusområde (t.ex. Bröst & Triceps)",
      "exercises": [
        {
          "name": "Övningsnamn",
          "sets": 3,
          "reps": "8-12",
          "rest": "60-90 sek",
          "notes": "Eventuella tips",
          "supersetGroup": null
        }
      ]
    }
  ],
  "followUpQuestion": "En fråga till användaren om de vill justera något, t.ex. 'Vill du lägga till supersets för effektivare träning?' eller 'Ska jag justera antalet övningar för någon dag?'"
}`;

    const userPrompt = `Skapa ett ${daysPerWeek}-dagars träningsprogram för någon med följande profil:
- Mål: ${goal}
- Erfarenhetsnivå: ${experienceLevel}
- Träningsdagar per vecka: ${daysPerWeek}
${customDescription ? `- Användarens egna önskemål: ${customDescription}` : ''}

Ge mig ett komplett program med övningar, sets, reps och vila. 
Inkludera supersets där det är lämpligt för att spara tid och öka intensiteten.
Avsluta med en uppföljningsfråga om användaren vill justera något.
Svara endast med JSON, ingen annan text.`;

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
          { role: "user", content: userPrompt },
        ],
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
    let programData;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        programData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Kunde inte tolka AI-svaret");
    }

    return new Response(JSON.stringify({ program: programData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-workout:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ett fel uppstod" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
