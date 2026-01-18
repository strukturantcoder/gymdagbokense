import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSocial } from '@/hooks/useSocial';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Dumbbell, 
  Footprints, 
  Flame, 
  TrendingUp,
  Trophy,
  Zap,
  User,
  Settings2,
  Check,
  Scale,
  Target,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GoalOnboardingDialog from './GoalOnboardingDialog';
import CompactGoalCard from './CompactGoalCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface DashboardBentoGridProps {
  className?: string;
}

type WidgetId = 'goals' | 'level' | 'streak' | 'strength' | 'cardio' | 'wod' | 'stats' | 'social' | 'account' | 'weight' | 'calendar';

interface WidgetConfig {
  id: WidgetId;
  label: string;
  icon: React.ReactNode;
  defaultEnabled: boolean;
}

const AVAILABLE_WIDGETS: WidgetConfig[] = [
  { id: 'goals', label: 'Mål', icon: <Target className="w-4 h-4" />, defaultEnabled: true },
  { id: 'level', label: 'Nivå & XP', icon: <Zap className="w-4 h-4" />, defaultEnabled: true },
  { id: 'streak', label: 'Streak', icon: <Flame className="w-4 h-4" />, defaultEnabled: true },
  { id: 'strength', label: 'Styrkepass', icon: <Dumbbell className="w-4 h-4" />, defaultEnabled: true },
  { id: 'cardio', label: 'Kondition', icon: <Footprints className="w-4 h-4" />, defaultEnabled: true },
  { id: 'wod', label: 'WOD / CrossFit', icon: <Zap className="w-4 h-4" />, defaultEnabled: true },
  { id: 'stats', label: 'Statistik', icon: <TrendingUp className="w-4 h-4" />, defaultEnabled: true },
  { id: 'social', label: 'Tävlingar', icon: <Trophy className="w-4 h-4" />, defaultEnabled: true },
  { id: 'account', label: 'Konto', icon: <User className="w-4 h-4" />, defaultEnabled: true },
  { id: 'weight', label: 'Vikt', icon: <Scale className="w-4 h-4" />, defaultEnabled: false },
  { id: 'calendar', label: 'Kalender', icon: <Calendar className="w-4 h-4" />, defaultEnabled: false },
];

const STORAGE_KEY = 'dashboard-widgets';

export default function DashboardBentoGrid({ className }: DashboardBentoGridProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userStats, getLevelFromXP, getXPForNextLevel } = useSocial();
  const [weeklyWorkouts, setWeeklyWorkouts] = useState(0);
  const [weeklyCardio, setWeeklyCardio] = useState(0);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [needsGoalOnboarding, setNeedsGoalOnboarding] = useState(false);
  const [goalRefreshTrigger, setGoalRefreshTrigger] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [enabledWidgets, setEnabledWidgets] = useState<WidgetId[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return AVAILABLE_WIDGETS.filter(w => w.defaultEnabled).map(w => w.id);
      }
    }
    return AVAILABLE_WIDGETS.filter(w => w.defaultEnabled).map(w => w.id);
  });

  useEffect(() => {
    if (user) {
      fetchWeeklyStats();
      checkGoalOnboarding();
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledWidgets));
  }, [enabledWidgets]);

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

  const toggleWidget = (widgetId: WidgetId) => {
    setEnabledWidgets(prev => {
      if (prev.includes(widgetId)) {
        if (prev.length <= 3) {
          toast.error('Du måste ha minst 3 widgets aktiva');
          return prev;
        }
        return prev.filter(id => id !== widgetId);
      }
      if (prev.length >= 9) {
        toast.error('Max 9 widgets får plats');
        return prev;
      }
      return [...prev, widgetId];
    });
  };

  const currentLevel = userStats ? getLevelFromXP(userStats.total_xp) : 1;
  const currentLevelXP = getXPForNextLevel(currentLevel - 1);
  const nextLevelXP = getXPForNextLevel(currentLevel);
  const progressXP = userStats ? userStats.total_xp - currentLevelXP : 0;
  const neededXP = nextLevelXP - currentLevelXP;
  const levelProgress = Math.min(100, (progressXP / neededXP) * 100);
  const currentStreak = (userStats as any)?.current_streak || 0;

  const renderWidget = (widgetId: WidgetId) => {
    switch (widgetId) {
      case 'goals':
        return (
          <CompactGoalCard 
            key="goals"
            onAddGoal={() => setShowGoalDialog(true)}
            refreshTrigger={goalRefreshTrigger}
          />
        );
      case 'level':
        return (
          <Card key="level" className="overflow-hidden">
            <CardContent className="p-2.5 h-full flex flex-col justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center shadow-lg shrink-0">
                  <span className="text-xs font-bold text-primary-foreground">{currentLevel}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground leading-tight">Nivå</p>
                  <p className="text-xs font-semibold">{userStats?.total_xp || 0} XP</p>
                </div>
              </div>
              <div className="mt-1">
                <Progress value={levelProgress} className="h-1" />
                <p className="text-[9px] text-muted-foreground text-right mt-0.5">
                  {progressXP}/{neededXP}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      case 'streak':
        return (
          <Card key="streak" className="overflow-hidden">
            <CardContent className="p-2.5 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Flame className="w-4 h-4 text-orange-500" />
                {currentStreak >= 7 && <Trophy className="w-3 h-3 text-yellow-500" />}
              </div>
              <div>
                <p className="text-xl font-bold leading-none">{currentStreak}</p>
                <p className="text-[10px] text-muted-foreground">dagars streak</p>
              </div>
            </CardContent>
          </Card>
        );
      case 'strength':
        return (
          <motion.div key="strength" whileTap={{ scale: 0.97 }}>
            <Card 
              className="h-full cursor-pointer bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20 hover:border-orange-500/40 transition-all"
              onClick={() => navigate('/training')}
            >
              <CardContent className="p-2.5 h-full flex flex-col justify-between">
                <Dumbbell className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-lg font-bold leading-none">{weeklyWorkouts}</p>
                  <p className="text-[10px] text-muted-foreground">styrkepass</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      case 'cardio':
        return (
          <motion.div key="cardio" whileTap={{ scale: 0.97 }}>
            <Card 
              className="h-full cursor-pointer bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20 hover:border-pink-500/40 transition-all"
              onClick={() => navigate('/training?tab=cardio')}
            >
              <CardContent className="p-2.5 h-full flex flex-col justify-between">
                <Footprints className="w-4 h-4 text-pink-500" />
                <div>
                  <p className="text-lg font-bold leading-none">{weeklyCardio}</p>
                  <p className="text-[10px] text-muted-foreground">kondition</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      case 'wod':
        return (
          <motion.div key="wod" whileTap={{ scale: 0.97 }}>
            <Card 
              className="h-full cursor-pointer bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40 transition-all"
              onClick={() => navigate('/training?tab=crossfit')}
            >
              <CardContent className="p-2.5 h-full flex flex-col justify-between">
                <Zap className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium leading-none">WOD</p>
                  <p className="text-[10px] text-muted-foreground">CrossFit</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      case 'stats':
        return (
          <motion.div key="stats" whileTap={{ scale: 0.97 }}>
            <Card 
              className="h-full cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/stats')}
            >
              <CardContent className="p-2.5 h-full flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium">Statistik</span>
              </CardContent>
            </Card>
          </motion.div>
        );
      case 'social':
        return (
          <motion.div key="social" whileTap={{ scale: 0.97 }}>
            <Card 
              className="h-full cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/social')}
            >
              <CardContent className="p-2.5 h-full flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-medium">Tävlingar</span>
              </CardContent>
            </Card>
          </motion.div>
        );
      case 'account':
        return (
          <motion.div key="account" whileTap={{ scale: 0.97 }}>
            <Card 
              className="h-full cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate('/account')}
            >
              <CardContent className="p-2.5 h-full flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium">Konto</span>
              </CardContent>
            </Card>
          </motion.div>
        );
      case 'weight':
        return (
          <motion.div key="weight" whileTap={{ scale: 0.97 }}>
            <Card 
              className="h-full cursor-pointer bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/20 hover:border-purple-500/40 transition-all"
              onClick={() => navigate('/account?section=weight')}
            >
              <CardContent className="p-2.5 h-full flex items-center gap-2">
                <Scale className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-medium">Vikt</span>
              </CardContent>
            </Card>
          </motion.div>
        );
      case 'calendar':
        return (
          <motion.div key="calendar" whileTap={{ scale: 0.97 }}>
            <Card 
              className="h-full cursor-pointer bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:border-blue-500/40 transition-all"
              onClick={() => navigate('/training?tab=calendar')}
            >
              <CardContent className="p-2.5 h-full flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-medium">Kalender</span>
              </CardContent>
            </Card>
          </motion.div>
        );
      default:
        return null;
    }
  };

  // Determine grid layout based on widget count
  const widgetCount = enabledWidgets.length;
  const gridCols = widgetCount <= 4 ? 2 : 3;

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

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Anpassa hemskärm
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Välj vilka widgets du vill visa (3-9 stycken)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_WIDGETS.map((widget) => (
                <label
                  key={widget.id}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    enabledWidgets.includes(widget.id)
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-muted/30 border-border hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={enabledWidgets.includes(widget.id)}
                    onCheckedChange={() => toggleWidget(widget.id)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${
                    enabledWidgets.includes(widget.id) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    {enabledWidgets.includes(widget.id) ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      widget.icon
                    )}
                  </div>
                  <span className="text-sm">{widget.label}</span>
                </label>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className={`flex flex-col gap-1.5 ${className}`}>
        {/* Settings button */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowSettings(true)}
          >
            <Settings2 className="w-3.5 h-3.5 mr-1" />
            <span className="text-xs">Anpassa</span>
          </Button>
        </div>

        {/* Compact grid */}
        <div className={`grid grid-cols-${gridCols} gap-1.5 md:gap-2`} style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
        }}>
          <AnimatePresence mode="popLayout">
            {enabledWidgets.map((widgetId) => (
              <motion.div
                key={widgetId}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="aspect-[4/3]"
              >
                {renderWidget(widgetId)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
