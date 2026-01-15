import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Garmin OAuth2 token endpoint (from official documentation)
const GARMIN_TOKEN_URL = "https://diauth.garmin.com/di-oauth2-service/oauth/token";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Garmin credentials: prefer CONSUMER_* but fall back to CLIENT_* (some projects used these names)
    const consumerKey = Deno.env.get("GARMIN_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("GARMIN_CONSUMER_SECRET");
    const altClientId = Deno.env.get("GARMIN_CLIENT_ID");
    const altClientSecret = Deno.env.get("GARMIN_CLIENT_SECRET");

    const clientId = consumerKey || altClientId;
    const clientSecret = consumerSecret || altClientSecret;

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({
          error: "Garmin API credentials not configured",
          details: {
            hasConsumerKey: !!consumerKey,
            hasConsumerSecret: !!consumerSecret,
            hasAltClientId: !!altClientId,
            hasAltClientSecret: !!altClientSecret,
          },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { code, state } = await req.json();

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: "Missing authorization code or state" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received callback with code and state for user:", user.id);

    // Get the stored code verifier and validate state
    const { data: tempData, error: tempError } = await supabase
      .from("garmin_oauth_temp")
      .select("code_verifier, state, redirect_uri")
      .eq("user_id", user.id)
      .single();

    if (tempError || !tempData) {
      console.error("Failed to get temp OAuth data:", tempError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired OAuth session" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate state to prevent CSRF attacks
    if (tempData.state !== state) {
      console.error("State mismatch:", { expected: tempData.state, received: state });
      return new Response(
        JSON.stringify({ error: "Invalid state parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange authorization code for access token
    // Per Garmin spec: grant_type, client_id, client_secret, code, code_verifier are required
    // redirect_uri required if used in step 1

    const exchangeToken = async (id: string, secret: string) => {
      const tokenParams = new URLSearchParams({
        grant_type: "authorization_code",
        client_id: id,
        client_secret: secret,
        code: code,
        code_verifier: tempData.code_verifier || "",
        redirect_uri: tempData.redirect_uri || "",
      });

      return await fetch(GARMIN_TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenParams.toString(),
      });
    };

    console.log("Exchanging code for token at:", GARMIN_TOKEN_URL);

    let tokenResponse = await exchangeToken(clientId, clientSecret);

    // If Garmin says Unauthorized, retry once with alternate env var pair (if configured)
    if (!tokenResponse.ok && tokenResponse.status === 401 && altClientId && altClientSecret) {
      console.warn("Garmin token exchange 401 - retrying with GARMIN_CLIENT_ID/SECRET");
      tokenResponse = await exchangeToken(altClientId, altClientSecret);
    }

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Garmin token exchange error:", tokenResponse.status, errorText);
      const hint = tokenResponse.status === 401
        ? "Unauthorized: kontrollera GARMIN_CONSUMER_SECRET (eller GARMIN_CLIENT_SECRET)"
        : "";
      return new Response(
        JSON.stringify({
          error: "Failed to exchange code for token",
          status: tokenResponse.status,
          hint,
          details: errorText,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;
    const refreshTokenExpiresIn = tokenData.refresh_token_expires_in;

    if (!accessToken) {
      console.error("No access token in response:", tokenData);
      return new Response(
        JSON.stringify({ error: "No access token in response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Token exchange successful for user:", user.id);
    console.log("Access token expires in:", expiresIn, "seconds");

    // Fetch user ID from Garmin API
    let garminUserId = null;
    try {
      const userIdResponse = await fetch("https://apis.garmin.com/wellness-api/rest/user/id", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });
      
      if (userIdResponse.ok) {
        const userIdData = await userIdResponse.json();
        garminUserId = userIdData.userId;
        console.log("Fetched Garmin User ID:", garminUserId);
      } else {
        console.error("Failed to fetch Garmin user ID:", userIdResponse.status, await userIdResponse.text());
      }
    } catch (error) {
      console.error("Failed to fetch Garmin user ID:", error);
    }

    // Store the access token
    // oauth_token = access_token, oauth_token_secret = refresh_token for OAuth2
    await supabase.from("garmin_connections").upsert({
      user_id: user.id,
      garmin_user_id: garminUserId,
      oauth_token: accessToken,
      oauth_token_secret: refreshToken || "",
      connected_at: new Date().toISOString(),
      is_active: true,
    }, { onConflict: "user_id" });

    // Clean up temp data
    await supabase.from("garmin_oauth_temp").delete().eq("user_id", user.id);

    return new Response(
      JSON.stringify({ success: true, message: "Garmin connected successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in garmin-oauth-callback:", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
