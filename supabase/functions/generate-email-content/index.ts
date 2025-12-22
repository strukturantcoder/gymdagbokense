import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const templatePrompts: Record<string, { subject: string; contentPrompt: string }> = {
  weekly_summary: {
    subject: "Din vecka på Gymdagboken 💪",
    contentPrompt: `Skriv ett kort, personligt och motiverande mejl för en veckosammanfattning till en träningsapp-användare.
Mejlet ska:
- Vara på svenska
- Vara max 150 ord
- Vara uppmuntrande och personligt
- Nämna att statistik visas nedan
- Uppmuntra till fortsatt träning
- Inte vara för formellt`
  },
  motivation: {
    subject: "Du klarar det! 🔥",
    contentPrompt: `Skriv ett kort motiverande mejl till någon som tränar.
Mejlet ska:
- Vara på svenska  
- Vara max 100 ord
- Vara uppmuntrande utan att vara cheesy
- Fokusera på framsteg, inte perfektion`
  },
  feature_update: {
    subject: "Nyhet i Gymdagboken! ✨",
    contentPrompt: `Skriv ett kort mejl som annonserar en ny funktion i en träningsapp.
Mejlet ska:
- Vara på svenska
- Vara max 100 ord
- Vara entusiastiskt men professionellt
- Ha en tydlig call-to-action`
  },
  reminder: {
    subject: "Vi saknar dig! 😊",
    contentPrompt: `Skriv ett kort vänligt påminnelsemejl till någon som inte tränat på ett tag.
Mejlet ska:
- Vara på svenska
- Vara max 80 ord
- Vara uppmuntrande, inte skuldbeläggande
- Påminna om fördelarna med träning`
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template, currentSubject, currentContent } = await req.json();
    
    const templateInfo = templatePrompts[template];
    if (!templateInfo) {
      return new Response(
        JSON.stringify({ error: "Unknown template" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Du är en copywriter för en svensk träningsapp kallad Gymdagboken. Du skriver engagerande, personliga mejl på svenska."
          },
          {
            role: "user",
            content: templateInfo.contentPrompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to generate content");
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        subject: templateInfo.subject,
        content: generatedContent.trim()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in generate-email-content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
