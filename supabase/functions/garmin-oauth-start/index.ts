import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64UrlEncode } from "https://deno.land/std@0.208.0/encoding/base64url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a code verifier using allowed characters: A-Z, a-z, 0-9, -._~
// Length: 43-128 characters
function generateCodeVerifier(): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const length = 50; // 50 characters
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  let verifier = "";
  for (let i = 0; i < length; i++) {
    verifier += charset[array[i] % charset.length];
  }
  return verifier;
}

// Generate code challenge from verifier (S256 method)
// BASE64-URL-encoded SHA256 hash of the code verifier
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

// Generate random state for CSRF protection
function generateState(): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const length = 32;
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  let state = "";
  for (let i = 0; i < length; i++) {
    state += charset[array[i] % charset.length];
  }
  return state;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GARMIN_CLIENT_ID");

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "Garmin Client ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authenticate user
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

    // Garmin's official redirect URI for OAuth 2.0
    const garminRedirectUri = "https://apis.garmin.com/tools/oauth2/confirmUser";

    // OAuth 2.0 with PKCE - Generate verifier, challenge, and state
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    // Store PKCE verifier, state, and redirect_uri for callback verification
    await supabase.from("garmin_oauth_temp").upsert({
      user_id: user.id,
      oauth_token: state,
      oauth_token_secret: codeVerifier,
      code_verifier: codeVerifier,
      state: state,
      redirect_uri: garminRedirectUri,
    }, { onConflict: "user_id" });

    // Build OAuth 2.0 authorization URL (matching Garmin's expected format exactly)
    const authorizeUrl = new URL("https://connect.garmin.com/oauth2Confirm");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("redirect_uri", garminRedirectUri);
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    console.log("Generated OAuth 2.0 authorization URL for user:", user.id);

    return new Response(
      JSON.stringify({ authorizeUrl: authorizeUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in garmin-oauth-start:", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
