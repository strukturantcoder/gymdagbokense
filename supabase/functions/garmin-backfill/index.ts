import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CHUNK_DAYS = 90; // Garmin allows max 90 days per backfill request
const MAX_HISTORY_DAYS = 730; // Guard: max 2 years back

async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const response = await fetch("https://diauth.garmin.com/di-oauth2-service/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    });
    if (!response.ok) {
      console.error("Token refresh failed:", response.status, await response.text());
      return null;
    }
    const data = await response.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token || refreshToken };
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GARMIN_CONSUMER_KEY");
    const clientSecret = Deno.env.get("GARMIN_CONSUMER_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Garmin API credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: connection } = await supabase
      .from("garmin_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!connection) {
      return new Response(JSON.stringify({ error: "Garmin not connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = connection.oauth_token as string;
    const refreshToken = connection.oauth_token_secret as string;

    let startDate: string | undefined;
    let endDate: string | undefined;
    try {
      const body = await req.json();
      startDate = body?.startDate;
      endDate = body?.endDate;
    } catch {
      // no body -> defaults below
    }

    const now = Date.now();
    let endTs = Math.floor((endDate ? new Date(endDate + "T23:59:59Z").getTime() : now) / 1000);
    let startTs = Math.floor(
      (startDate ? new Date(startDate + "T00:00:00Z").getTime() : now - 30 * 86400_000) / 1000
    );

    if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) {
      return new Response(JSON.stringify({ error: "Ogiltigt datumintervall" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowTs = Math.floor(now / 1000);
    endTs = Math.min(endTs, nowTs);
    startTs = Math.max(startTs, nowTs - MAX_HISTORY_DAYS * 86400);
    if (startTs >= endTs) {
      return new Response(JSON.stringify({ error: "Startdatum måste vara före slutdatum" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requested: string[] = [];
    const failures: string[] = [];
    let cursor = startTs;

    while (cursor < endTs) {
      const chunkEnd = Math.min(cursor + MAX_CHUNK_DAYS * 86400, endTs);
      const url =
        `https://apis.garmin.com/wellness-api/rest/backfill/activities` +
        `?summaryStartTimeInSeconds=${cursor}&summaryEndTimeInSeconds=${chunkEnd}`;

      console.log("Requesting Garmin backfill:", url);

      let response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 401 && refreshToken) {
        const newTokens = await refreshAccessToken(refreshToken, clientId, clientSecret);
        if (newTokens) {
          await supabase
            .from("garmin_connections")
            .update({
              oauth_token: newTokens.accessToken,
              oauth_token_secret: newTokens.refreshToken,
            })
            .eq("user_id", user.id);
          accessToken = newTokens.accessToken;
          response = await fetch(url, {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
        }
      }

      // 202 Accepted = backfill queued, data arrives via webhook.
      // 409 Conflict = already requested for this period, treat as success.
      if (response.ok || response.status === 202 || response.status === 409) {
        requested.push(`${cursor}-${chunkEnd}`);
      } else {
        const text = await response.text();
        console.error("Garmin backfill error:", response.status, text);
        failures.push(`${response.status}: ${text.substring(0, 200)}`);
        if (response.status === 401) {
          return new Response(
            JSON.stringify({ error: "Garmin-token har gått ut. Koppla om ditt konto." }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      cursor = chunkEnd;
    }

    return new Response(
      JSON.stringify({
        success: failures.length === 0,
        chunksRequested: requested.length,
        failures,
        startDate: new Date(startTs * 1000).toISOString().split("T")[0],
        endDate: new Date(endTs * 1000).toISOString().split("T")[0],
        message:
          failures.length === 0
            ? "Historik begärd från Garmin. Aktiviteterna dyker upp inom några minuter."
            : "Delar av historiken kunde inte begäras från Garmin.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in garmin-backfill:", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
