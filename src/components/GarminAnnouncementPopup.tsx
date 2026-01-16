import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Watch, Activity, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GarminAnnouncementPopupProps {
  userId: string;
}

const STORAGE_KEY = 'garmin_announcement_seen';

export default function GarminAnnouncementPopup({ userId }: GarminAnnouncementPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    
    const hasSeenAnnouncement = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
    if (!hasSeenAnnouncement) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  const handleClose = () => {
    if (userId) {
      localStorage.setItem(`${STORAGE_KEY}_${userId}`, 'true');
    }
    setIsOpen(false);
  };

  const handleConnect = () => {
    handleClose();
    navigate('/account');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1 hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>
        
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header with Garmin styling */}
            <div className="bg-gradient-to-br from-[#007CC3] to-[#005A8C] p-8 flex justify-center relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
              <div className="absolute -bottom-5 -left-5 w-24 h-24 bg-white/5 rounded-full" />
              
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="relative"
              >
                <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Watch className="w-12 h-12 text-white" />
                </div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-gym-orange rounded-full flex items-center justify-center"
                >
                  <span className="text-white text-xs font-bold">NY!</span>
                </motion.div>
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl font-display font-bold mb-3"
              >
                Synka med Garmin Connect!
              </motion.h2>
              
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground mb-6"
              >
                Nu kan du koppla din Garmin-klocka och synka dina träningsaktiviteter automatiskt till Gymdagboken!
              </motion.p>

              {/* Features list */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col gap-3 mb-6"
              >
                <div className="flex items-center gap-3 text-left bg-muted/50 rounded-lg p-3">
                  <Activity className="w-5 h-5 text-[#007CC3] shrink-0" />
                  <span className="text-sm">Se all din träning samlad på ett ställe</span>
                </div>
                <div className="flex items-center gap-3 text-left bg-muted/50 rounded-lg p-3">
                  <RefreshCw className="w-5 h-5 text-[#007CC3] shrink-0" />
                  <span className="text-sm">Automatisk synkronisering av aktiviteter</span>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col gap-2"
              >
                <Button 
                  variant="hero" 
                  onClick={handleConnect}
                  className="w-full"
                >
                  <Watch className="w-4 h-4 mr-2" />
                  Koppla Garmin nu
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleClose}
                  className="w-full"
                >
                  Kanske senare
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
