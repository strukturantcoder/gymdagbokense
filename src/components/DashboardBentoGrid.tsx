import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSocial } from '@/hooks/useSocial';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Dumbbell, 
  Footprints, 
  Flame, 
  TrendingUp,
  Trophy,
  Zap,
  User
} from 'lucide-react';
import { motion } from 'framer-motion';
import GoalOnboardingDialog from './GoalOnboardingDialog';
import CompactGoalCard from './CompactGoalCard';

interface DashboardBentoGridProps {
  className?: string;
}

export default function DashboardBentoGrid({ className }: DashboardBentoGridProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userStats, getLevelFromXP, getXPForNextLevel } = useSocial();
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(0);
  const [weeklyCardio, setWeeklyCardio] = useState(0);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [needsGoalOnboarding, setNeedsGoalOnboarding] = useState(false);
  const [goalRefreshTrigger, setGoalRefreshTrigger] = useState(0);

  useEffect(() => {
    if (user) {
      fetchWeeklyStats();
      checkGoalOnboarding();
    }
  }, [user]);

  const checkGoalOnboarding = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('has_set_initial_goals')
        .eq('user_id', user.id)
        .single();
      
      if (profile && !profile.has_set_initial_goals) {
        setTimeout(() => setNeedsGoalOnboarding(true), 1000);
      }
    } catch (error) {
      console.error('Error checking goal onboarding:', error);
    }
  };

  const fetchWeeklyStats = async () => {
    if (!user) return;
    
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - diff);
      weekStart.setHours(0, 0, 0, 0);

      const [workoutRes, cardioRes] = await Promise.all([
        supabase
          .from('workout_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('completed_at', weekStart.toISOString()),
        supabase
          .from('cardio_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('completed_at', weekStart.toISOString())
      ]);

      setWeeklyWorkouts(workoutRes.count || 0);
      setWeeklyCardio(cardioRes.count || 0);
    } catch (error) {
      console.error('Error fetching weekly stats:', error);
    }
  };

  const handleGoalComplete = () => {
    setNeedsGoalOnboarding(false);
    setGoalRefreshTrigger(prev => prev + 1);
  };

  const currentLevel = userStats ? getLevelFromXP(userStats.total_xp) : 1;
  const currentLevelXP = getXPForNextLevel(currentLevel - 1);
  const nextLevelXP = getXPForNextLevel(currentLevel);
  const progressXP = userStats ? userStats.total_xp - currentLevelXP : 0;
  const neededXP = nextLevelXP - currentLevelXP;
  const levelProgress = Math.min(100, (progressXP / neededXP) * 100);
  const currentStreak = (userStats as any)?.current_streak || 0;

  return (
    <>
      <GoalOnboardingDialog
        open={needsGoalOnboarding || showGoalDialog}
        onOpenChange={(open) => {
          if (needsGoalOnboarding) {
            setNeedsGoalOnboarding(open);
          } else {
            setShowGoalDialog(open);
          }
        }}
        onComplete={handleGoalComplete}
      />

      {/* Compact 2x3 grid - fits on screen without scroll */}
      <div className={`grid grid-cols-3 gap-2 md:gap-3 ${className}`}>
        {/* Row 1: Goals + Level + Streak */}
        <CompactGoalCard 
          onAddGoal={() => setShowGoalDialog(true)}
          refreshTrigger={goalRefreshTrigger}
        />

        <Card className="h-24 overflow-hidden">
          <CardContent className="p-3 h-full flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center shadow-lg">
                <span className="text-sm font-bold text-primary-foreground">{currentLevel}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Nivå</p>
                <p className="text-xs font-semibold">{userStats?.total_xp || 0} XP</p>
              </div>
            </div>
            <div>
              <Progress value={levelProgress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                {progressXP}/{neededXP}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="h-24 overflow-hidden">
          <CardContent className="p-3 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Flame className="w-5 h-5 text-orange-500" />
              {currentStreak >= 7 && <Trophy className="w-4 h-4 text-yellow-500" />}
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{currentStreak}</p>
              <p className="text-[10px] text-muted-foreground">dagars streak</p>
            </div>
          </CardContent>
        </Card>

        {/* Row 2: Quick actions - Styrka, Kondition, Vikt */}
        <motion.div whileTap={{ scale: 0.97 }}>
          <Card 
            className="h-24 cursor-pointer bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20 hover:border-orange-500/40 transition-all"
            onClick={() => navigate('/training')}
          >
            <CardContent className="p-3 h-full flex flex-col justify-between">
              <Dumbbell className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xl font-bold leading-none">{weeklyWorkouts}</p>
                <p className="text-[10px] text-muted-foreground">styrkepass</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileTap={{ scale: 0.97 }}>
          <Card 
            className="h-24 cursor-pointer bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20 hover:border-pink-500/40 transition-all"
            onClick={() => navigate('/training?tab=cardio')}
          >
            <CardContent className="p-3 h-full flex flex-col justify-between">
              <Footprints className="w-5 h-5 text-pink-500" />
              <div>
                <p className="text-xl font-bold leading-none">{weeklyCardio}</p>
                <p className="text-[10px] text-muted-foreground">kondition</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileTap={{ scale: 0.97 }}>
          <Card 
            className="h-24 cursor-pointer bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40 transition-all"
            onClick={() => navigate('/training?tab=crossfit')}
          >
            <CardContent className="p-3 h-full flex flex-col justify-between">
              <Zap className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium leading-none">WOD</p>
                <p className="text-[10px] text-muted-foreground">CrossFit</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Row 3: Stats + Social + Plan */}
        <motion.div whileTap={{ scale: 0.97 }}>
          <Card 
            className="h-20 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/stats')}
          >
            <CardContent className="p-3 h-full flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-medium">Statistik</span>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileTap={{ scale: 0.97 }}>
          <Card 
            className="h-20 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/social')}
          >
            <CardContent className="p-3 h-full flex items-center gap-3">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="text-xs font-medium">Tävlingar</span>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileTap={{ scale: 0.97 }}>
          <Card 
            className="h-20 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/account')}
          >
            <CardContent className="p-3 h-full flex items-center gap-3">
              <User className="w-5 h-5 text-gray-500" />
              <span className="text-xs font-medium">Konto</span>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
