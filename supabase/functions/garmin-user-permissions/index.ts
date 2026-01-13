import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This endpoint handles User Permission change notifications from Garmin
// Called when a user changes their data sharing permissions
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    
    console.log("Garmin permissions webhook received:", JSON.stringify(body));
    
    // Garmin sends permission updates when users change their data sharing settings
    const permissionUpdates = body.permissions || body.userPermissions || [];
    
    for (const update of permissionUpdates) {
      const userAccessToken = update.userAccessToken;
      const permissions = update.permissions || {};
      
      if (!userAccessToken) continue;
      
      // Find the connection by oauth_token
      const { data: connection, error: findError } = await supabase
        .from("garmin_connections")
        .select("id, user_id")
        .eq("oauth_token", userAccessToken)
        .eq("is_active", true)
        .maybeSingle();
      
      if (!findError && connection) {
        // Log permission changes for debugging
        console.log("Permission update for user:", connection.user_id, "Permissions:", permissions);
        
        // If activities permission is revoked, we should note this
        if (permissions.activities === false) {
          await supabase
            .from("notifications")
            .insert({
              user_id: connection.user_id,
              type: "garmin_permissions_changed",
              title: "Garmin-behörigheter ändrade",
              message: "Du har ändrat dina delningsinställningar i Garmin. Vissa data kanske inte längre synkroniseras.",
            });
        }
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
    console.error("Error processing Garmin permissions:", err);
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
