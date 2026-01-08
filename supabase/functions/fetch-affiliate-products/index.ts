import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('TRADEDOUBLER_API_TOKEN');
    const clientSecret = Deno.env.get('TRADEDOUBLER_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      console.error('Tradedoubler credentials not configured');
      return new Response(
        JSON.stringify({ error: 'API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { page = 1, pageSize = 10, category } = await req.json().catch(() => ({}));

    // Step 1: Get OAuth2 access token
    console.log('Getting OAuth2 access token from Tradedoubler...');
    const tokenResponse = await fetch('https://connect.tradedoubler.com/uaa/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => '');
      console.error('OAuth2 token error:', tokenResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to authenticate with Tradedoubler',
          details: errorText.slice(0, 200)
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('No access token in response:', tokenData);
      return new Response(
        JSON.stringify({ error: 'No access token received' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Fetch products using the access token
    // Feed ID 20966 - fitness/supplement products
    const baseUrl = `https://api.tradedoubler.com/1.0/products.json;page=${page};pageSize=${pageSize};fid=20966`;

    console.log('Fetching products from Tradedoubler...');
    const response = await fetch(baseUrl, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'LovableCloud/affiliate-products',
      },
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      console.error('Tradedoubler API error:', response.status, bodyText.slice(0, 500));
      return new Response(
        JSON.stringify({
          error: `API request failed with status ${response.status}`,
          details: bodyText ? bodyText.slice(0, 500) : undefined,
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Transform the data to a simpler format
    const products = (data.products || []).map((p: any) => ({
      id: p.productId || p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      currency: p.currency || 'SEK',
      imageUrl: p.productImage?.url || p.imageUrl,
      productUrl: p.productUrl,
      brand: p.brand,
      category: p.categories?.[0]?.name || 'Övrigt',
    }));

    console.log(`Fetched ${products.length} products`);

    return new Response(
      JSON.stringify({ products, total: data.totalProducts || products.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching affiliate products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});