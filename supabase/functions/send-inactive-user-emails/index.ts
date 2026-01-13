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

    // Calculate date 10 days ago
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const tenDaysAgoStr = tenDaysAgo.toISOString().split('T')[0];

    // Get all users with their activity status
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Get users who have logged workouts in the last 10 days
    const { data: recentWorkoutUsers } = await supabaseAdmin
      .from("workout_logs")
      .select("user_id")
      .gte("completed_at", tenDaysAgoStr);

    // Get users who have logged cardio in the last 10 days
    const { data: recentCardioUsers } = await supabaseAdmin
      .from("cardio_logs")
      .select("user_id")
      .gte("completed_at", tenDaysAgoStr);

    const recentlyActiveSet = new Set([
      ...(recentWorkoutUsers?.map(u => u.user_id) || []),
      ...(recentCardioUsers?.map(u => u.user_id) || [])
    ]);

    // Filter to users who have NOT been active in the last 10 days
    const inactiveProfiles = profiles?.filter(p => 
      !recentlyActiveSet.has(p.user_id)
    ) || [];

    console.log(`Found ${inactiveProfiles.length} inactive users`);

    // Get emails for inactive users from auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      throw authError;
    }

    const emailResults: { email: string; success: boolean; error?: string }[] = [];
    const emailSubject = "🏆 Missa inte januaritävlingen – vinn proteinpulver!";

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
          subject: emailSubject,
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
                    Vi har saknat dig! Det har gått ett tag sedan du loggade din senaste träning. Nu är det perfekt läge att komma igång igen!
                  </p>
                  
                  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 12px; padding: 24px; margin: 30px 0; text-align: center;">
                    <h3 style="margin: 0 0 12px 0; font-size: 20px; color: #ffffff;">🏆 JANUARITÄVLING!</h3>
                    <p style="margin: 0 0 16px 0; font-size: 16px; color: #d1fae5;">
                      Logga träningspass i januari och var med och tävla om <strong style="color: #ffffff;">proteinpulver från Gymgrossisten!</strong>
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #a7f3d0;">
                      Ju fler pass du loggar, desto större chans att vinna!
                    </p>
                  </div>

                  <div style="background: #1f1f1f; border-radius: 12px; padding: 24px; margin: 30px 0;">
                    <h3 style="margin: 0 0 16px 0; font-size: 18px; color: #f97316;">💪 Tips: Fyll på med kosttillskott!</h3>
                    <p style="margin: 0 0 16px 0; font-size: 14px; color: #a0a0a0;">
                      Behöver du protein, kreatin eller andra kosttillskott för att maximera dina resultat? Kolla in Gymgrossistens stora utbud!
                    </p>
                    <div style="text-align: center;">
                      <a href="https://www.gymgrossisten.com/?utm_source=gymdagboken&utm_medium=email&utm_campaign=inactive_reminder" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
                        Handla på Gymgrossisten →
                      </a>
                    </div>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://gymdagboken.se/training" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Börja logga nu! 🚀
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

        // Log successful email to database
        await supabaseAdmin.from("email_logs").insert({
          user_id: profile.user_id,
          email: authUser.email,
          email_type: "inactive_user_reminder",
          subject: emailSubject,
          status: "sent"
        });
      } catch (emailError: any) {
        console.error(`Failed to send email to ${authUser.email}:`, emailError);
        emailResults.push({ email: authUser.email, success: false, error: emailError.message });

        // Log failed email to database
        await supabaseAdmin.from("email_logs").insert({
          user_id: profile.user_id,
          email: authUser.email,
          email_type: "inactive_user_reminder",
          subject: emailSubject,
          status: "failed",
          error_message: emailError.message
        });
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
