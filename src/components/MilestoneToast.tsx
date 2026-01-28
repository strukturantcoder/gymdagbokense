import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Flame, 
  Dumbbell, 
  Star, 
  Target, 
  Zap,
  Medal,
  Crown
} from 'lucide-react';

interface MilestoneToastProps {
  type: 'workout' | 'streak' | 'pr' | 'level' | 'achievement' | 'referral';
  value: number | string;
  onClose: () => void;
}

const milestoneConfig = {
  workout: {
    icon: Dumbbell,
    gradient: 'from-orange-500 to-red-500',
    getMessage: (value: number) => {
      if (value === 1) return 'Första passet! 💪';
      if (value === 10) return '10 pass avklarade!';
      if (value === 25) return '25 pass - kvartshundring!';
      if (value === 50) return 'Halvhundra pass! 🔥';
      if (value === 100) return '100 PASS! LEGEND! 🏆';
      if (value % 100 === 0) return `${value} pass! Otroligt!`;
      if (value % 50 === 0) return `${value} pass! Imponerande!`;
      return `Pass #${value} avklarat!`;
    }
  },
  streak: {
    icon: Flame,
    gradient: 'from-amber-500 to-orange-500',
    getMessage: (value: number) => {
      if (value === 7) return 'En veckas streak! 🔥';
      if (value === 14) return 'Två veckor stark!';
      if (value === 30) return 'En månads streak! 💪';
      if (value === 100) return '100 dagars streak! LEGEND!';
      return `${value} dagars streak!`;
    }
  },
  pr: {
    icon: Medal,
    gradient: 'from-yellow-400 to-amber-500',
    getMessage: (value: string) => `Nytt PR: ${value}! 🎯`
  },
  level: {
    icon: Star,
    gradient: 'from-purple-500 to-pink-500',
    getMessage: (value: number) => `Nivå ${value} uppnådd! ⭐`
  },
  achievement: {
    icon: Trophy,
    gradient: 'from-green-500 to-emerald-500',
    getMessage: (value: string) => `Achievement: ${value}! 🏆`
  },
  referral: {
    icon: Crown,
    gradient: 'from-blue-500 to-cyan-500',
    getMessage: (value: number) => `+${value} XP för att bjuda in en vän! 👑`
  }
};

export default function MilestoneToast({ type, value, onClose }: MilestoneToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = milestoneConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    // Fire confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f97316', '#f59e0b', '#ef4444', '#10b981']
    });

    // Auto close after delay
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getMessage = config.getMessage;
  const message = typeof value === 'number' 
    ? (getMessage as (v: number) => string)(value)
    : (getMessage as (v: string) => string)(value as string);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50"
        >
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className={`bg-gradient-to-r ${config.gradient} rounded-2xl p-4 px-6 shadow-2xl flex items-center gap-3`}
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5, repeat: 3 }}
              className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"
            >
              <Icon className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-white font-bold text-lg"
              >
                {message}
              </motion.p>
              <p className="text-white/80 text-sm">Fortsätt så! 🚀</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to show milestone toasts
export function useMilestoneToast() {
  const [milestone, setMilestone] = useState<{ type: MilestoneToastProps['type']; value: number | string } | null>(null);

  const showMilestone = (type: MilestoneToastProps['type'], value: number | string) => {
    setMilestone({ type, value });
  };

  const closeMilestone = () => {
    setMilestone(null);
  };

  const MilestoneComponent = milestone ? (
    <MilestoneToast 
      type={milestone.type} 
      value={milestone.value} 
      onClose={closeMilestone} 
    />
  ) : null;

  return { showMilestone, MilestoneComponent };
}
