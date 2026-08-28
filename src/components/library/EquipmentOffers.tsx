import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { trackAdEvent } from "@/lib/adTracking";

interface EquipmentAd {
  id: string;
  link: string;
  link_text: string | null;
  match_keywords: string[] | null;
}

interface EquipmentOffersProps {
  equipment: string | null;
}

const EquipmentOffers = ({ equipment }: EquipmentOffersProps) => {
  const { isPremium, user } = useAuth();
  const [ads, setAds] = useState<EquipmentAd[]>([]);
  const trackedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (isPremium || !equipment) return;
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("id, link, link_text, match_keywords")
        .eq("is_active", true)
        .eq("format", "equipment_link");

      if (error) {
        console.error("Error fetching equipment links:", error);
        return;
      }
      if (!cancelled) setAds((data as EquipmentAd[]) ?? []);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isPremium, equipment]);

  const matches = useMemo(() => {
    if (!equipment) return [];
    const text = equipment.toLowerCase();
    // Rank by where the first matching keyword appears in the text
    const ranked = ads
      .map((ad) => {
        const positions = (ad.match_keywords ?? [])
          .map((kw) => text.indexOf(kw.toLowerCase()))
          .filter((i) => i >= 0);
        return positions.length > 0 ? { ad, position: Math.min(...positions) } : null;
      })
      .filter((x): x is { ad: EquipmentAd; position: number } => x !== null)
      .sort((a, b) => a.position - b.position);

    return ranked.slice(0, 2).map((x) => x.ad);
  }, [ads, equipment]);

  useEffect(() => {
    if (isPremium) return;
    matches.forEach((ad) => {
      if (trackedIds.current.has(ad.id)) return;
      trackedIds.current.add(ad.id);
      trackAdEvent(ad.id, "impression", user?.id ?? null);
    });
  }, [matches, isPremium, user?.id]);

  if (isPremium || !equipment || matches.length === 0) return null;

  return (
    <section className="rounded-xl border border-border/50 bg-gym-charcoal p-5 mb-10">
      <h2 className="font-display text-xl font-bold mb-1">Utrustning för hemmagymmet</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Tränar du hemma? Här hittar du det du behöver för den här övningen.
      </p>

      <div className="space-y-2">
        {matches.map((ad) => (
          <a
            key={ad.id}
            href={ad.link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => trackAdEvent(ad.id, "click", user?.id ?? null)}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 px-4 py-3 font-medium transition-colors hover:border-gym-orange/60 hover:text-gym-orange"
          >
            <span>{ad.link_text}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </a>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Annonslänk. Handlar du via länken får vi provision, priset för dig är detsamma.
      </p>
    </section>
  );
};

export default EquipmentOffers;
