import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, X, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AdBanner from "./AdBanner";

interface PostWorkoutAdPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export default function PostWorkoutAdPopup({ isOpen, onClose, onComplete }: PostWorkoutAdPopupProps) {
  const { isPremium } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(15);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (!isOpen || isPremium) return;

    setCountdown(15);
    setCanSkip(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isPremium]);

  // Don't show for premium users
  if (isPremium) {
    if (isOpen) {
      onComplete?.();
      onClose();
    }
    return null;
  }

  const handleSkip = () => {
    onComplete?.();
    onClose();
  };

  const handleGetPremium = () => {
    onClose();
    navigate('/account');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-card border border-border rounded-xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {canSkip ? "Du kan nu fortsätta" : `Vänta ${countdown} sekunder...`}
                </span>
              </div>
              {canSkip && (
                <Button variant="ghost" size="icon" onClick={handleSkip} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Ad content */}
            <div className="p-4 space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Sponsrat innehåll
              </p>
              
              <AdBanner format="square_large" placement="post_workout" showPremiumPrompt={false} />

              {/* Premium nudge */}
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Trött på annonser?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Uppgradera till Premium för att se dina resultat direkt utan väntetid!
                    </p>
                    <Button 
                      size="sm" 
                      onClick={handleGetPremium}
                      className="mt-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
                    >
                      <Crown className="w-3 h-3 mr-1" />
                      Skaffa Premium
                    </Button>
                  </div>
                </div>
              </div>

              {/* Skip button */}
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleSkip}
                disabled={!canSkip}
              >
                {canSkip ? "Visa mina resultat" : `Vänta ${countdown}s...`}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
