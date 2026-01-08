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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { challenge } = await req.json();
    
    if (!challenge) {
      return new Response(
        JSON.stringify({ error: "Challenge data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Du är en social media manager för en fitness-app som heter Gymdagboken. Du skriver engagerande Instagram-inlägg på svenska som får folk att vilja delta i tävlingar.

Riktlinjer:
- Använd emoji för att göra texten engagerande (men inte för mycket)
- Inkludera en tydlig call-to-action
- Nämn att deltagare kan vinna XP och klättra på topplistan
- Håll texten kort och catchy (max 200 ord)
- Inkludera relevanta hashtags i slutet (5-8 st)
- Skriv på svenska
- Undvik överdrivet säljspråk

Format ditt svar som JSON med följande fält:
{
  "caption": "Inläggstexten med emoji och hashtags",
  "suggestedImagePrompt": "En kort beskrivning på engelska för att generera en passande bild"
}`;

    const userPrompt = `Skapa ett Instagram-inlägg för följande tävling:

Titel: ${challenge.title}
Beskrivning: ${challenge.description || "Ingen beskrivning"}
Mål: ${challenge.goal_description}
Målvärde: ${challenge.target_value || "Inget specifikt"} ${challenge.goal_unit}
Startdatum: ${new Date(challenge.start_date).toLocaleDateString("sv-SE")}
Slutdatum: ${new Date(challenge.end_date).toLocaleDateString("sv-SE")}
Tema: ${challenge.theme || "Generellt fitness"}
Vinnartyp: ${challenge.is_lottery ? "Lotteri bland alla som når målet" : challenge.winner_type === "highest" ? "Högst värde vinner" : "Först till målet vinner"}`;

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
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if no JSON found
        result = {
          caption: content,
          suggestedImagePrompt: "A dynamic fitness challenge promotional image with energetic colors",
        };
      }
    } catch {
      result = {
        caption: content,
        suggestedImagePrompt: "A dynamic fitness challenge promotional image with energetic colors",
      };
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating Instagram post:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
