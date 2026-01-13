import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This endpoint handles Activity Files notifications from Garmin
// Called when activity files (like FIT files) are available for download
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    
    console.log("Garmin activity files webhook received:", JSON.stringify(body));
    
    // Process activity files notifications
    const activityFiles = body.activityFiles || [];
    
    for (const fileInfo of activityFiles) {
      const userAccessToken = fileInfo.userAccessToken;
      const activityId = fileInfo.activityId?.toString();
      const callbackURL = fileInfo.callbackURL;
      
      if (!userAccessToken || !activityId) continue;
      
      // Find the user by their access token
      const { data: connection, error: findError } = await supabase
        .from("garmin_connections")
        .select("id, user_id")
        .eq("oauth_token", userAccessToken)
        .eq("is_active", true)
        .maybeSingle();
      
      if (findError || !connection) {
        console.log("No active connection found for token");
        continue;
      }
      
      // Log that we received file notification
      // In a production app, you might want to download and store the FIT file
      console.log(`Activity file available for user ${connection.user_id}, activity ${activityId}`);
      console.log(`Callback URL: ${callbackURL}`);
      
      // Get existing activity and update with file info
      const { data: existingActivity } = await supabase
        .from("garmin_activities")
        .select("raw_data")
        .eq("garmin_activity_id", activityId)
        .eq("user_id", connection.user_id)
        .maybeSingle();
      
      if (existingActivity) {
        const updatedRawData = {
          ...(existingActivity.raw_data as object || {}),
          file_callback_url: callbackURL,
          files_available: true,
        };
        
        await supabase
          .from("garmin_activities")
          .update({ raw_data: updatedRawData })
          .eq("garmin_activity_id", activityId)
          .eq("user_id", connection.user_id);
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
    console.error("Error processing Garmin activity files:", err);
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
