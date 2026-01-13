import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";

interface PriorityAdBannerProps {
  className?: string;
  showPremiumPrompt?: boolean;
}

const PriorityAdBanner = ({ 
  className = "", 
  showPremiumPrompt = true 
}: PriorityAdBannerProps) => {
  const { isPremium } = useAuth();
  const navigate = useNavigate();
  const adContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    // Only load once and only for non-premium users
    if (isPremium || scriptLoaded.current) return;
    
    // Load the ad script
    const script = document.createElement("script");
    script.src = "https://im8.go2cloud.org/aff_ad?campaign_id=9&aff_id=1814&format=js&divid=im89OfJ2lh";
    script.type = "text/javascript";
    script.async = true;
    
    // Append to document body to ensure it runs
    document.body.appendChild(script);
    scriptLoaded.current = true;

    return () => {
      // Cleanup on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [isPremium]);

  // Don't show ads for premium users
  if (isPremium) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <div 
          ref={adContainerRef}
          className="w-full bg-gym-charcoal border-2 border-gym-orange/30 rounded-lg flex items-center justify-center relative overflow-hidden p-4"
        >
          {/* The ad container div that the script targets */}
          <div id="im89OfJ2lh" className="w-full flex items-center justify-center min-h-[100px]">
            {/* Fallback iframe for noscript */}
            <noscript>
              <iframe 
                src="https://im8.go2cloud.org/aff_ad?campaign_id=9&aff_id=1814&format=iframe" 
                scrolling="no" 
                frameBorder="0" 
                marginHeight={0} 
                marginWidth={0} 
                width="600" 
                height="600"
                title="Prioriterad annons"
              />
            </noscript>
          </div>
          
          {/* Priority indicator */}
          <div className="absolute top-2 right-2 bg-gym-orange/20 text-gym-orange text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
            Sponsrad
          </div>
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

export default PriorityAdBanner;
