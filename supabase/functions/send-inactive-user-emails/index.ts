import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key to access auth.users
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get all users with their activity status
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Get users with programs
    const { data: usersWithPrograms } = await supabaseAdmin
      .from("workout_programs")
      .select("user_id")
      .is("deleted_at", null);

    // Get users with workout logs
    const { data: usersWithLogs } = await supabaseAdmin
      .from("workout_logs")
      .select("user_id");

    const usersWithProgramsSet = new Set(usersWithPrograms?.map(p => p.user_id) || []);
    const usersWithLogsSet = new Set(usersWithLogs?.map(l => l.user_id) || []);

    // Filter to users who have neither programs nor logs
    const inactiveProfiles = profiles?.filter(p => 
      !usersWithProgramsSet.has(p.user_id) && !usersWithLogsSet.has(p.user_id)
    ) || [];

    console.log(`Found ${inactiveProfiles.length} inactive users`);

    // Get emails for inactive users from auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      throw authError;
    }

    const emailResults: { email: string; success: boolean; error?: string }[] = [];

    for (const profile of inactiveProfiles) {
      const authUser = authData.users.find(u => u.id === profile.user_id);
      
      if (!authUser?.email) {
        console.log(`No email found for user ${profile.user_id}`);
        continue;
      }

      const displayName = profile.display_name || 'träningsvän';

      try {
        const emailResponse = await resend.emails.send({
          from: "Gymdagboken <noreply@gymdagboken.se>",
          to: [authUser.email],
          subject: "Vi saknar dig på Gymdagboken! 💪",
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
                  <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #ffffff;">Hej ${displayName}! 👋</h2>
                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #a0a0a0;">
                    Vi märkte att du inte har kommit igång med din träning än. Ingen fara – det är aldrig för sent att börja!
                  </p>
                  <div style="background: #1f1f1f; border-radius: 12px; padding: 24px; margin: 30px 0;">
                    <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #f97316;">🎯 Så här enkelt kommer du igång:</h3>
                    <ol style="margin: 0; padding: 0 0 0 20px; color: #a0a0a0; line-height: 1.8;">
                      <li><strong style="color: #ffffff;">Skapa ditt träningsprogram</strong> – På bara 30 sekunder genererar vårt AI ett personligt program baserat på dina mål</li>
                      <li><strong style="color: #ffffff;">Logga ditt första pass</strong> – Tryck på "Starta pass" och börja spåra din träning</li>
                      <li><strong style="color: #ffffff;">Se dina framsteg</strong> – Följ din utveckling med statistik och personliga rekord</li>
                    </ol>
                  </div>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://gymdagboken.se/training" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Skapa mitt program nu →
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

        console.log(`Email sent to ${authUser.email}:`, emailResponse);
        emailResults.push({ email: authUser.email, success: true });
      } catch (emailError: any) {
        console.error(`Failed to send email to ${authUser.email}:`, emailError);
        emailResults.push({ email: authUser.email, success: false, error: emailError.message });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    const failCount = emailResults.filter(r => !r.success).length;

    console.log(`Email sending complete: ${successCount} sent, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalInactive: inactiveProfiles.length,
        emailsSent: successCount,
        emailsFailed: failCount,
        results: emailResults
      }), 
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-inactive-user-emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
