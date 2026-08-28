import { supabase } from "@/integrations/supabase/client";

type AdEventType = "impression" | "click";

const restUrl = () => `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/ad_stats`;
const apiKey = () => import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Track an ad event reliably, even when the browser is navigating away.
 * Uses sendBeacon for anonymous visitors and keepalive fetch with the JWT
 * for signed-in users (their inserts need the user's token).
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

  if (userId) {
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
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
    });
    return;
  }

  const sent =
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function" &&
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));

  if (!sent) {
    fetch(url, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey(),
        Prefer: "return=minimal",
      },
      body,
    }).catch((err) => console.error(`Error tracking ${eventType}:`, err));
  }
};
