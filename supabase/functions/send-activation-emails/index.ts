import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CTA_URL = "https://gymdagboken.se/dashboard?start=forsta-passet";

interface Step {
  emailType: string;
  subject: string;
  body: string;
  buttonText: string;
}

const STEPS: Record<number, Step> = {
  1: {
    emailType: "activation_day1",
    subject: "Ditt första pass ligger och väntar",
    body: "Passet är redan förberett åt dig. Fyra övningar, ingen utrustning, ungefär tio minuter. Du behöver inte välja något själv, bara trycka på knappen och köra.",
    buttonText: "Kör passet nu",
  },
  3: {
    emailType: "activation_day3",
    subject: "Tio minuter, fyra övningar",
    body: "Du behöver varken gym eller utrustning för att komma igång. Tio minuter hemma räcker. Har du redan tränat någon annanstans kan du logga det passet i stället.",
    buttonText: "Öppna passet",
  },
  7: {
    emailType: "activation_day7",
    subject: "Sista påminnelsen från oss",
    body: "Det här är sista påminnelsen vi skickar. Vi vill inte fylla din inkorg i onödan. Passet ligger kvar och väntar den dag du vill köra det.",
    buttonText: "Kör passet nu",
  },
};

function buildHtml(displayName: string, body: string, buttonText: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f97316; margin: 0;">Gymdagboken</h1>
  </div>

  <h2 style="color: #1a1a1a;">Hej ${displayName}!</h2>

  <p>${body}</p>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${CTA_URL}"
       style="display: inline-block; background: linear-gradient(135deg, #f97316, #fb923c); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
      ${buttonText}
    </a>
  </div>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #999; font-size: 12px; text-align: center;">
    Detta mejl skickades från Gymdagboken.
  </p>
</body>
</html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Gymdagboken <noreply@gymdagboken.se>",
      to: [to],
      subject,
      html,
    }),
  });
  return await response.json();
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SEND-ACTIVATION-EMAILS] Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const since = new Date();
    since.setDate(since.getDate() - 8);

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name, created_at")
      .gte("created_at", since.toISOString());

    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No new users", sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userIds = profiles.map((p) => p.user_id);

    const [workouts, cardio, wods, prefs, logs] = await Promise.all([
      supabase.from("workout_logs").select("user_id").in("user_id", userIds),
      supabase.from("cardio_logs").select("user_id").in("user_id", userIds),
      supabase.from("wod_logs").select("user_id").in("user_id", userIds),
      supabase
        .from("notification_preferences")
        .select("user_id, workout_reminders")
        .in("user_id", userIds),
      supabase
        .from("email_logs")
        .select("user_id, email_type")
        .in("user_id", userIds)
        .in("email_type", ["activation_day1", "activation_day3", "activation_day7"]),
    ]);

    const hasLogged = new Set<string>([
      ...(workouts.data || []).map((r) => r.user_id),
      ...(cardio.data || []).map((r) => r.user_id),
      ...(wods.data || []).map((r) => r.user_id),
    ]);

    const optedOut = new Set(
      (prefs.data || []).filter((p) => p.workout_reminders === false).map((p) => p.user_id),
    );

    const alreadySent = new Set(
      (logs.data || []).map((l) => `${l.user_id}:${l.email_type}`),
    );

    const now = Date.now();
    const candidates: { userId: string; displayName: string; step: Step }[] = [];

    for (const profile of profiles) {
      if (hasLogged.has(profile.user_id) || optedOut.has(profile.user_id)) continue;
      const days = Math.floor(
        (now - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      const step = STEPS[days];
      if (!step) continue;
      if (alreadySent.has(`${profile.user_id}:${step.emailType}`)) continue;
      candidates.push({
        userId: profile.user_id,
        displayName: profile.display_name || "träningsentusiast",
        step,
      });
    }

    console.log(`[SEND-ACTIVATION-EMAILS] ${candidates.length} candidates`);

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ message: "Nothing to send", sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;
    const emails = new Map(authData.users.map((u) => [u.id, u.email]));

    let sent = 0;
    let failed = 0;

    for (const candidate of candidates) {
      const email = emails.get(candidate.userId);
      if (!email) continue;

      const { emailType, subject, body, buttonText } = candidate.step;
      try {
        const result = await sendEmail(
          email,
          subject,
          buildHtml(candidate.displayName, body, buttonText),
        );
        if (result?.error) throw new Error(result.error.message);

        await supabase.from("email_logs").insert({
          user_id: candidate.userId,
          email,
          email_type: emailType,
          subject,
          status: "sent",
        });
        sent++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[SEND-ACTIVATION-EMAILS] Failed for ${candidate.userId}:`, message);
        await supabase.from("email_logs").insert({
          user_id: candidate.userId,
          email,
          email_type: emailType,
          subject,
          status: "failed",
          error_message: message,
        });
        failed++;
      }
    }

    console.log(`[SEND-ACTIVATION-EMAILS] Done: ${sent} sent, ${failed} failed`);

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[SEND-ACTIVATION-EMAILS] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
