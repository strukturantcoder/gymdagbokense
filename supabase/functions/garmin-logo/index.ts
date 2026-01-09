import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Returns a deterministic 300x300 image for Garmin branding requirements.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use the public asset as the source-of-truth (no auth required).
    const origin = new URL(req.url).origin;
    const sourceUrl = `${origin}/logo-garmin.png`;

    const res = await fetch(sourceUrl, {
      // Avoid any cached oversize response during iterative changes
      cache: "no-store",
    });

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Could not fetch source image (${res.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    const img = await Image.decode(bytes);

    // Force exact output dimensions.
    const resized = img.resize(300, 300);

    // Encode to PNG (Garmin typically accepts PNG/JPG; PNG keeps crisp edges).
    // ImageScript's encode() outputs PNG bytes.
    const pngBytes = await resized.encode();

    return new Response(pngBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        // Cache so Garmin can fetch reliably
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("garmin-logo error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
