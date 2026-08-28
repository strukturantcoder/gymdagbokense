import { supabase } from "@/integrations/supabase/client";

type AdEventType = "impression" | "click";

const restUrl = () => `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/ad_stats`;
const apiKey = () => import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Track an ad event reliably, even when the browser is navigating away.
 * Uses fetch with keepalive for everyone; signed-in users additionally send
 * their JWT. sendBeacon is intentionally not used: it cannot set headers and
 * fails the CORS preflight against the REST endpoint (silently dropped).
 */
export const trackAdEvent = (
  adId: string,
  eventType: AdEventType,
  userId?: string | null,
) => {
  const url = `${restUrl()}?apikey=${apiKey()}`;
  const body = JSON.stringify({
    ad_id: adId,
    event_type: eventType,
    user_id: userId ?? null,
  });

  const send = (token?: string) => {
    fetch(url, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        Prefer: "return=minimal",
      },
      body,
    }).catch((err) => console.error(`Error tracking ${eventType}:`, err));
  };

  if (userId) {
    supabase.auth
      .getSession()
      .then(({ data }) => send(data.session?.access_token))
      .catch(() => send());
    return;
  }

  send();
};

