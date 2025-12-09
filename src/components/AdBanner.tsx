import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";

interface Ad {
  id: string;
  imageUrl?: string;
  link?: string;
  altText?: string;
}

// Add your ads here - they will rotate randomly
const ads: Ad[] = [
  {
    id: "placeholder",
    // Placeholder ad - replace with real ads
  },
];

interface AdBannerProps {
  size?: "horizontal" | "square" | "vertical";
  className?: string;
}

const AdBanner = ({ size = "horizontal", className = "" }: AdBannerProps) => {
  const { isPremium } = useAuth();
  
  // Select a random ad on each render
  const selectedAd = useMemo(() => {
    return ads[Math.floor(Math.random() * ads.length)];
  }, []);
  
  // Don't show ads for premium users
  if (isPremium) {
    return null;
  }

  const sizeClasses = {
    horizontal: "w-full h-24 md:h-28",
    square: "w-full aspect-square max-w-[300px]",
    vertical: "w-full max-w-[160px] h-[600px]",
  };

  const renderAdContent = () => {
    if (selectedAd.imageUrl) {
      const content = (
        <img 
          src={selectedAd.imageUrl} 
          alt={selectedAd.altText || "Annons"} 
          className="w-full h-full object-cover"
        />
      );
      
      if (selectedAd.link) {
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
      return content;
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`${sizeClasses[size]} ${className}`}
    >
      <div className="w-full h-full bg-gym-charcoal border border-border/50 rounded-lg flex items-center justify-center relative overflow-hidden">
        {renderAdContent()}
      </div>
    </motion.div>
  );
};

export default AdBanner;
