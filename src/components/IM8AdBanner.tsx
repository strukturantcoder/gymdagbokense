import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface IM8AdBannerProps {
  className?: string;
  showPremiumPrompt?: boolean;
  placement?: string;
}

interface AdEmbedData {
  scriptSrc: string;
  iframeSrc: string;
  divId: string;
}

const IM8AdBanner = ({ 
  className = "", 
  showPremiumPrompt = true,
  placement = "default"
}: IM8AdBannerProps) => {
  const { isPremium } = useAuth();
  const navigate = useNavigate();
  const adContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);
  const [adData, setAdData] = useState<AdEmbedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch ad data from edge function
  useEffect(() => {
    if (isPremium) return;

    const fetchAdData = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('fetch-im8-ads', {
          body: { placement },
        });

        if (error) {
          console.error('Error fetching IM8 ads:', error);
          // Use fallback
          setAdData({
            scriptSrc: 'https://im8.go2cloud.org/aff_ad?campaign_id=9&aff_id=1814&format=js&divid=im8-ad-container',
            iframeSrc: 'https://im8.go2cloud.org/aff_ad?campaign_id=9&aff_id=1814&format=iframe',
            divId: 'im8-ad-container',
          });
        } else if (data?.success && data?.data) {
          setAdData(data.data);
        } else if (data?.fallback?.data) {
          setAdData(data.fallback.data);
        }
      } catch (err) {
        console.error('Error:', err);
        // Use fallback
        setAdData({
          scriptSrc: 'https://im8.go2cloud.org/aff_ad?campaign_id=9&aff_id=1814&format=js&divid=im8-ad-container',
          iframeSrc: 'https://im8.go2cloud.org/aff_ad?campaign_id=9&aff_id=1814&format=iframe',
          divId: 'im8-ad-container',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdData();
  }, [isPremium, placement]);

  // Load the ad script when data is available
  useEffect(() => {
    if (isPremium || !adData || scriptLoaded.current) return;
    
    const script = document.createElement("script");
    script.src = adData.scriptSrc;
    script.type = "text/javascript";
    script.async = true;
    
    document.body.appendChild(script);
    scriptLoaded.current = true;

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [isPremium, adData]);

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
          className="w-full bg-card border border-border rounded-lg flex items-center justify-center relative overflow-hidden p-4"
        >
          {isLoading ? (
            <div className="w-full h-[100px] flex items-center justify-center">
              <div className="animate-pulse bg-muted rounded w-full h-full" />
            </div>
          ) : (
            <div 
              id={adData?.divId || "im8-ad-container"} 
              className="w-full flex items-center justify-center min-h-[100px]"
            >
              {/* Fallback iframe for noscript or if script fails */}
              <noscript>
                <iframe 
                  src={adData?.iframeSrc || "https://im8.go2cloud.org/aff_ad?campaign_id=9&aff_id=1814&format=iframe"}
                  scrolling="no" 
                  frameBorder="0" 
                  marginHeight={0} 
                  marginWidth={0} 
                  width="600" 
                  height="600"
                  title="Sponsrad annons"
                />
              </noscript>
            </div>
          )}
          
          {/* Sponsored indicator */}
          <div className="absolute top-2 right-2 bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
            Sponsrad
          </div>
        </div>
      </motion.div>
      
      {showPremiumPrompt && (
        <button
          onClick={() => navigate('/account')}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
        >
          <Crown className="w-3 h-3 text-primary" />
          <span>Bli Premium för att ta bort annonser</span>
        </button>
      )}
    </div>
  );
};

export default IM8AdBanner;
