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
    const { currentProgram, userMessage } = await req.json();
    
    console.log("Refining workout with user message:", userMessage);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Du är en expert personlig tränare som hjälper användare att finjustera sina träningsprogram.
Användaren har genererat ett träningsprogram och vill göra justeringar.

Ditt nuvarande program är:
${JSON.stringify(currentProgram, null, 2)}

Användaren kan be om att:
- Lägga till eller ta bort övningar
- Ändra sets, reps eller vila
- Skapa supersets (gruppera övningar med samma supersetGroup-nummer)
- Byta fokus för en dag
- Justera intensitet eller volym

Svara med det uppdaterade programmet i samma JSON-format, ELLER om användaren bara har en fråga/säger att de är nöjda, svara med:
{
  "type": "message",
  "content": "Ditt meddelande här"
}

Om du gör ändringar, svara med:
{
  "type": "program",
  "program": { ... det uppdaterade programmet ... },
  "changes": "Kort sammanfattning av vad du ändrade"
}`;

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
          { role: "user", content: userMessage },
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
    
    console.log("AI refine response:", content);

    // Parse the JSON from the response
    let responseData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        responseData = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, treat as a plain message
        responseData = {
          type: "message",
          content: content
        };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Treat as plain message if parsing fails
      responseData = {
        type: "message",
        content: content
      };
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in refine-workout:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ett fel uppstod" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
