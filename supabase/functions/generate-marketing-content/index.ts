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
    const { template, templateName, templateDescription, format, regenerateBackground, prompt } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Handle background image regeneration
    if (regenerateBackground && prompt) {
      console.log("Generating new background image for template:", template);
      console.log("Using prompt:", prompt);
      
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!imageResponse.ok) {
        const errorText = await imageResponse.text();
        console.error("Image generation error:", imageResponse.status, errorText);
        throw new Error(`Image generation error: ${imageResponse.status}`);
      }

      const imageData = await imageResponse.json();
      console.log("Image generation response received");
      
      const imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!imageUrl) {
        console.error("No image URL in response:", JSON.stringify(imageData));
        throw new Error("No image in AI response");
      }

      return new Response(JSON.stringify({ imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle marketing content generation
    const systemPrompt = `Du är en kreativ marknadsföringsexpert för Gymdagboken, en svensk träningsapp. 
Din uppgift är att skapa engagerande och professionellt marknadsföringsmaterial för Instagram.

Appen har följande funktioner:
- AI-genererade träningsprogram
- Detaljerad träningsloggning
- GPS-spårning för konditionspass
- Sociala utmaningar med vänner
- XP-system och gamification
- Personliga rekord och statistik

Skriv på svenska. Var energisk, motiverande och professionell.
Använd emojis sparsamt men effektivt.`;

    const userPrompt = `Skapa marknadsföringsinnehåll för funktionen "${templateName}" (${templateDescription}).

Format: ${format === "post" ? "Instagram-inlägg (kvadratiskt)" : "Instagram Story (vertikalt)"}

Returnera ett JSON-objekt med exakt denna struktur:
{
  "headline": "En kort, kraftfull rubrik (max 3-4 ord per rad, kan vara 2 rader separerade med \\n)",
  "subheadline": "En kortare beskrivande text (max 10 ord)",
  "caption": "En engagerande caption för Instagram (2-3 meningar)",
  "hashtags": "#relevanta #hashtags #för #instagram (5-8 hashtags)"
}

Returnera ENDAST JSON, ingen annan text.`;

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
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON");
    }

    const marketingContent = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(marketingContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-marketing-content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
