import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface ResendResponse {
  id?: string;
  error?: { message: string };
}

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

interface ChallengeEmailRequest {
  challengeId?: string;
  challengeTitle: string;
  challengeDescription: string;
  goalDescription: string;
  goalUnit: string;
  targetValue?: number;
  startDate: string;
  endDate: string;
  theme?: string;
  isTest?: boolean;
  testEmail?: string;
}

const generateChallengeEmailHtml = (challenge: ChallengeEmailRequest) => {
  const startDate = new Date(challenge.startDate).toLocaleDateString("sv-SE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const endDate = new Date(challenge.endDate).toLocaleDateString("sv-SE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const themeEmoji = challenge.theme === "christmas" ? "🎄" : 
                     challenge.theme === "summer" ? "☀️" : 
                     challenge.theme === "newyear" ? "🎆" : "🏆";

  const targetText = challenge.targetValue 
    ? `<p style="color: #f97316; font-size: 24px; font-weight: bold; margin: 20px 0;">Mål: ${challenge.targetValue} ${challenge.goalUnit}</p>`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f4f4f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 40px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🏋️ Gymdagboken</h1>
                </td>
              </tr>
              
              <!-- Challenge Banner -->
              <tr>
                <td style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 30px 40px; text-align: center;">
                  <p style="color: #fbbf24; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 10px 0;">Ny Community-Tävling</p>
                  <h2 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">${themeEmoji} ${challenge.challengeTitle}</h2>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    ${challenge.challengeDescription || "En ny spännande tävling har börjat! Delta och tävla mot andra användare."}
                  </p>
                  
                  <!-- Challenge Details Card -->
                  <div style="background-color: #fef3c7; border-radius: 12px; padding: 24px; margin: 20px 0;">
                    <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">📋 Tävlingsdetaljer</h3>
                    <p style="color: #78350f; margin: 0 0 10px 0; font-size: 15px;">
                      <strong>Mål:</strong> ${challenge.goalDescription}
                    </p>
                    ${targetText}
                    <p style="color: #78350f; margin: 0 0 5px 0; font-size: 14px;">
                      <strong>Start:</strong> ${startDate}
                    </p>
                    <p style="color: #78350f; margin: 0; font-size: 14px;">
                      <strong>Slut:</strong> ${endDate}
                    </p>
                  </div>
                  
                  <!-- Motivation -->
                  <p style="color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    Delta i tävlingen och utmana dig själv! Logga dina träningspass för att se din ranking på topplistan. 💪
                  </p>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://gymdagboken.lovable.app/social?tab=challenges" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.3);">
                      Delta i tävlingen →
                    </a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f4f4f5; padding: 20px 40px; text-align: center;">
                  <p style="color: #71717a; font-size: 14px; margin: 0;">© ${new Date().getFullYear()} Gymdagboken</p>
                  <p style="color: #a1a1aa; font-size: 12px; margin: 8px 0 0 0;">
                    Du får detta mejl för att du har aktiverat community-notiser.
                    <br/>
                    <a href="https://gymdagboken.lovable.app/account" style="color: #f97316;">Hantera dina notis-inställningar</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const challengeData: ChallengeEmailRequest = await req.json();
    console.log("Received challenge email request:", challengeData);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const subject = `🏆 Ny tävling: ${challengeData.challengeTitle}`;
    const html = generateChallengeEmailHtml(challengeData);

    let sentCount = 0;

    if (challengeData.isTest && challengeData.testEmail) {
      // Send test email
      console.log("Sending test email to:", challengeData.testEmail);
      const emailResult = await sendEmail(challengeData.testEmail, subject, html);

      if (emailResult.error) {
        console.error("Error sending test email:", emailResult.error);
        throw new Error(emailResult.error.message);
      }

      await supabase.from("email_logs").insert({
        email: challengeData.testEmail,
        email_type: "community_challenge",
        subject,
        status: "sent",
      });

      sentCount = 1;
    } else {
      // Get users who have community_challenges notifications enabled
      const { data: preferences, error: prefError } = await supabase
        .from("notification_preferences")
        .select("user_id")
        .eq("community_challenges", true);

      if (prefError) {
        console.error("Error fetching notification preferences:", prefError);
        throw prefError;
      }

      const userIds = preferences?.map(p => p.user_id) || [];
      console.log(`Found ${userIds.length} users with community challenge notifications enabled`);

      if (userIds.length === 0) {
        return new Response(
          JSON.stringify({ success: true, sentCount: 0, message: "No users with notifications enabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user emails
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.error("Error fetching users:", authError);
        throw authError;
      }

      const usersToNotify = authUsers.users.filter(
        u => u.email && userIds.includes(u.id)
      );

      console.log(`Sending community challenge email to ${usersToNotify.length} users`);

      for (const user of usersToNotify) {
        try {
          const emailResult = await sendEmail(user.email!, subject, html);

          await supabase.from("email_logs").insert({
            user_id: user.id,
            email: user.email!,
            email_type: "community_challenge",
            subject,
            status: emailResult.error ? "failed" : "sent",
            error_message: emailResult.error?.message || null,
          });

          if (!emailResult.error) sentCount++;
        } catch (err) {
          console.error(`Error sending to ${user.email}:`, err);
        }
      }
    }

    console.log(`Successfully sent ${sentCount} community challenge emails`);

    return new Response(
      JSON.stringify({ success: true, sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-community-challenge-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
