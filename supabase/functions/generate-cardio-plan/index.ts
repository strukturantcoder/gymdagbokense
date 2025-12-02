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
    const { goalType, targetValue, targetDate, experienceLevel, currentFitness, preferredActivities, daysPerWeek, customDescription } = await req.json();
    
    console.log("Generating cardio plan for:", { goalType, targetValue, targetDate, experienceLevel, currentFitness, preferredActivities, daysPerWeek });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Du är en expert konditions- och löparcoach som skapar skräddarsydda träningsplaner på svenska.
Du skapar alltid realistiska, progressiva program baserade på användarens mål, nuvarande kondition och erfarenhetsnivå.

Viktiga principer:
- Bygg upp gradvis (10% ökning per vecka max)
- Inkludera vilodag(ar)
- Variera intensitet (lätt, medel, intervall, långpass)
- Anpassa efter måltyp (maraton, 5K, kondition, viktnedgång)

Svara ALLTID i JSON-format med följande struktur:
{
  "name": "Plannamn (t.ex. Maratonförberedelse 16 veckor)",
  "description": "Kort beskrivning av planen och dess mål",
  "totalWeeks": 12,
  "goalSummary": "Sammanfattning av målet",
  "tips": ["Tips 1", "Tips 2", "Tips 3"],
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "Basbyggnad",
      "totalDistance": 25,
      "sessions": [
        {
          "day": "Måndag",
          "type": "Lätt löpning",
          "activity": "running",
          "duration": 30,
          "distance": 5,
          "intensity": "låg",
          "description": "Lätt och avslappnat tempo, du ska kunna prata",
          "heartRateZone": "Zon 2 (60-70% av maxpuls)"
        },
        {
          "day": "Onsdag",
          "type": "Intervaller",
          "activity": "running",
          "duration": 45,
          "distance": 6,
          "intensity": "hög",
          "description": "5 min uppvärmning, 6x400m med 90 sek vila, 5 min nedvarvning",
          "heartRateZone": "Zon 4 (80-90% av maxpuls)"
        }
      ]
    }
  ]
}`;

    let goalDescription = "";
    switch (goalType) {
      case "marathon":
        goalDescription = `förbereda sig för ett maraton (42.195 km) med måltid ${targetValue || "4:30:00"}`;
        break;
      case "half_marathon":
        goalDescription = `förbereda sig för ett halvmaraton (21.1 km) med måltid ${targetValue || "2:00:00"}`;
        break;
      case "10k":
        goalDescription = `förbereda sig för ett 10 km lopp med måltid ${targetValue || "50:00"}`;
        break;
      case "5k":
        goalDescription = `förbereda sig för ett 5 km lopp med måltid ${targetValue || "25:00"}`;
        break;
      case "distance_weekly":
        goalDescription = `bygga upp till att springa ${targetValue} km per vecka`;
        break;
      case "duration_weekly":
        goalDescription = `träna kondition ${targetValue} minuter per vecka`;
        break;
      case "weight_loss":
        goalDescription = `förbättra konditionen med fokus på kaloriförbränning och fettförbränning`;
        break;
      case "general_fitness":
        goalDescription = `förbättra allmän kondition och uthållighet`;
        break;
      default:
        goalDescription = `nå konditionsmålet: ${targetValue || "förbättrad kondition"}`;
    }

    const userPrompt = `Skapa en detaljerad konditionsträningsplan för någon med följande profil:
- Mål: ${goalDescription}
${targetDate ? `- Måldatum: ${targetDate}` : ''}
- Erfarenhetsnivå: ${experienceLevel || "nybörjare"}
- Nuvarande konditionsnivå: ${currentFitness || "grundläggande"}
- Föredragna aktiviteter: ${preferredActivities?.join(", ") || "löpning"}
- Tillgängliga träningsdagar per vecka: ${daysPerWeek || 3}
${customDescription ? `- Användarens egna önskemål och begränsningar: ${customDescription}` : ''}

Skapa en komplett plan med veckoschema, sessioner med typ, duration, distans och intensitet. 
Ge praktiska tips för att lyckas med träningen.
Svara endast med JSON, ingen annan text.`;

    console.log("Sending prompt to AI:", userPrompt);

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
    let planData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        planData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Kunde inte tolka AI-svaret");
    }

    return new Response(JSON.stringify({ plan: planData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-cardio-plan:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Ett fel uppstod" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});