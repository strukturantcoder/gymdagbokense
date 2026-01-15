import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const results: Record<string, { ok: boolean; message: string }> = {};

  try {
    // 1. Check Garmin credentials
    const clientId = Deno.env.get("GARMIN_CONSUMER_KEY");
    const clientSecret = Deno.env.get("GARMIN_CONSUMER_SECRET");

    if (!clientId) {
      results.credentials = { ok: false, message: "GARMIN_CONSUMER_KEY saknas" };
    } else if (!clientSecret) {
      results.credentials = { ok: false, message: "GARMIN_CONSUMER_SECRET saknas" };
    } else {
      results.credentials = { ok: true, message: `Client ID: ${clientId.slice(0, 8)}...` };
    }

    // 2. Check Supabase connection
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      results.supabase = { ok: false, message: "Supabase-konfiguration saknas" };
    } else {
      results.supabase = { ok: true, message: "Supabase konfigurerat" };
    }

    // 3. Check user auth and temp session
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      results.auth = { ok: false, message: "Ingen Authorization header" };
    } else {
      const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        results.auth = { ok: false, message: `Autentiseringsfel: ${authError?.message || "Okänd"}` };
      } else {
        results.auth = { ok: true, message: `Användare: ${user.email}` };

        // 4. Check temp session for this user
        const { data: tempData, error: tempError } = await supabase
          .from("garmin_oauth_temp")
          .select("state, code_verifier, redirect_uri, expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (tempError) {
          results.tempSession = { ok: false, message: `Databasfel: ${tempError.message}` };
        } else if (!tempData) {
          results.tempSession = { ok: true, message: "Ingen pågående OAuth-session (normalt om du inte just startade koppling)" };
        } else {
          const expiresAt = new Date(tempData.expires_at);
          const now = new Date();
          const isExpired = expiresAt < now;

          if (isExpired) {
            results.tempSession = { ok: false, message: `OAuth-session utgången (${tempData.expires_at})` };
          } else {
            results.tempSession = {
              ok: true,
              message: `Aktiv session, state: ${tempData.state?.slice(0, 8)}..., redirect: ${tempData.redirect_uri?.slice(0, 40)}...`,
            };
          }
        }

        // 5. Check existing connection
        const { data: connData, error: connError } = await supabase
          .from("garmin_connections")
          .select("garmin_user_id, is_active, connected_at, last_sync_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (connError) {
          results.connection = { ok: false, message: `Databasfel: ${connError.message}` };
        } else if (!connData) {
          results.connection = { ok: true, message: "Ingen befintlig Garmin-koppling" };
        } else if (!connData.is_active) {
          results.connection = { ok: false, message: "Garmin-koppling finns men är inaktiv" };
        } else {
          results.connection = {
            ok: true,
            message: `Kopplad (Garmin ID: ${connData.garmin_user_id || "okänt"})`,
          };
        }
      }
    }

    const allOk = Object.values(results).every((r) => r.ok);

    return new Response(
      JSON.stringify({ success: allOk, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in garmin-test-config:", err);
    return new Response(
      JSON.stringify({ success: false, error: message, results }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
