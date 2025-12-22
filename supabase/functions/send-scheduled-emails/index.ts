import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

const generateEmailHtml = (subject: string, content: string) => {
  const formattedContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');

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
              <tr>
                <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 40px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🏋️ Gymdagboken</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 22px;">${subject}</h2>
                  <div style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
                    ${formattedContent}
                  </div>
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://gymdagboken.lovable.app/dashboard" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Öppna Gymdagboken →
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f4f4f5; padding: 20px 40px; text-align: center;">
                  <p style="color: #71717a; font-size: 14px; margin: 0;">© ${new Date().getFullYear()} Gymdagboken</p>
                  <p style="color: #a1a1aa; font-size: 12px; margin: 8px 0 0 0;">Du får detta mejl för att du har ett konto på Gymdagboken</p>
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
    console.log("[SEND-SCHEDULED-EMAILS] Starting...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find emails that are due to be sent
    const now = new Date().toISOString();
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("scheduled_emails")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now);

    if (fetchError) {
      console.error("[SEND-SCHEDULED-EMAILS] Error fetching:", fetchError);
      throw fetchError;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      console.log("[SEND-SCHEDULED-EMAILS] No pending emails");
      return new Response(
        JSON.stringify({ message: "No pending emails", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SEND-SCHEDULED-EMAILS] Found ${pendingEmails.length} pending emails`);

    // Get all users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const users = authData.users.filter(u => u.email);

    for (const scheduledEmail of pendingEmails) {
      let sentCount = 0;
      const html = generateEmailHtml(scheduledEmail.subject, scheduledEmail.content);

      // Mark as processing
      await supabase
        .from("scheduled_emails")
        .update({ status: "processing" })
        .eq("id", scheduledEmail.id);

      for (const user of users) {
        try {
          const emailResult = await sendEmail(user.email!, scheduledEmail.subject, html);

          await supabase.from("email_logs").insert({
            user_id: user.id,
            email: user.email!,
            email_type: scheduledEmail.template || "custom",
            subject: scheduledEmail.subject,
            status: emailResult.error ? "failed" : "sent",
            error_message: emailResult.error?.message || null,
          });

          if (!emailResult.error) sentCount++;
        } catch (err) {
          console.error(`Error sending to ${user.email}:`, err);
        }
      }

      // Mark as sent
      await supabase
        .from("scheduled_emails")
        .update({ 
          status: "sent", 
          sent_at: new Date().toISOString(),
          sent_count: sentCount 
        })
        .eq("id", scheduledEmail.id);

      console.log(`[SEND-SCHEDULED-EMAILS] Sent "${scheduledEmail.subject}" to ${sentCount} users`);
    }

    return new Response(
      JSON.stringify({ success: true, processedCount: pendingEmails.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[SEND-SCHEDULED-EMAILS] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
