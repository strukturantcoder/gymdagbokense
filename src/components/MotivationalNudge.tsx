import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { X, Dumbbell, TrendingUp, Flame, Target, Users, Zap, Calendar } from 'lucide-react';

interface NudgeConfig {
  id: string;
  icon: React.ElementType;
  gradient: string;
  title: string;
  message: string;
  action?: string;
  actionPath?: string;
}

const nudges: NudgeConfig[] = [
  {
    id: 'no_workout_today',
    icon: Dumbbell,
    gradient: 'from-orange-500/90 to-red-500/90',
    title: 'Dags att köra! 💪',
    message: 'Du har inte tränat idag. Ett snabbt pass gör underverk!',
    action: 'Starta pass',
    actionPath: '/training'
  },
  {
    id: 'streak_at_risk',
    icon: Flame,
    gradient: 'from-amber-500/90 to-orange-500/90',
    title: 'Håll streaken vid liv! 🔥',
    message: 'Missa inte din träningsstreak - logga ett pass idag!',
    action: 'Träna nu',
    actionPath: '/training'
  },
  {
    id: 'close_to_goal',
    icon: Target,
    gradient: 'from-green-500/90 to-emerald-500/90',
    title: 'Nästan framme! 🎯',
    message: 'Du är nära att nå ditt mål. Push genom!',
    action: 'Se mål',
    actionPath: '/stats'
  },
  {
    id: 'level_up_soon',
    icon: Zap,
    gradient: 'from-purple-500/90 to-pink-500/90',
    title: 'Snart ny nivå! ⭐',
    message: 'Bara lite XP kvar till nästa nivå. Kör ett pass!',
    action: 'Träna',
    actionPath: '/training'
  },
  {
    id: 'invite_friends',
    icon: Users,
    gradient: 'from-blue-500/90 to-cyan-500/90',
    title: 'Träna med vänner! 👥',
    message: 'Bjud in en vän och tjäna 100 XP bonus!',
    action: 'Bjud in',
    actionPath: '/social/friends'
  },
  {
    id: 'weekly_summary',
    icon: TrendingUp,
    gradient: 'from-indigo-500/90 to-blue-500/90',
    title: 'Bra vecka! 📊',
    message: 'Kolla in din veckosammanfattning och se hur det gått.',
    action: 'Se statistik',
    actionPath: '/stats'
  },
  {
    id: 'schedule_workout',
    icon: Calendar,
    gradient: 'from-teal-500/90 to-green-500/90',
    title: 'Planera din träning 📅',
    message: 'Schemalägg nästa pass för att hålla motivationen uppe!',
    action: 'Schemalägg',
    actionPath: '/training'
  }
];

export default function MotivationalNudge() {
  const { user } = useAuth();
  const [activeNudge, setActiveNudge] = useState<NudgeConfig | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (user) {
      checkForNudge();
    }
  }, [user]);

  const checkForNudge = async () => {
    if (!user) return;

    // Check if we've shown a nudge recently
    const lastNudge = localStorage.getItem('last_nudge_shown');
    const now = Date.now();
    
    // Only show nudge once every 4 hours
    if (lastNudge && now - parseInt(lastNudge) < 4 * 60 * 60 * 1000) {
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check various conditions
      const [workoutsToday, userStats, streak] = await Promise.all([
        supabase
          .from('workout_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('completed_at', today.toISOString()),
        supabase
          .from('user_stats')
          .select('total_xp, current_streak')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('user_stats')
          .select('current_streak, last_activity_date')
          .eq('user_id', user.id)
          .single()
      ]);

      const hasWorkedOutToday = (workoutsToday.count || 0) > 0;
      const stats = userStats.data as any;
      const streakData = streak.data as any;

      // Priority-based nudge selection
      let selectedNudge: NudgeConfig | null = null;

      // High priority: Streak at risk
      if (streakData?.current_streak > 0 && !hasWorkedOutToday) {
        const lastActivity = streakData.last_activity_date 
          ? new Date(streakData.last_activity_date) 
          : null;
        const hoursSinceActivity = lastActivity 
          ? (now - lastActivity.getTime()) / (1000 * 60 * 60) 
          : 48;
        
        if (hoursSinceActivity > 18) {
          selectedNudge = nudges.find(n => n.id === 'streak_at_risk') || null;
        }
      }

      // No workout today (if no other high priority)
      if (!selectedNudge && !hasWorkedOutToday) {
        // After 3 PM, encourage workout
        if (new Date().getHours() >= 15) {
          selectedNudge = nudges.find(n => n.id === 'no_workout_today') || null;
        }
      }

      // Close to level up
      if (!selectedNudge && stats?.total_xp) {
        // Check if within 100 XP of next level milestone
        const currentLevel = Math.floor(stats.total_xp / 500) + 1;
        const xpForNextLevel = currentLevel * 500;
        const xpNeeded = xpForNextLevel - stats.total_xp;
        
        if (xpNeeded <= 100 && xpNeeded > 0) {
          selectedNudge = nudges.find(n => n.id === 'level_up_soon') || null;
        }
      }

      // Random chance for invite friends (10%)
      if (!selectedNudge && Math.random() < 0.1) {
        selectedNudge = nudges.find(n => n.id === 'invite_friends') || null;
      }

      if (selectedNudge) {
        // Delay showing to not overwhelm on page load
        setTimeout(() => {
          setActiveNudge(selectedNudge);
          setShow(true);
        }, 3000);
      }
    } catch (error) {
      console.error('Error checking nudge conditions:', error);
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('last_nudge_shown', Date.now().toString());
    setTimeout(() => setActiveNudge(null), 300);
  };

  const handleAction = () => {
    if (activeNudge?.actionPath) {
      window.location.href = activeNudge.actionPath;
    }
    dismiss();
  };

  if (!activeNudge) return null;

  const Icon = activeNudge.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
        >
          <div className={`bg-gradient-to-br ${activeNudge.gradient} backdrop-blur-sm rounded-xl p-4 shadow-xl border border-white/20`}>
            <button
              onClick={dismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4 text-white/80" />
            </button>
            
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">
                  {activeNudge.title}
                </p>
                <p className="text-white/80 text-xs mt-0.5">
                  {activeNudge.message}
                </p>
                {activeNudge.action && (
                  <Button
                    size="sm"
                    onClick={handleAction}
                    className="mt-3 bg-white text-gray-900 hover:bg-white/90 w-full text-xs h-8"
                  >
                    {activeNudge.action}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
