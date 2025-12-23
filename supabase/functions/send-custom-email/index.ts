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

interface AffiliateLink {
  id: string;
  label: string;
  url: string;
  imageUrl?: string;
}

const generateEmailHtml = (subject: string, content: string, affiliateLinks: AffiliateLink[] = []) => {
  // Convert markdown-like syntax to HTML
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
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px 40px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🏋️ Gymdagboken</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="color: #18181b; margin: 0 0 20px 0; font-size: 22px;">${subject}</h2>
                  <div style="color: #3f3f46; font-size: 16px; line-height: 1.6;">
                    ${formattedContent}
                  </div>
                  
                  ${affiliateLinks.length > 0 ? `
                  <!-- Affiliate Links -->
                  <div style="border-top: 1px solid #e4e4e7; margin-top: 30px; padding-top: 20px;">
                    <p style="color: #71717a; font-size: 14px; text-align: center; margin: 0 0 15px 0;">Rekommendationer</p>
                    <div style="text-align: center;">
                      ${affiliateLinks.map(link => `
                        <a href="${link.url}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 500; font-size: 14px; margin: 5px;">
                          ${link.label} →
                        </a>
                      `).join('')}
                    </div>
                  </div>
                  ` : ''}
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://gymdagboken.lovable.app/dashboard" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Öppna Gymdagboken →
                    </a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
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
    const { to, subject, content, affiliateLinks, isTest, sendToAll } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const html = generateEmailHtml(subject, content, affiliateLinks || []);
    let sentCount = 0;

    if (isTest && to) {
      // Send test email to single address
      const emailResult = await sendEmail(to, subject, html);

      if (emailResult.error) {
        console.error("Error sending test email:", emailResult.error);
        throw new Error(emailResult.error.message);
      }

      // Log the test email
      await supabase.from("email_logs").insert({
        email: to,
        email_type: "custom",
        subject,
        status: "sent",
      });

      sentCount = 1;
    } else if (sendToAll) {
      // Get all users with their emails
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("Error fetching users:", authError);
        throw authError;
      }

      const users = authUsers.users.filter(u => u.email);
      console.log(`Sending custom email to ${users.length} users`);

      for (const user of users) {
        try {
          const emailResult = await sendEmail(user.email!, subject, html);

          await supabase.from("email_logs").insert({
            user_id: user.id,
            email: user.email!,
            email_type: "custom",
            subject,
            status: emailResult.error ? "failed" : "sent",
            error_message: emailResult.error?.message || null,
          });

          if (!emailResult.error) sentCount++;
        } catch (err) {
          console.error(`Error sending to ${user.email}:`, err);
        }
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, sentCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-custom-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
