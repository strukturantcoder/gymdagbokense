import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OAuth 1.0a helper functions
function generateNonce(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

function createSignatureBaseString(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");

  return `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(sortedParams)}`;
}

async function createSignature(
  baseString: string,
  consumerSecret: string,
  tokenSecret: string = ""
): Promise<string> {
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(baseString));
  return base64Encode(signature);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const consumerKey = Deno.env.get("GARMIN_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("GARMIN_CONSUMER_SECRET");

    if (!consumerKey || !consumerSecret) {
      return new Response(
        JSON.stringify({ error: "Garmin API credentials not configured" }),
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

    // Garmin OAuth 1.0a - Step 1: Get Request Token
    const requestTokenUrl = "https://connectapi.garmin.com/oauth-service/oauth/request_token";
    const nonce = generateNonce();
    const timestamp = generateTimestamp();

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: consumerKey,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: "1.0",
      oauth_callback: callbackUrl,
    };

    const baseString = createSignatureBaseString("POST", requestTokenUrl, oauthParams);
    const signature = await createSignature(baseString, consumerSecret);
    oauthParams.oauth_signature = signature;

    const authHeaderValue = "OAuth " + Object.keys(oauthParams)
      .map((key) => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
      .join(", ");

    const response = await fetch(requestTokenUrl, {
      method: "POST",
      headers: {
        Authorization: authHeaderValue,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Garmin request token error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get request token from Garmin", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseText = await response.text();
    const tokenParams = new URLSearchParams(responseText);
    const oauthToken = tokenParams.get("oauth_token");
    const oauthTokenSecret = tokenParams.get("oauth_token_secret");

    if (!oauthToken || !oauthTokenSecret) {
      return new Response(
        JSON.stringify({ error: "Invalid response from Garmin" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store temporary token for callback verification
    await supabase.from("garmin_oauth_temp").upsert({
      user_id: user.id,
      oauth_token: oauthToken,
      oauth_token_secret: oauthTokenSecret,
    }, { onConflict: "user_id" });

    // Return authorization URL
    const authorizeUrl = `https://connect.garmin.com/oauthConfirm?oauth_token=${oauthToken}`;

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
