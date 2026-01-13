import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sendWelcomeEmail = async (email: string, displayName: string, supabase: any) => {
  try {
    // Check if already sent
    const { data: existingEmail } = await supabase
      .from("email_logs")
      .select("id")
      .eq("email", email)
      .eq("email_type", "welcome")
      .eq("status", "sent")
      .maybeSingle();

    if (existingEmail) {
      console.log(`[VERIFY] Welcome email already sent to ${email}`);
      return;
    }

    console.log(`[VERIFY] Sending welcome email to ${email}`);

    await resend.emails.send({
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
                Ditt konto har nu aktiverats! Du är redo att ta din träning till nästa nivå.
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

    await supabase.from("email_logs").insert({
      email,
      email_type: "welcome",
      subject: "Välkommen till Gymdagboken! 💪",
      status: "sent",
    });

    console.log(`[VERIFY] Welcome email sent to ${email}`);
  } catch (error) {
    console.error(`[VERIFY] Failed to send welcome email:`, error);
  }
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, userIds } = await req.json();
    
    // Handle bulk verification
    if (userIds && Array.isArray(userIds)) {
      const results = [];
      for (const id of userIds) {
        try {
          const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
            id,
            { email_confirm: true }
          );
          
          if (!updateError && updatedUser.user) {
            // Send welcome email
            const displayName = updatedUser.user.user_metadata?.display_name || "";
            await sendWelcomeEmail(updatedUser.user.email!, displayName, adminClient);
            results.push({ id, success: true });
          } else {
            results.push({ id, success: false, error: updateError?.message });
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : "Unknown error";
          results.push({ id, success: false, error: errorMessage });
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, results }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle single user verification
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    );

    if (updateError) {
      console.error("Error verifying user:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send welcome email
    if (updatedUser.user) {
      const displayName = updatedUser.user.user_metadata?.display_name || "";
      await sendWelcomeEmail(updatedUser.user.email!, displayName, adminClient);
    }

    console.log("User verified successfully:", userId);

    return new Response(
      JSON.stringify({ success: true, user: updatedUser.user }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in admin-verify-user:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
