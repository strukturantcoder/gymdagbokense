import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting delay (600ms between each email to stay under 2 req/s limit)
const RATE_LIMIT_DELAY_MS = 600;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if we should resend failed emails
    const body = await req.json().catch(() => ({}));
    const resendFailed = body.resendFailed === true;

    console.log(`[WELCOME-EMAIL] Starting... resendFailed: ${resendFailed}`);

    let emailsToSend: { userId: string; email: string; displayName: string }[] = [];

    if (resendFailed) {
      // Get failed emails from email_logs
      console.log("[WELCOME-EMAIL] Fetching failed emails to resend...");
      
      const { data: failedLogs, error: logsError } = await supabase
        .from("email_logs")
        .select("user_id, email")
        .eq("email_type", "welcome_workout")
        .eq("status", "failed");

      if (logsError) {
        throw logsError;
      }

      console.log(`[WELCOME-EMAIL] Found ${failedLogs?.length || 0} failed emails to resend`);

      for (const log of failedLogs || []) {
        // Get display name from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", log.user_id)
          .single();

        emailsToSend.push({
          userId: log.user_id,
          email: log.email,
          displayName: profile?.display_name || "du"
        });
      }
    } else {
      // Original logic: get users without workouts
      console.log("[WELCOME-EMAIL] Fetching users without any workout logs...");
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, display_name, created_at");

      if (profilesError) {
        throw profilesError;
      }

      const { data: workoutUsers } = await supabase
        .from("workout_logs")
        .select("user_id");

      const { data: cardioUsers } = await supabase
        .from("cardio_logs")
        .select("user_id");

      const { data: wodUsers } = await supabase
        .from("wod_logs")
        .select("user_id");

      const usersWithWorkouts = new Set([
        ...(workoutUsers || []).map(w => w.user_id),
        ...(cardioUsers || []).map(c => c.user_id),
        ...(wodUsers || []).map(w => w.user_id),
      ]);

      const eligibleProfiles = profiles?.filter(p => !usersWithWorkouts.has(p.user_id)) || [];
      console.log(`[WELCOME-EMAIL] Found ${eligibleProfiles.length} users without workouts`);

      for (const profile of eligibleProfiles) {
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
        
        if (!authUser?.user?.email) {
          console.log(`[WELCOME-EMAIL] No email found for user ${profile.user_id}`);
          continue;
        }

        emailsToSend.push({
          userId: profile.user_id,
          email: authUser.user.email,
          displayName: profile.display_name || "du"
        });
      }
    }

    console.log(`[WELCOME-EMAIL] Will send ${emailsToSend.length} emails with ${RATE_LIMIT_DELAY_MS}ms delay between each`);

    let sentCount = 0;
    let errorCount = 0;

    for (let i = 0; i < emailsToSend.length; i++) {
      const { userId, email, displayName } = emailsToSend[i];
      
      // Apply rate limiting delay (except for first email)
      if (i > 0) {
        console.log(`[WELCOME-EMAIL] Waiting ${RATE_LIMIT_DELAY_MS}ms before next email...`);
        await sleep(RATE_LIMIT_DELAY_MS);
      }

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">💪 Dags att ta första steget!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; margin-bottom: 20px;">Hej ${displayName}!</p>
    
    <p>Du registrerade dig på Gymdagboken för ett tag sedan – men vi har inte sett något träningspass ännu! Vi förstår att det kan vara svårt att komma igång, men det viktigaste är att ta första steget.</p>
    
    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
      <h3 style="margin-top: 0; color: #667eea;">Så här enkelt är det:</h3>
      <ol style="margin-bottom: 0; padding-left: 20px;">
        <li style="margin-bottom: 10px;">Öppna appen och gå till "Träning"</li>
        <li style="margin-bottom: 10px;">Generera ett personligt träningsprogram med AI</li>
        <li style="margin-bottom: 0;">Logga ditt första pass – det tar bara några minuter!</li>
      </ol>
    </div>
    
    <p>Varje pass du loggar ger dig <strong>XP</strong> och hjälper dig bygga en <strong>träningsstreak</strong>. Ju längre streak, desto mer bonus-XP!</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://gymdagboken.lovable.app/training" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Starta ditt första pass →</a>
    </div>
    
    <p style="color: #666; font-size: 14px;">Har du frågor eller behöver hjälp? Svara på detta mail så hjälper vi dig.</p>
    
    <p style="margin-bottom: 0;">Ses på gymmet! 🏋️</p>
    <p style="color: #667eea; font-weight: bold; margin-top: 5px;">/Gymdagboken-teamet</p>
  </div>
  
  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>Du får detta mail för att du är registrerad på Gymdagboken.</p>
  </div>
</body>
</html>`;

      try {
        console.log(`[WELCOME-EMAIL] Sending to ${email} (${i + 1}/${emailsToSend.length})...`);
        
        const { error: sendError } = await resend.emails.send({
          from: "Gymdagboken <noreply@gymdagboken.se>",
          to: [email],
          subject: "Dags att ta första steget! 💪",
          html: emailHtml,
        });

        if (sendError) {
          console.error(`[WELCOME-EMAIL] Failed to send to ${email}:`, sendError);
          errorCount++;
          
          // Update existing failed log or insert new one
          if (resendFailed) {
            await supabase.from("email_logs")
              .update({ 
                error_message: sendError.message,
                created_at: new Date().toISOString()
              })
              .eq("user_id", userId)
              .eq("email_type", "welcome_workout")
              .eq("status", "failed");
          } else {
            await supabase.from("email_logs").insert({
              user_id: userId,
              email: email,
              email_type: "welcome_workout",
              subject: "Dags att ta första steget! 💪",
              status: "failed",
              error_message: sendError.message,
            });
          }
        } else {
          console.log(`[WELCOME-EMAIL] Email sent successfully to ${email}`);
          sentCount++;
          
          // If resending, update the existing log to success
          if (resendFailed) {
            await supabase.from("email_logs")
              .update({ 
                status: "sent",
                error_message: null,
                created_at: new Date().toISOString()
              })
              .eq("user_id", userId)
              .eq("email_type", "welcome_workout")
              .eq("status", "failed");
          } else {
            await supabase.from("email_logs").insert({
              user_id: userId,
              email: email,
              email_type: "welcome_workout",
              subject: "Dags att ta första steget! 💪",
              status: "sent",
            });
          }
        }
      } catch (emailError) {
        console.error(`[WELCOME-EMAIL] Error sending to ${email}:`, emailError);
        errorCount++;
      }
    }

    console.log(`[WELCOME-EMAIL] Finished: ${sentCount} sent, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Skickade ${sentCount} mail${resendFailed ? ' (omsändning)' : ''}`,
        sent: sentCount,
        errors: errorCount,
        total: emailsToSend.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[WELCOME-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
