import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ResendResponse {
  id?: string;
  error?: { message: string };
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendEmail(to: string, subject: string, html: string): Promise<ResendResponse> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Gymdagboken <noreply@gymdagboken.se>",
      to: [to],
      subject,
      html,
    }),
  });
  return response.json();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SEND-REMINDER-EMAIL] Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find users who:
    // 1. Registered between 2-3 days ago (to avoid spamming same user)
    // 2. Haven't created a workout program yet
    // 3. Haven't been sent a reminder yet (we'll track this)
    
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    console.log(`[SEND-REMINDER-EMAIL] Looking for users registered between ${threeDaysAgo.toISOString()} and ${twoDaysAgo.toISOString()}`);

    // Get profiles created 2-3 days ago
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name, created_at")
      .gte("created_at", threeDaysAgo.toISOString())
      .lte("created_at", twoDaysAgo.toISOString());

    if (profilesError) {
      console.error("[SEND-REMINDER-EMAIL] Error fetching profiles:", profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log("[SEND-REMINDER-EMAIL] No users found in the 2-3 day window");
      return new Response(JSON.stringify({ message: "No users to remind", count: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`[SEND-REMINDER-EMAIL] Found ${profiles.length} potential users to remind`);

    // Get users who already have workout programs
    const userIds = profiles.map(p => p.user_id);
    const { data: programUsers, error: programsError } = await supabase
      .from("workout_programs")
      .select("user_id")
      .in("user_id", userIds)
      .is("deleted_at", null);

    if (programsError) {
      console.error("[SEND-REMINDER-EMAIL] Error fetching programs:", programsError);
      throw programsError;
    }

    const usersWithPrograms = new Set(programUsers?.map(p => p.user_id) || []);
    
    // Filter to users without programs
    const usersToRemind = profiles.filter(p => !usersWithPrograms.has(p.user_id));

    console.log(`[SEND-REMINDER-EMAIL] ${usersToRemind.length} users need reminders (no program created)`);

    if (usersToRemind.length === 0) {
      return new Response(JSON.stringify({ message: "All users have programs", count: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check which users have already been sent a reminder (via notifications table)
    const { data: existingReminders, error: remindersError } = await supabase
      .from("notifications")
      .select("user_id")
      .in("user_id", usersToRemind.map(u => u.user_id))
      .eq("type", "onboarding_reminder");

    if (remindersError) {
      console.error("[SEND-REMINDER-EMAIL] Error fetching existing reminders:", remindersError);
      throw remindersError;
    }

    const alreadyReminded = new Set(existingReminders?.map(r => r.user_id) || []);
    const usersNeedingEmail = usersToRemind.filter(u => !alreadyReminded.has(u.user_id));

    console.log(`[SEND-REMINDER-EMAIL] ${usersNeedingEmail.length} users need email (not yet reminded)`);

    if (usersNeedingEmail.length === 0) {
      return new Response(JSON.stringify({ message: "All users already reminded", count: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user emails from auth.users (requires service role key)
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error("[SEND-REMINDER-EMAIL] Error fetching auth users:", authError);
      throw authError;
    }

    const userEmails = new Map(authData.users.map(u => [u.id, u.email]));

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersNeedingEmail) {
      const email = userEmails.get(user.user_id);
      if (!email) {
        console.log(`[SEND-REMINDER-EMAIL] No email found for user ${user.user_id}`);
        continue;
      }

      const displayName = user.display_name || "träningsentusiast";

      try {
        // Send reminder email
        const emailResponse = await sendEmail(
          email,
          "Dags att börja träna! 💪",
          `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #f97316; margin: 0;">🏋️ Gymdagboken</h1>
              </div>
              
              <h2 style="color: #1a1a1a;">Hej ${displayName}!</h2>
              
              <p>Vi märkte att du registrerade dig för ett par dagar sedan men inte har skapat ditt träningsprogram än.</p>
              
              <p>Med Gymdagboken kan du:</p>
              <ul style="color: #555;">
                <li>🎯 Få ett AI-genererat träningsprogram anpassat efter dina mål</li>
                <li>📊 Spåra din progress och se dina personliga rekord</li>
                <li>🏆 Samla XP och uppnå prestationer</li>
                <li>⚔️ Utmana vänner och delta i tävlingar</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://gymdagboken.se/training" 
                   style="display: inline-block; background: linear-gradient(135deg, #f97316, #fb923c); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Skapa mitt träningsprogram
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px;">Det tar bara några minuter att komma igång!</p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center;">
                Detta mejl skickades från Gymdagboken. Om du inte vill få fler påminnelser kan du ignorera detta mejl.
              </p>
            </body>
            </html>
          `
        );

        if (emailResponse.error) {
          throw new Error(emailResponse.error.message);
        }

        console.log(`[SEND-REMINDER-EMAIL] Email sent to ${email}:`, emailResponse);

        // Record that we sent a reminder (using notifications table)
        await supabase.from("notifications").insert({
          user_id: user.user_id,
          type: "onboarding_reminder",
          title: "Välkommen till Gymdagboken!",
          message: "Påminnelse om att skapa ditt träningsprogram skickad via mejl.",
          is_read: true, // Mark as read since it's a system notification
        });

        successCount++;
      } catch (emailError: any) {
        console.error(`[SEND-REMINDER-EMAIL] Failed to send email to ${email}:`, emailError);
        errorCount++;
      }
    }

    console.log(`[SEND-REMINDER-EMAIL] Completed: ${successCount} sent, ${errorCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: "Reminder emails processed",
        success: successCount,
        errors: errorCount 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[SEND-REMINDER-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
