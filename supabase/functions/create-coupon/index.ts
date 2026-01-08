import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    
    const userId = userData.user?.id;
    if (!userId) throw new Error("User not found");

    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (!roleData) throw new Error("Unauthorized - admin only");

    const { name, percent_off, amount_off, duration, duration_in_months } = await req.json();
    
    if (!name) throw new Error("Name is required");
    if (!percent_off && !amount_off) throw new Error("Either percent_off or amount_off is required");
    if (percent_off && amount_off) throw new Error("Cannot specify both percent_off and amount_off");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const couponParams: Stripe.CouponCreateParams = {
      name,
      duration: duration || 'once',
    };

    if (percent_off) {
      couponParams.percent_off = percent_off;
    } else if (amount_off) {
      couponParams.amount_off = amount_off;
      couponParams.currency = 'sek';
    }

    if (duration === 'repeating' && duration_in_months) {
      couponParams.duration_in_months = duration_in_months;
    }

    const coupon = await stripe.coupons.create(couponParams);

    return new Response(
      JSON.stringify({ 
        success: true,
        coupon: {
          id: coupon.id,
          name: coupon.name,
          percent_off: coupon.percent_off,
          amount_off: coupon.amount_off,
          duration: coupon.duration,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
