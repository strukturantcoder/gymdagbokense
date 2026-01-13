import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GARMIN_CLIENT_ID");
    const clientSecret = Deno.env.get("GARMIN_CLIENT_SECRET");

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

    // Get stored PKCE data
    const { data: tempToken, error: tempError } = await supabase
      .from("garmin_oauth_temp")
      .select("code_verifier, state, redirect_uri")
      .eq("user_id", user.id)
      .single();

    if (tempError || !tempToken) {
      console.error("Temp token error:", tempError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired OAuth session" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify state matches
    if (tempToken.state !== state) {
      return new Response(
        JSON.stringify({ error: "State mismatch - possible CSRF attack" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 2: Access Token Request per Garmin spec
    // URL (POST) https://diauth.garmin.com/di-oauth2-service/oauth/token
    // Parameters sent as form body (NOT Basic auth header)
    const tokenUrl = "https://diauth.garmin.com/di-oauth2-service/oauth/token";

    const formBody = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      code_verifier: tempToken.code_verifier,
    });

    // Only include redirect_uri if it was used in Step 1
    if (tempToken.redirect_uri) {
      formBody.set("redirect_uri", tempToken.redirect_uri);
    }

    console.log("Exchanging code for token at:", tokenUrl);
    console.log("Using redirect_uri:", tempToken.redirect_uri);

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Garmin token error:", tokenResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to exchange code for token", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("Token response received successfully");

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: "No access token in response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate token expiry
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null;

    // Store the access token
    const { error: upsertError } = await supabase.from("garmin_connections").upsert({
      user_id: user.id,
      oauth_token: accessToken,
      oauth_token_secret: refreshToken || "",
      connected_at: new Date().toISOString(),
      is_active: true,
    }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Error storing connection:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to store connection" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up temp token
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
