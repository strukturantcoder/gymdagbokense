import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  displayName: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { email, displayName }: WelcomeEmailRequest = await req.json();

    console.log(`[WELCOME-EMAIL] Sending to ${email} (${displayName})`);

    const emailResponse = await resend.emails.send({
      from: "Gymdagboken <noreply@gymdagboken.se>",
      to: [email],
      subject: "Välkommen till Gymdagboken! 💪",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px 20px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-radius: 16px; overflow: hidden; border: 1px solid #333;">
            <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff;">🏋️ GYMDAGBOKEN</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #ffffff;">Välkommen, ${displayName || 'träningsvän'}! 👋</h2>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #a0a0a0;">
                Vi är superglada att ha dig med i Gymdagboken! Nu är du redo att ta din träning till nästa nivå.
              </p>
              <div style="background: #1f1f1f; border-radius: 12px; padding: 24px; margin: 30px 0;">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #f97316;">🚀 Kom igång nu:</h3>
                <ul style="margin: 0; padding: 0 0 0 20px; color: #a0a0a0; line-height: 1.8;">
                  <li><strong style="color: #ffffff;">Skapa ditt träningsprogram</strong> – Vårt AI genererar ett personligt program baserat på dina mål</li>
                  <li><strong style="color: #ffffff;">Logga ditt första pass</strong> – Följ din progression och se dina framsteg</li>
                  <li><strong style="color: #ffffff;">Utmana vänner</strong> – Bjud in vänner och tävla mot varandra</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://gymdagboken.se/dashboard" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Börja träna nu →
                </a>
              </div>
              <p style="margin: 30px 0 0 0; font-size: 14px; color: #666666; text-align: center;">
                Har du frågor? Svara på detta mejl så hjälper vi dig!
              </p>
            </div>
            <div style="background: #0f0f0f; padding: 20px 30px; text-align: center; border-top: 1px solid #333;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
                © ${new Date().getFullYear()} Gymdagboken. Alla rättigheter förbehållna.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[WELCOME-EMAIL] Sent successfully:", emailResponse);

    // Log to database
    await supabase.from("email_logs").insert({
      email,
      email_type: "welcome",
      subject: "Välkommen till Gymdagboken! 💪",
      status: "sent",
    });

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[WELCOME-EMAIL] Error:", error);

    // Log error to database
    try {
      const body = await req.clone().json().catch(() => ({}));
      await supabase.from("email_logs").insert({
        email: body.email || "unknown",
        email_type: "welcome",
        subject: "Välkommen till Gymdagboken! 💪",
        status: "failed",
        error_message: error.message,
      });
    } catch (logError) {
      console.error("[WELCOME-EMAIL] Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
