import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64UrlEncode } from "https://deno.land/std@0.208.0/encoding/base64url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Garmin OAuth2 PKCE endpoints (from official documentation)
const GARMIN_AUTHORIZE_URL = "https://connect.garmin.com/oauth2Confirm";

// Generate a random code verifier for PKCE (43-128 chars, A-Z, a-z, 0-9, -, ., _, ~)
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

// Generate code challenge from verifier (S256 method)
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

// Generate a random state parameter
function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Garmin credentials: prefer CONSUMER_* but fall back to CLIENT_* (some projects used these names)
    const consumerKey = Deno.env.get("GARMIN_CONSUMER_KEY");
    const altClientId = Deno.env.get("GARMIN_CLIENT_ID");
    const clientId = consumerKey || altClientId;

    if (!clientId) {
      return new Response(
        JSON.stringify({
          error: "Garmin API credentials not configured",
          details: { hasConsumerKey: !!consumerKey, hasAltClientId: !!altClientId },
        }),
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

    const { callbackUrl } = await req.json();

    // OAuth2 PKCE - Generate code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    console.log("Generated PKCE params for user:", user.id);
    console.log("Code verifier length:", codeVerifier.length);
    console.log("Redirect URI:", callbackUrl);

    // Store the code verifier and state for the callback
    // NOTE: We set a generous expiry to avoid users timing out while authorizing in Garmin.
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await supabase.from("garmin_oauth_temp").upsert(
      {
        user_id: user.id,
        oauth_token: state, // Using oauth_token field to store state
        oauth_token_secret: codeVerifier, // Using oauth_token_secret to store code_verifier
        code_verifier: codeVerifier,
        state: state,
        redirect_uri: callbackUrl,
        expires_at: expiresAt,
      },
      { onConflict: "user_id" }
    );

    // Build the authorization URL with OAuth2 PKCE parameters
    // Per Garmin spec: response_type, client_id, code_challenge, code_challenge_method are required
    // redirect_uri and state are optional
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      redirect_uri: callbackUrl,
      state: state,
    });

    const authorizeUrl = `${GARMIN_AUTHORIZE_URL}?${params.toString()}`;

    console.log("Authorization URL generated:", authorizeUrl);

    return new Response(
      JSON.stringify({ authorizeUrl }),
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
