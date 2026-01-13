import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyStats {
  workouts: number;
  sets: number;
  minutes: number;
  cardioSessions: number;
  cardioMinutes: number;
  cardioDistanceKm: number;
  personalBests: number;
}

interface UserSummary {
  userId: string;
  email: string;
  displayName: string;
  stats: WeeklyStats;
  previousWeekStats: WeeklyStats;
}

const generateProgressBar = (current: number, max: number, color: string): string => {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  return `
    <div style="background: #2a2a2a; border-radius: 8px; height: 12px; width: 100%; margin: 4px 0;">
      <div style="background: ${color}; border-radius: 8px; height: 12px; width: ${percentage}%;"></div>
    </div>
  `;
};

const generateAIMessage = async (stats: WeeklyStats, previousStats: WeeklyStats, displayName: string): Promise<string> => {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    // Fallback message if AI is not available
    return getDefaultMessage(stats, displayName);
  }

  try {
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
            content: `Du är en vänlig och uppmuntrande träningscoach som skriver korta, personliga och motiverande meddelanden på svenska. 
            Var alltid positiv oavsett resultat - hitta något bra att säga även om veckan var lugn. 
            Håll det kort (2-3 meningar), personligt och framåtblickande.
            Använd INTE emojis i början av meningar. Använd max 1-2 emojis totalt om det passar.`
          },
          {
            role: "user",
            content: `Skriv ett uppmuntrande meddelande till ${displayName} baserat på veckans träning:
            
            Denna vecka:
            - ${stats.workouts} styrkepass
            - ${stats.sets} set totalt
            - ${stats.minutes} minuters styrketräning
            - ${stats.cardioSessions} konditionspass
            - ${stats.cardioMinutes} minuters kondition
            - ${stats.cardioDistanceKm.toFixed(1)} km totalt
            - ${stats.personalBests} nya personliga rekord
            
            Förra veckan:
            - ${previousStats.workouts} styrkepass
            - ${previousStats.cardioSessions} konditionspass
            
            Ge ett kort uppmuntrande meddelande om denna veckas prestation och en motiverande uppmaning för nästa vecka.`
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return getDefaultMessage(stats, displayName);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || getDefaultMessage(stats, displayName);
  } catch (error) {
    console.error("Error generating AI message:", error);
    return getDefaultMessage(stats, displayName);
  }
};

const getDefaultMessage = (stats: WeeklyStats, displayName: string): string => {
  if (stats.workouts > 0 || stats.cardioSessions > 0) {
    return `Bra jobbat ${displayName}! Du har visat engagemang denna vecka och det är det som räknas. Fortsätt på samma spår nästa vecka!`;
  }
  return `Hej ${displayName}! Ibland behöver kroppen vila, och det är helt okej. Nästa vecka är en ny chans att komma igång. Du klarar det!`;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { testEmail } = await req.json().catch(() => ({}));

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Calculate date ranges
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const previousWeekStart = new Date(now);
    previousWeekStart.setDate(now.getDate() - 14);

    // Get all users with profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name");

    if (profilesError) throw profilesError;

    // Get ALL auth users with pagination (listUsers has a default limit of 50)
    let allAuthUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    
    while (true) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });
      
      if (authError) throw authError;
      
      allAuthUsers = allAuthUsers.concat(authData.users);
      
      // If we got less than perPage users, we've reached the end
      if (authData.users.length < perPage) {
        break;
      }
      page++;
    }
    
    console.log(`Found ${profiles?.length || 0} profiles and ${allAuthUsers.length} auth users`);

    const results: { email: string; success: boolean; error?: string }[] = [];
    const emailSubject = "Din veckosammanfattning från Gymdagboken 📊";

    // If test email, only process that user
    let usersToProcess = profiles || [];
    if (testEmail) {
      const testUser = allAuthUsers.find(u => u.email === testEmail);
      if (testUser) {
        const testProfile = profiles?.find(p => p.user_id === testUser.id);
        usersToProcess = testProfile ? [testProfile] : [];
      }
    }

    for (const profile of usersToProcess) {
      const authUser = allAuthUsers.find(u => u.id === profile.user_id);
      if (!authUser?.email) continue;

      try {
        // Get this week's workout stats
        const { data: workoutLogs } = await supabaseAdmin
          .from("workout_logs")
          .select("id, duration_minutes")
          .eq("user_id", profile.user_id)
          .gte("completed_at", weekStart.toISOString())
          .lte("completed_at", now.toISOString());

        const { data: exerciseLogs } = await supabaseAdmin
          .from("exercise_logs")
          .select("sets_completed, workout_log_id")
          .in("workout_log_id", workoutLogs?.map(w => w.id) || []);

        const { data: cardioLogs } = await supabaseAdmin
          .from("cardio_logs")
          .select("duration_minutes, distance_km")
          .eq("user_id", profile.user_id)
          .gte("completed_at", weekStart.toISOString())
          .lte("completed_at", now.toISOString());

        const { data: personalBests } = await supabaseAdmin
          .from("personal_bests")
          .select("id")
          .eq("user_id", profile.user_id)
          .gte("achieved_at", weekStart.toISOString())
          .lte("achieved_at", now.toISOString());

        // Get previous week's stats for comparison
        const { data: prevWorkoutLogs } = await supabaseAdmin
          .from("workout_logs")
          .select("id, duration_minutes")
          .eq("user_id", profile.user_id)
          .gte("completed_at", previousWeekStart.toISOString())
          .lt("completed_at", weekStart.toISOString());

        const { data: prevExerciseLogs } = await supabaseAdmin
          .from("exercise_logs")
          .select("sets_completed")
          .in("workout_log_id", prevWorkoutLogs?.map(w => w.id) || []);

        const { data: prevCardioLogs } = await supabaseAdmin
          .from("cardio_logs")
          .select("duration_minutes, distance_km")
          .eq("user_id", profile.user_id)
          .gte("completed_at", previousWeekStart.toISOString())
          .lt("completed_at", weekStart.toISOString());

        const stats: WeeklyStats = {
          workouts: workoutLogs?.length || 0,
          sets: exerciseLogs?.reduce((sum, e) => sum + (e.sets_completed || 0), 0) || 0,
          minutes: workoutLogs?.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) || 0,
          cardioSessions: cardioLogs?.length || 0,
          cardioMinutes: cardioLogs?.reduce((sum, c) => sum + (c.duration_minutes || 0), 0) || 0,
          cardioDistanceKm: cardioLogs?.reduce((sum, c) => sum + (Number(c.distance_km) || 0), 0) || 0,
          personalBests: personalBests?.length || 0,
        };

        const previousStats: WeeklyStats = {
          workouts: prevWorkoutLogs?.length || 0,
          sets: prevExerciseLogs?.reduce((sum, e) => sum + (e.sets_completed || 0), 0) || 0,
          minutes: prevWorkoutLogs?.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) || 0,
          cardioSessions: prevCardioLogs?.length || 0,
          cardioMinutes: prevCardioLogs?.reduce((sum, c) => sum + (c.duration_minutes || 0), 0) || 0,
          cardioDistanceKm: prevCardioLogs?.reduce((sum, c) => sum + (Number(c.distance_km) || 0), 0) || 0,
          personalBests: 0,
        };

        const displayName = profile.display_name || "träningsvän";
        const aiMessage = await generateAIMessage(stats, previousStats, displayName);

        // Calculate comparison indicators
        const workoutChange = stats.workouts - previousStats.workouts;
        const cardioChange = stats.cardioSessions - previousStats.cardioSessions;

        const getChangeIndicator = (change: number) => {
          if (change > 0) return `<span style="color: #22c55e;">↑ ${change}</span>`;
          if (change < 0) return `<span style="color: #ef4444;">↓ ${Math.abs(change)}</span>`;
          return `<span style="color: #a0a0a0;">→ 0</span>`;
        };

        // Weekly goal (example: 4 workouts per week)
        const weeklyGoal = 4;
        const totalSessions = stats.workouts + stats.cardioSessions;

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px 20px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-radius: 16px; overflow: hidden; border: 1px solid #333;">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
                <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: bold; color: #ffffff;">📊 Veckosammanfattning</h1>
                <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9);">Vecka ${getWeekNumber(now)} • Gymdagboken</p>
              </div>

              <!-- AI Message -->
              <div style="padding: 30px; background: linear-gradient(135deg, #1f1f1f 0%, #171717 100%); border-bottom: 1px solid #333;">
                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #e0e0e0; font-style: italic;">
                  "${aiMessage}"
                </p>
              </div>

              <!-- Stats Content -->
              <div style="padding: 30px;">
                <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #f97316;">Veckans resultat</h2>
                
                <!-- Progress towards weekly goal -->
                <div style="background: #1f1f1f; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #a0a0a0; font-size: 14px;">Träningspass denna vecka</span>
                    <span style="color: #ffffff; font-weight: bold;">${totalSessions} / ${weeklyGoal}</span>
                  </div>
                  ${generateProgressBar(totalSessions, weeklyGoal, "#f97316")}
                </div>

                <!-- Stats Grid -->
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px; background: #1f1f1f; border-radius: 8px 0 0 0;">
                      <div style="color: #a0a0a0; font-size: 12px; margin-bottom: 4px;">Styrkepass</div>
                      <div style="color: #ffffff; font-size: 24px; font-weight: bold;">${stats.workouts}</div>
                      <div style="font-size: 12px;">${getChangeIndicator(workoutChange)} vs förra veckan</div>
                    </td>
                    <td style="padding: 12px; background: #1f1f1f; border-radius: 0 8px 0 0;">
                      <div style="color: #a0a0a0; font-size: 12px; margin-bottom: 4px;">Konditionspass</div>
                      <div style="color: #ffffff; font-size: 24px; font-weight: bold;">${stats.cardioSessions}</div>
                      <div style="font-size: 12px;">${getChangeIndicator(cardioChange)} vs förra veckan</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px; background: #1f1f1f; border-radius: 0 0 0 8px;">
                      <div style="color: #a0a0a0; font-size: 12px; margin-bottom: 4px;">Total tid</div>
                      <div style="color: #ffffff; font-size: 24px; font-weight: bold;">${stats.minutes + stats.cardioMinutes}</div>
                      <div style="font-size: 12px; color: #a0a0a0;">minuter</div>
                    </td>
                    <td style="padding: 12px; background: #1f1f1f; border-radius: 0 0 8px 0;">
                      <div style="color: #a0a0a0; font-size: 12px; margin-bottom: 4px;">Distans</div>
                      <div style="color: #ffffff; font-size: 24px; font-weight: bold;">${stats.cardioDistanceKm.toFixed(1)}</div>
                      <div style="font-size: 12px; color: #a0a0a0;">km</div>
                    </td>
                  </tr>
                </table>

                ${stats.personalBests > 0 ? `
                <div style="background: linear-gradient(135deg, #22c55e20 0%, #16a34a20 100%); border: 1px solid #22c55e40; border-radius: 12px; padding: 16px; margin-top: 20px; text-align: center;">
                  <span style="font-size: 24px;">🏆</span>
                  <p style="margin: 8px 0 0 0; color: #22c55e; font-weight: bold;">
                    ${stats.personalBests} nya personliga rekord!
                  </p>
                </div>
                ` : ''}

                <!-- CTA -->
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://gymdagboken.se/dashboard" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 14px;">
                    Se all statistik →
                  </a>
                </div>
              </div>

              <!-- Footer -->
              <div style="background: #0f0f0f; padding: 20px 30px; text-align: center; border-top: 1px solid #333;">
                <p style="margin: 0; font-size: 12px; color: #666666;">
                  © ${new Date().getFullYear()} Gymdagboken. Alla rättigheter förbehållna.
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        await resend.emails.send({
          from: "Gymdagboken <noreply@gymdagboken.se>",
          to: [authUser.email],
          subject: emailSubject,
          html: emailHtml,
        });

        // Log the email
        await supabaseAdmin.from("email_logs").insert({
          user_id: profile.user_id,
          email: authUser.email,
          email_type: "weekly_summary",
          subject: emailSubject,
          status: "sent"
        });

        results.push({ email: authUser.email, success: true });
        console.log(`Weekly summary sent to ${authUser.email}`);

      } catch (error: any) {
        console.error(`Failed to send to ${authUser?.email}:`, error);
        results.push({ email: authUser?.email || "unknown", success: false, error: error.message });
        
        if (authUser?.email) {
          await supabaseAdmin.from("email_logs").insert({
            user_id: profile.user_id,
            email: authUser.email,
            email_type: "weekly_summary",
            subject: emailSubject,
            status: "failed",
            error_message: error.message
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent: successCount,
        emailsFailed: failCount,
        results
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in weekly-summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

serve(handler);
