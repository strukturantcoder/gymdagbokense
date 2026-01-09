import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Public endpoint that ALWAYS returns a 300x300 PNG (hard limit in Garmin error).
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // The function runs on a different origin than the static site.
    // Use the canonical public URL for the logo source.
    const src = `https://gymdagboken.se/logo-garmin.png`;

    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch source (${res.status})` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    const img = await Image.decode(bytes);

    // Force EXACT dimensions.
    const out = img.resize(300, 300);

    // ImageScript encode() outputs PNG bytes.
    const png = await out.encode();
    const pngBytes = new Uint8Array(png);
    const body = pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength);

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("garmin-logo error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
