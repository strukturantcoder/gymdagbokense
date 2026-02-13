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

    const { lastVersion } = await req.json();

    const prompt = `Du är en assistent för en svensk träningsapp som heter Gymdagboken. 
Generera 3-5 korta och engagerande uppdateringsnoteringar för en ny appversion.
Fokusera på typiska förbättringar för träningsappar som:
- Prestandaförbättringar
- Buggfixar
- UI/UX-förbättringar
- Nya funktioner (träning, statistik, socialt, etc.)

${lastVersion ? `Senaste version var: ${lastVersion}` : "Detta är en ny uppdatering."}

Svara ENDAST med en JSON-array av strängar, max 50 tecken per punkt. Exempel:
["Snabbare laddning av träningslogg", "Förbättrad statistikvy", "Nya prestationer att låsa upp"]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Du svarar alltid med giltig JSON utan markdown-formatering." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON response
    let suggestions: string[];
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      suggestions = JSON.parse(cleanContent);
    } catch {
      suggestions = ["Prestandaförbättringar", "Buggfixar", "Förbättrad användarupplevelse"];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
