import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID header generation for Web Push
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateVapidHeaders(endpoint: string, vapidPublicKey: string, vapidPrivateKey: string) {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;
  
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: 'mailto:push@gymdagboken.se'
  };

  const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const privateKeyBase64 = vapidPrivateKey.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - privateKeyBase64.length % 4) % 4);
  const privateKeyBytes = Uint8Array.from(atob(privateKeyBase64 + padding), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureBytes = new Uint8Array(signature);
  const jwt = `${unsignedToken}.${base64UrlEncode(signatureBytes)}`;

  return {
    Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    'Content-Type': 'application/json',
    TTL: '86400'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();

    // Fetch active goals with reminders enabled
    const { data: goalsWithReminders, error: goalsError } = await supabase
      .from('user_goals')
      .select('id, user_id, title, reminder_frequency, last_reminder_sent')
      .eq('status', 'active')
      .eq('reminder_enabled', true);

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
      throw goalsError;
    }

    console.log(`Found ${goalsWithReminders?.length || 0} goals with reminders enabled`);

    const goalsToRemind: typeof goalsWithReminders = [];

    for (const goal of goalsWithReminders || []) {
      const lastSent = goal.last_reminder_sent ? new Date(goal.last_reminder_sent) : null;
      let shouldRemind = false;

      if (!lastSent) {
        shouldRemind = true;
      } else {
        const hoursSinceLastReminder = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        
        switch (goal.reminder_frequency) {
          case 'daily':
            shouldRemind = hoursSinceLastReminder >= 24;
            break;
          case 'weekly':
            shouldRemind = hoursSinceLastReminder >= 168; // 7 * 24
            break;
          case 'monthly':
            shouldRemind = hoursSinceLastReminder >= 720; // 30 * 24
            break;
          default:
            shouldRemind = false;
        }
      }

      if (shouldRemind) {
        goalsToRemind.push(goal);
      }
    }

    console.log(`${goalsToRemind.length} goals need reminders`);

    let sentCount = 0;
    const userGoalsMap = new Map<string, typeof goalsToRemind>();

    // Group goals by user
    for (const goal of goalsToRemind) {
      const existing = userGoalsMap.get(goal.user_id) || [];
      existing.push(goal);
      userGoalsMap.set(goal.user_id, existing);
    }

    // Send notifications per user
    for (const [userId, userGoals] of userGoalsMap.entries()) {
      // Fetch push subscriptions for this user
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('user_id', userId);

      if (subError || !subscriptions?.length) {
        console.log(`No push subscriptions for user ${userId}`);
        continue;
      }

      // Check notification preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('push_enabled, workout_reminders')
        .eq('user_id', userId)
        .single();

      if (prefs && (!prefs.push_enabled || !prefs.workout_reminders)) {
        console.log(`User ${userId} has disabled workout reminders`);
        continue;
      }

      const goalTitles = userGoals.map(g => g.title).join(', ');
      const payload = JSON.stringify({
        title: '🎯 Målpåminnelse',
        body: userGoals.length === 1 
          ? `Glöm inte ditt mål: ${goalTitles}` 
          : `Du har ${userGoals.length} aktiva mål att följa upp!`,
        url: '/dashboard'
      });

      for (const sub of subscriptions) {
        try {
          const headers = await generateVapidHeaders(sub.endpoint, vapidPublicKey, vapidPrivateKey);
          
          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers,
            body: payload
          });

          if (response.status === 410 || response.status === 404) {
            // Subscription expired, delete it
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint);
            console.log('Deleted expired subscription');
          } else if (response.ok) {
            sentCount++;
            console.log(`Sent reminder to user ${userId}`);
          }
        } catch (pushError) {
          console.error('Push error:', pushError);
        }
      }

      // Update last_reminder_sent for all goals
      for (const goal of userGoals) {
        await supabase
          .from('user_goals')
          .update({ last_reminder_sent: now.toISOString() })
          .eq('id', goal.id);
      }
    }

    console.log(`Successfully sent ${sentCount} goal reminders`);

    return new Response(
      JSON.stringify({ success: true, sentCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in send-goal-reminders:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
