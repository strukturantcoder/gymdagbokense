import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Ad {
  id: string;
  name: string;
  image_url: string;
  link: string;
  alt_text: string | null;
  format: string;
  placement: string | null;
}

// Fallback ads for when database is empty
const fallbackAds: Ad[] = [
  {
    id: "tradedoubler-1",
    name: "Tradedoubler 1",
    image_url: "https://imp.tradedoubler.com/imp?type(img)g(25913394)a(3465011)",
    link: "https://clk.tradedoubler.com/click?p=382764&a=3465011&g=25913394",
    alt_text: "Annons",
    format: "horizontal",
    placement: null,
  },
  {
    id: "tradedoubler-2",
    name: "Tradedoubler 2",
    image_url: "https://imp.tradedoubler.com/imp?type(img)g(25913396)a(3465011)",
    link: "https://clk.tradedoubler.com/click?p=382764&a=3465011&g=25913396",
    alt_text: "Annons",
    format: "horizontal",
    placement: null,
  },
];

type AdFormat = "horizontal" | "square_large" | "square_medium" | "vertical" | "leaderboard" | "mobile_banner";

interface AdBannerProps {
  format?: AdFormat;
  placement?: string;
  className?: string;
  showPremiumPrompt?: boolean;
}

const AdBanner = ({ 
  format = "horizontal", 
  placement,
  className = "", 
  showPremiumPrompt = true 
}: AdBannerProps) => {
  const { isPremium } = useAuth();
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        let query = supabase
          .from("ads")
          .select("id, name, image_url, link, alt_text, format, placement")
          .eq("is_active", true);

        // Filter by format
        query = query.eq("format", format);

        // Filter by placement if specified
        if (placement) {
          query = query.or(`placement.eq.${placement},placement.is.null`);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching ads:", error);
          setAds(fallbackAds.filter(ad => ad.format === format));
        } else if (data && data.length > 0) {
          setAds(data);
        } else {
          // Use fallback ads matching the format
          setAds(fallbackAds.filter(ad => ad.format === format));
        }
      } catch (err) {
        console.error("Error fetching ads:", err);
        setAds(fallbackAds.filter(ad => ad.format === format));
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, [format, placement]);

  // Select a random ad and generate unique cache-busting param per component instance
  const { selectedAd, imageUrl } = useMemo(() => {
    if (ads.length === 0) return { selectedAd: null, imageUrl: "" };
    const ad = ads[Math.floor(Math.random() * ads.length)];
    const cacheBuster = Math.random().toString().substring(2, 11);
    // Only add cache buster if it's a tradedoubler URL
    const url = ad.image_url.includes("tradedoubler.com") 
      ? `${ad.image_url}${cacheBuster}`
      : ad.image_url;
    return {
      selectedAd: ad,
      imageUrl: url
    };
  }, [ads]);
  
  // Don't show ads for premium users
  if (isPremium) {
    return null;
  }

  // Size classes based on format
  const sizeClasses: Record<AdFormat, string> = {
    horizontal: "w-full h-16 sm:h-20 md:h-28",
    square_large: "w-full aspect-square max-w-[400px]",
    square_medium: "w-full aspect-square max-w-[300px]",
    vertical: "w-full max-w-[160px] h-[600px]",
    leaderboard: "w-full h-20 sm:h-24",
    mobile_banner: "w-full h-12 sm:h-14",
  };

  const renderAdContent = () => {
    if (loading) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-pulse bg-muted/30 w-full h-full" />
        </div>
      );
    }

    if (selectedAd && imageUrl) {
      const content = (
        <img 
          src={imageUrl} 
          alt={selectedAd.alt_text || "Annons"} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide the ad if image fails to load (e.g., ad blocker)
            e.currentTarget.style.display = 'none';
          }}
        />
      );
      
      return (
        <a 
          href={selectedAd.link} 
          target="_blank" 
          rel="noopener noreferrer sponsored"
          className="w-full h-full block"
        >
          {content}
        </a>
      );
    }
    
    // Placeholder when no image
    return (
      <>
        <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-transparent" />
        <div className="text-center relative z-10">
          <div className="text-xs text-muted-foreground/60 uppercase tracking-wider mb-1">Annons</div>
          <div className="text-sm text-muted-foreground">
            Din annons här
          </div>
        </div>
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-t-gym-orange/20 border-l-[20px] border-l-transparent" />
      </>
    );
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={sizeClasses[format]}
      >
        <div className="w-full h-full bg-gym-charcoal border border-border/50 rounded-lg flex items-center justify-center relative overflow-hidden">
          {renderAdContent()}
        </div>
      </motion.div>
      
      {showPremiumPrompt && (
        <button
          onClick={() => navigate('/account')}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
        >
          <Crown className="w-3 h-3 text-gym-orange" />
          <span>Bli Premium för att ta bort annonser</span>
        </button>
      )}
    </div>
  );
};

export default AdBanner;