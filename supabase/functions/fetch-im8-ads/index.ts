import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('IM8_API_KEY');
    const networkId = Deno.env.get('IM8_NETWORK_ID');

    if (!apiKey || !networkId) {
      throw new Error('IM8 API credentials not configured');
    }

    const { format = 'banner', placement = 'default' } = await req.json().catch(() => ({}));

    // IM8/TUNE API endpoint for fetching offers/ads
    const apiUrl = `https://${networkId}.go2cloud.org/aff_ad`;
    
    // Fetch available campaigns/ads
    const response = await fetch(`${apiUrl}?campaign_id=9&aff_id=1814&format=json`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // If JSON endpoint doesn't work, return the embed code for client-side rendering
      return new Response(
        JSON.stringify({
          success: true,
          type: 'embed',
          data: {
            scriptSrc: `https://${networkId}.go2cloud.org/aff_ad?campaign_id=9&aff_id=1814&format=js&divid=im8-ad-container`,
            iframeSrc: `https://${networkId}.go2cloud.org/aff_ad?campaign_id=9&aff_id=1814&format=iframe`,
            divId: 'im8-ad-container',
            format,
            placement,
          },
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        type: 'data',
        data,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching IM8 ads:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        // Fallback embed data
        fallback: {
          type: 'embed',
          data: {
            scriptSrc: 'https://im8.go2cloud.org/aff_ad?campaign_id=9&aff_id=1814&format=js&divid=im8-ad-container',
            iframeSrc: 'https://im8.go2cloud.org/aff_ad?campaign_id=9&aff_id=1814&format=iframe',
            divId: 'im8-ad-container',
          },
        },
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 with fallback
      }
    );
  }
});
