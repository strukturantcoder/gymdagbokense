import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { muscleGroups, duration } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a mobility and stretching expert. Generate a stretching/mobility routine in Swedish.
Return ONLY a JSON object:
{
  "routine_name": "string",
  "exercises": [
    {
      "name": "string (Swedish)",
      "description": "string (short instruction in Swedish)",
      "duration_seconds": number,
      "target_area": "string"
    }
  ],
  "total_duration_minutes": number
}
Generate ${duration || 10} minutes worth of exercises. Focus on the muscle groups provided. Return ONLY valid JSON.`,
          },
          {
            role: "user",
            content: `Muskelgrupper som tränats: ${muscleGroups?.join(", ") || "helkropp"}. Skapa en ${duration || 10}-minuters mobilitetsrutin.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI response");
    
    const routine = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(routine), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating mobility routine:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
