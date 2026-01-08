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
    const token = Deno.env.get('TRADEDOUBLER_API_TOKEN');
    
    if (!token) {
      console.error('TRADEDOUBLER_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { page = 1, pageSize = 10, category } = await req.json().catch(() => ({}));

    // Tradedoubler uses token directly in URL as query parameter
    // Feed ID 20966 - fitness/supplement products
    const url = `https://api.tradedoubler.com/1.0/products.json;page=${page};pageSize=${pageSize};fid=20966?token=${token}`;

    console.log('Fetching products from Tradedoubler...');
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
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