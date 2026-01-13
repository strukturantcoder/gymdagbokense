import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This endpoint handles User Deregistration notifications from Garmin
// Called when a user revokes access or deletes their Garmin account
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    
    console.log("Garmin deregistration webhook received:", JSON.stringify(body));
    
    // Garmin sends deregistration notifications with user access tokens
    const deregistrations = body.deregistrations || body.userAccessTokens || [];
    
    for (const deregistration of deregistrations) {
      const userAccessToken = deregistration.userAccessToken || deregistration;
      
      if (!userAccessToken) continue;
      
      // Find and deactivate the connection by oauth_token
      const { data: connection, error: findError } = await supabase
        .from("garmin_connections")
        .select("id, user_id")
        .eq("oauth_token", userAccessToken)
        .eq("is_active", true)
        .maybeSingle();
      
      if (!findError && connection) {
        // Deactivate the connection
        await supabase
          .from("garmin_connections")
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq("id", connection.id);
        
        // Create a notification for the user
        await supabase
          .from("notifications")
          .insert({
            user_id: connection.user_id,
            type: "garmin_disconnected",
            title: "Garmin frånkopplat",
            message: "Din Garmin-koppling har tagits bort. Om detta inte var avsiktligt kan du koppla om igen.",
          });
        
        console.log("Deregistered Garmin connection for user:", connection.user_id);
      }
    }
    
    // IMPORTANT: Always return 200 quickly per Garmin requirements
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    console.error("Error processing Garmin deregistration:", err);
    // Still return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
