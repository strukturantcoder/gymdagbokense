import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Garmin OAuth2 token endpoint
const GARMIN_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/token";

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
      return new Response(
        JSON.stringify({ error: "Garmin API credentials not configured" }),
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
      return new Response(
        JSON.stringify({ error: "Invalid state parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange authorization code for access token
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: tempData.redirect_uri || "",
      code_verifier: tempData.code_verifier || "",
    });

    // Create Basic auth header
    const credentials = btoa(`${clientId}:${clientSecret}`);

    console.log("Exchanging code for token...");

    const tokenResponse = await fetch(GARMIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Garmin token exchange error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to exchange code for token", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "No access token in response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Token exchange successful for user:", user.id);

    // Store the access token (using existing fields)
    // oauth_token = access_token, oauth_token_secret = refresh_token for OAuth2
    await supabase.from("garmin_connections").upsert({
      user_id: user.id,
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
