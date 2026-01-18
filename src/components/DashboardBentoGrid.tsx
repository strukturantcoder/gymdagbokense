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
  Calendar,
  GripVertical
} from 'lucide-react';
import { motion } from 'framer-motion';
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

const STORAGE_KEY = 'dashboard-widgets-order';

interface SortableWidgetProps {
  id: WidgetId;
  children: React.ReactNode;
  isEditing: boolean;
}

function SortableWidget({ id, children, isEditing }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`aspect-[4/3] relative ${isDragging ? 'scale-105' : ''}`}
    >
      {isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-0.5 right-0.5 z-10 p-1 bg-background/80 rounded cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground" />
        </div>
      )}
      <div className="h-full">{children}</div>
    </div>
  );
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
  const [showSettings, setShowSettings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEnabledWidgets((items) => {
        const oldIndex = items.indexOf(active.id as WidgetId);
        const newIndex = items.indexOf(over.id as WidgetId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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
            onAddGoal={() => setShowGoalDialog(true)}
            refreshTrigger={goalRefreshTrigger}
          />
        );
      case 'level':
        return (
          <Card className="h-full overflow-hidden">
            <CardContent className="p-2 h-full flex flex-col justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center shadow-lg shrink-0">
                  <span className="text-[10px] font-bold text-primary-foreground">{currentLevel}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-muted-foreground leading-tight">Nivå</p>
                  <p className="text-[10px] font-semibold">{userStats?.total_xp || 0} XP</p>
                </div>
              </div>
              <div>
                <Progress value={levelProgress} className="h-1" />
                <p className="text-[8px] text-muted-foreground text-right mt-0.5">
                  {progressXP}/{neededXP}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      case 'streak':
        return (
          <Card className="h-full overflow-hidden">
            <CardContent className="p-2 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Flame className="w-4 h-4 text-orange-500" />
                {currentStreak >= 7 && <Trophy className="w-3 h-3 text-yellow-500" />}
              </div>
              <div>
                <p className="text-lg font-bold leading-none">{currentStreak}</p>
                <p className="text-[9px] text-muted-foreground">dagars streak</p>
              </div>
            </CardContent>
          </Card>
        );
      case 'strength':
        return (
          <Card 
            className="h-full overflow-hidden cursor-pointer bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20 hover:border-orange-500/40 transition-all"
            onClick={() => !isEditing && navigate('/training')}
          >
            <CardContent className="p-2 h-full flex flex-col justify-between">
              <Dumbbell className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-lg font-bold leading-none">{weeklyWorkouts}</p>
                <p className="text-[9px] text-muted-foreground">styrkepass</p>
              </div>
            </CardContent>
          </Card>
        );
      case 'cardio':
        return (
          <Card 
            className="h-full overflow-hidden cursor-pointer bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-pink-500/20 hover:border-pink-500/40 transition-all"
            onClick={() => !isEditing && navigate('/training?tab=cardio')}
          >
            <CardContent className="p-2 h-full flex flex-col justify-between">
              <Footprints className="w-4 h-4 text-pink-500" />
              <div>
                <p className="text-lg font-bold leading-none">{weeklyCardio}</p>
                <p className="text-[9px] text-muted-foreground">kondition</p>
              </div>
            </CardContent>
          </Card>
        );
      case 'wod':
        return (
          <Card 
            className="h-full overflow-hidden cursor-pointer bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40 transition-all"
            onClick={() => !isEditing && navigate('/training?tab=crossfit')}
          >
            <CardContent className="p-2 h-full flex flex-col justify-between">
              <Zap className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm font-medium leading-none">WOD</p>
                <p className="text-[9px] text-muted-foreground">CrossFit</p>
              </div>
            </CardContent>
          </Card>
        );
      case 'stats':
        return (
          <Card 
            className="h-full overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => !isEditing && navigate('/stats')}
          >
            <CardContent className="p-2 h-full flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium">Statistik</span>
            </CardContent>
          </Card>
        );
      case 'social':
        return (
          <Card 
            className="h-full overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => !isEditing && navigate('/social')}
          >
            <CardContent className="p-2 h-full flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-medium">Tävlingar</span>
            </CardContent>
          </Card>
        );
      case 'account':
        return (
          <Card 
            className="h-full overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => !isEditing && navigate('/account')}
          >
            <CardContent className="p-2 h-full flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-medium">Konto</span>
            </CardContent>
          </Card>
        );
      case 'weight':
        return (
          <Card 
            className="h-full overflow-hidden cursor-pointer bg-gradient-to-br from-purple-500/10 to-violet-500/10 border-purple-500/20 hover:border-purple-500/40 transition-all"
            onClick={() => !isEditing && navigate('/account?section=weight')}
          >
            <CardContent className="p-2 h-full flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-500" />
              <span className="text-xs font-medium">Vikt</span>
            </CardContent>
          </Card>
        );
      case 'calendar':
        return (
          <Card 
            className="h-full overflow-hidden cursor-pointer bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:border-blue-500/40 transition-all"
            onClick={() => !isEditing && navigate('/training?tab=calendar')}
          >
            <CardContent className="p-2 h-full flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-medium">Kalender</span>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

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

      <div className={`flex flex-col gap-1 ${className}`}>
        {/* Settings buttons */}
        <div className="flex justify-end gap-1">
          {isEditing ? (
            <Button
              variant="default"
              size="sm"
              className="h-6 px-2"
              onClick={() => setIsEditing(false)}
            >
              <Check className="w-3 h-3 mr-1" />
              <span className="text-xs">Klar</span>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditing(true)}
              >
                <GripVertical className="w-3 h-3 mr-1" />
                <span className="text-xs">Ordna</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSettings(true)}
              >
                <Settings2 className="w-3 h-3 mr-1" />
                <span className="text-xs">Anpassa</span>
              </Button>
            </>
          )}
        </div>

        {/* Compact grid with drag-and-drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={enabledWidgets} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-1.5">
              {enabledWidgets.map((widgetId) => (
                <SortableWidget key={widgetId} id={widgetId} isEditing={isEditing}>
                  {renderWidget(widgetId)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}
