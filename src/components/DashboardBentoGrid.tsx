import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSocial } from '@/hooks/useSocial';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Dumbbell, 
  Footprints, 
  Zap, 
  Flame, 
  TrendingUp,
  Calendar,
  ChevronRight,
  Trophy
} from 'lucide-react';
import { motion } from 'framer-motion';
import GoalProgressCard from './GoalProgressCard';
import GoalOnboardingDialog from './GoalOnboardingDialog';
import XPProgress from './XPProgress';

interface DashboardStats {
  weeklyWorkouts: number;
  weeklyCardio: number;
  currentStreak: number;
  totalXP: number;
  level: number;
}

interface DashboardBentoGridProps {
  className?: string;
}

export default function DashboardBentoGrid({ className }: DashboardBentoGridProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userStats, getLevelFromXP, getXPForNextLevel } = useSocial();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    weeklyWorkouts: 0,
    weeklyCardio: 0,
    currentStreak: 0,
    totalXP: 0,
    level: 1,
  });
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [needsGoalOnboarding, setNeedsGoalOnboarding] = useState(false);
  const [goalRefreshTrigger, setGoalRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      checkGoalOnboarding();
    }
  }, [user]);

  useEffect(() => {
    if (userStats) {
      setDashboardStats(prev => ({
        ...prev,
        currentStreak: (userStats as any).current_streak || 0,
        totalXP: userStats.total_xp,
        level: userStats.level,
      }));
    }
  }, [userStats]);

  const checkGoalOnboarding = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('has_set_initial_goals')
        .eq('user_id', user.id)
        .single();
      
      if (profile && !profile.has_set_initial_goals) {
        // Small delay to let the page load first
        setTimeout(() => setNeedsGoalOnboarding(true), 1000);
      }
    } catch (error) {
      console.error('Error checking goal onboarding:', error);
    }
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      // Get start of current week (Monday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - diff);
      weekStart.setHours(0, 0, 0, 0);

      // Fetch weekly workouts
      const { count: workoutCount } = await supabase
        .from('workout_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('completed_at', weekStart.toISOString());

      // Fetch weekly cardio
      const { count: cardioCount } = await supabase
        .from('cardio_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('completed_at', weekStart.toISOString());

      setDashboardStats(prev => ({
        ...prev,
        weeklyWorkouts: workoutCount || 0,
        weeklyCardio: cardioCount || 0,
      }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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

      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 ${className}`}>
        {/* Goals Card - Spans 2 columns */}
        <GoalProgressCard 
          onAddGoal={() => setShowGoalDialog(true)}
          refreshTrigger={goalRefreshTrigger}
        />

        {/* Level & XP Card */}
        <Card className="col-span-1 overflow-hidden">
          <CardContent className="p-4 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold text-primary-foreground">{currentLevel}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Nivå</p>
                <p className="font-semibold text-sm truncate">{userStats?.total_xp || 0} XP</p>
              </div>
            </div>
            <div className="mt-auto">
              <Progress value={levelProgress} className="h-2 mb-1" />
              <p className="text-xs text-muted-foreground text-right">
                {progressXP}/{neededXP} till nästa
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Streak Card */}
        <Card className="col-span-1 overflow-hidden">
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <Flame className="w-6 h-6 text-orange-500" />
              {dashboardStats.currentStreak >= 7 && (
                <Trophy className="w-4 h-4 text-yellow-500" />
              )}
            </div>
            <div>
              <p className="text-3xl font-bold">{dashboardStats.currentStreak}</p>
              <p className="text-xs text-muted-foreground">dagars streak</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Row */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="col-span-1"
        >
          <Card 
            className="h-full cursor-pointer bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20 hover:border-orange-500/40 transition-colors"
            onClick={() => navigate('/training')}
          >
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <Dumbbell className="w-6 h-6 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{dashboardStats.weeklyWorkouts}</p>
                <p className="text-xs text-muted-foreground">styrkepass denna vecka</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="col-span-1"
        >
          <Card 
            className="h-full cursor-pointer bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20 hover:border-pink-500/40 transition-colors"
            onClick={() => navigate('/cardio')}
          >
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <Footprints className="w-6 h-6 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">{dashboardStats.weeklyCardio}</p>
                <p className="text-xs text-muted-foreground">konditionspass denna vecka</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats shortcut */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="col-span-1"
        >
          <Card 
            className="h-full cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/stats')}
          >
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Se statistik</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Calendar shortcut */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="col-span-1"
        >
          <Card 
            className="h-full cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/training')}
          >
            <CardContent className="p-4 h-full flex flex-col justify-between">
              <Calendar className="w-6 h-6 text-green-500" />
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Planera träning</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
