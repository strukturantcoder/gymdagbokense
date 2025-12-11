import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";

interface Ad {
  id: string;
  imageBaseUrl: string;
  link: string;
  altText?: string;
}

// Add your ads here - they will rotate randomly
const ads: Ad[] = [
  {
    id: "tradedoubler-1",
    imageBaseUrl: "https://imp.tradedoubler.com/imp?type(img)g(25913394)a(3465011)",
    link: "https://clk.tradedoubler.com/click?p=382764&a=3465011&g=25913394",
    altText: "Annons",
  },
  {
    id: "tradedoubler-2",
    imageBaseUrl: "https://imp.tradedoubler.com/imp?type(img)g(25913396)a(3465011)",
    link: "https://clk.tradedoubler.com/click?p=382764&a=3465011&g=25913396",
    altText: "Annons",
  },
  {
    id: "tradedoubler-3",
    imageBaseUrl: "https://imp.tradedoubler.com/imp?type(img)g(25913398)a(3465011)",
    link: "https://clk.tradedoubler.com/click?p=382764&a=3465011&g=25913398",
    altText: "Annons",
  },
  {
    id: "nutrimimic-hero",
    imageBaseUrl: "https://customer-assets.emergentagent.com/job_diet-companion-25/artifacts/xx1t8w21_u1865862766_A_professional_food_photographer_captures_a_top-d_0b02e73d-f14d-47ca-8e31-3e563bcdbf9d_1.png",
    link: "https://clk.tradedoubler.com/click?p=393591&a=3465011",
    altText: "Nutrimimic - Feel the Reset",
  },
  {
    id: "nutrimimic-portrait",
    imageBaseUrl: "https://customer-assets.emergentagent.com/job_fmd-coach/artifacts/8s7904fy_nutrimic_portrait.jpg",
    link: "https://clk.tradedoubler.com/click?p=393591&a=3465011",
    altText: "Nutrimimic - Healthy Eating",
  },
  {
    id: "tradedoubler-4",
    imageBaseUrl: "https://imp.tradedoubler.com/imp?type(img)g(26010526)a(3465011)",
    link: "https://clk.tradedoubler.com/click?p=384188&a=3465011&g=26010526",
    altText: "Annons",
  },
  {
    id: "tradedoubler-5",
    imageBaseUrl: "https://imp.tradedoubler.com/imp?type(img)g(26010508)a(3465011)",
    link: "https://clk.tradedoubler.com/click?p=384188&a=3465011&g=26010508",
    altText: "Annons",
  },
];

interface AdBannerProps {
  size?: "horizontal" | "square" | "vertical";
  className?: string;
  showPremiumPrompt?: boolean;
}

const AdBanner = ({ size = "horizontal", className = "", showPremiumPrompt = true }: AdBannerProps) => {
  const { isPremium } = useAuth();
  const navigate = useNavigate();
  
  // Select a random ad and generate unique cache-busting param per component instance
  const { selectedAd, imageUrl } = useMemo(() => {
    const ad = ads[Math.floor(Math.random() * ads.length)];
    const cacheBuster = Math.random().toString().substring(2, 11);
    return {
      selectedAd: ad,
      imageUrl: `${ad.imageBaseUrl}${cacheBuster}`
    };
  }, []);
  
  // Don't show ads for premium users
  if (isPremium) {
    return null;
  }

  const sizeClasses = {
    horizontal: "w-full h-16 sm:h-20 md:h-28",
    square: "w-full aspect-square max-w-[300px]",
    vertical: "w-full max-w-[160px] h-[600px]",
  };

  const renderAdContent = () => {
    if (imageUrl) {
      const content = (
        <img 
          src={imageUrl} 
          alt={selectedAd.altText || "Annons"} 
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
        className={sizeClasses[size]}
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
