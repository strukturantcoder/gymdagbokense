import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Gift, Sparkles, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

// Competition end date - January 31, 2025
const COMPETITION_END_DATE = new Date('2025-01-31T23:59:59');

const useCountdown = (targetDate: Date) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        isExpired: false
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};

export const TeamCompetitionBanner = () => {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(COMPETITION_END_DATE);

  if (isExpired) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100 }}
    >
      <Card className="overflow-hidden border-2 border-gym-orange/50 bg-gradient-to-r from-gym-orange/10 via-gym-amber/10 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="shrink-0"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-gym-orange to-gym-amber rounded-full flex items-center justify-center">
                <Trophy className="h-8 w-8 text-white" />
              </div>
            </motion.div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <h3 className="text-xl font-bold">Lagtävling – Vinn 1000 kr!</h3>
                <Badge className="bg-gym-orange text-white animate-pulse">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Tävling
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Skapa ett lag och bjud in dina vänner! Lagledaren med flest inbjudna som går med vinner ett 
                <span className="font-semibold text-gym-orange"> presentkort på 1000 kr hos Atletbutiken</span> 🎁
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="text-center p-2 sm:p-3 bg-background/50 rounded-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-gym-orange" />
                <div className="flex gap-1 font-mono font-bold text-xs sm:text-sm">
                  <span className="bg-gym-orange/20 px-1 rounded">{days}d</span>
                  <span className="bg-gym-orange/20 px-1 rounded">{hours}h</span>
                  <span className="bg-gym-orange/20 px-1 rounded">{minutes}m</span>
                  <span className="bg-gym-orange/20 px-1 rounded hidden sm:inline">{seconds}s</span>
                </div>
                <p className="text-xs mt-1">kvar</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-background/50 rounded-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-primary" />
                <span className="font-medium text-xs sm:text-sm">Max 10</span>
                <p className="text-xs">per lag</p>
              </div>
              <div className="text-center p-2 sm:p-3 bg-background/50 rounded-lg">
                <Gift className="h-4 w-4 sm:h-5 sm:w-5 mx-auto mb-1 text-gym-orange" />
                <span className="font-medium text-xs sm:text-sm">1000 kr</span>
                <p className="text-xs">Atletbutiken</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
