import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      console.error("User is not an admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin access granted for user:", user.id);

    const body = await req.json();
    const { template, currentSubject, currentContent, detectLinks, content, availableAffiliates } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Handle link detection mode
    if (detectLinks && content) {
      console.log("Detecting links in content:", content.substring(0, 100));
      
      // Build affiliate context for the AI
      let affiliateContext = "";
      if (availableAffiliates && availableAffiliates.length > 0) {
        affiliateContext = `\n\nTillgängliga affiliatelänkar att matcha mot:\n${availableAffiliates.map((a: { name: string; url: string }) => `- "${a.name}": ${a.url}`).join("\n")}`;
      }
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `Du är en assistent som identifierar texter i mejl som borde vara hyperlänkar och matchar dem mot tillgängliga affiliatelänkar.
              
Analysera texten och hitta fraser som:
- Produktnamn eller varumärken (t.ex. "Nike", "Whey Protein", "träningskläder")
- Webbadresser eller domännamn
- Call-to-actions (t.ex. "klicka här", "läs mer", "köp nu")
- Referenser till externa resurser eller produkter
- Kampanjer eller erbjudanden

VIKTIGT: Om en fras matchar en tillgänglig affiliatelänk, sätt suggestedUrl till den matchande URL:en.
${affiliateContext}

Returnera ENDAST ett JSON-objekt med denna struktur:
{
  "links": [
    {
      "text": "den exakta texten som hittades i mejlet",
      "startIndex": 0,
      "endIndex": 10,
      "suggestedUrl": "matchad affiliatelänk URL eller tom sträng"
    }
  ]
}

Om inga potentiella länkar hittas, returnera: {"links": []}
Svara ENDAST med JSON, ingen annan text.`
            },
            {
              role: "user",
              content: `Analysera denna mejltext och hitta potentiella länkar. Matcha dem mot tillgängliga affiliatelänkar om möjligt:\n\n${content}`
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI API error:", errorText);
        throw new Error("Failed to detect links");
      }

      const data = await response.json();
      let aiResponse = data.choices?.[0]?.message?.content || "";
      
      // Clean up the response - remove markdown code blocks if present
      aiResponse = aiResponse.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      console.log("AI response for links:", aiResponse);
      
      try {
        const parsed = JSON.parse(aiResponse);
        return new Response(
          JSON.stringify(parsed),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        return new Response(
          JSON.stringify({ links: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Handle template generation mode
    const templateInfo = templatePrompts[template];
    if (!templateInfo) {
      return new Response(
        JSON.stringify({ error: "Unknown template" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
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
