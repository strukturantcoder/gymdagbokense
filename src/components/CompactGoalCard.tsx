import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, Plus, Edit2, Dumbbell, Heart, Scale, Calendar, Trophy, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { differenceInDays, parseISO } from 'date-fns';
import EditGoalDialog from './EditGoalDialog';
import WeightLogDialog from './WeightLogDialog';

interface UserGoal {
  id: string;
  title: string;
  description: string | null;
  goal_type: string;
  target_value: number | null;
  target_unit: string | null;
  current_value: number | null;
  start_date: string;
  target_date: string | null;
  status: string;
  reminder_enabled?: boolean;
  reminder_frequency?: string;
}

interface CompactGoalCardProps {
  onAddGoal: () => void;
  refreshTrigger?: number;
}

const goalTypeIcons: Record<string, React.ReactNode> = {
  strength: <Dumbbell className="w-4 h-4" />,
  cardio: <Heart className="w-4 h-4" />,
  weight: <Scale className="w-4 h-4" />,
  habit: <Calendar className="w-4 h-4" />,
  custom: <Target className="w-4 h-4" />,
};

const goalTypeColors: Record<string, string> = {
  strength: 'from-orange-500 to-red-500',
  cardio: 'from-pink-500 to-rose-500',
  weight: 'from-blue-500 to-cyan-500',
  habit: 'from-green-500 to-emerald-500',
  custom: 'from-purple-500 to-violet-500',
};

export default function CompactGoalCard({ onAddGoal, refreshTrigger }: CompactGoalCardProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState<UserGoal | null>(null);
  const [showWeightDialog, setShowWeightDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user, refreshTrigger]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(2);

      if (error) throw error;
      setGoals((data as UserGoal[]) || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (goal: UserGoal): number => {
    if (!goal.target_value || goal.target_value === 0) return 0;
    const current = goal.current_value || 0;
    
    // For weight loss goals, progress is inverted
    if (goal.goal_type === 'weight' && goal.target_value < current) {
      const startValue = goal.current_value || current;
      const targetValue = goal.target_value;
      const progress = ((startValue - current) / (startValue - targetValue)) * 100;
      return Math.min(100, Math.max(0, progress));
    }
    
    return Math.min(100, Math.round((current / goal.target_value) * 100));
  };

  const getDaysRemaining = (goal: UserGoal): string | null => {
    if (!goal.target_date) return null;
    const days = differenceInDays(parseISO(goal.target_date), new Date());
    if (days < 0) return 'Förfallen';
    if (days === 0) return 'Idag';
    if (days === 1) return '1 dag';
    return `${days} dagar`;
  };

  const handleGoalClick = (goal: UserGoal) => {
    if (goal.goal_type === 'weight') {
      setShowWeightDialog(true);
    } else {
      setEditingGoal(goal);
    }
  };

  if (loading) {
    return (
      <Card className="h-full animate-pulse">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <div className="h-6 bg-muted rounded w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <>
        <Card 
          className="h-full cursor-pointer hover:border-primary/50 transition-colors bg-gradient-to-br from-primary/5 to-primary/10"
          onClick={onAddGoal}
        >
          <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center mb-2">
              <Target className="w-6 h-6 text-primary-foreground" />
            </div>
            <p className="text-sm font-medium">Sätt ditt första mål</p>
            <Button variant="link" size="sm" className="mt-1 p-0 h-auto">
              <Plus className="w-3 h-3 mr-1" />
              Skapa mål
            </Button>
          </CardContent>
        </Card>
        <WeightLogDialog 
          open={showWeightDialog} 
          onOpenChange={setShowWeightDialog}
          onSuccess={fetchGoals}
        />
      </>
    );
  }

  return (
    <>
      <Card className="h-full">
        <CardContent className="p-3 h-full flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold">Mål</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onAddGoal} className="h-6 px-2">
              <Plus className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex-1 space-y-2">
            {goals.map((goal) => {
              const progress = calculateProgress(goal);
              const gradientClass = goalTypeColors[goal.goal_type] || goalTypeColors.custom;
              const daysRemaining = getDaysRemaining(goal);

              return (
                <motion.div
                  key={goal.id}
                  className="p-2 rounded-lg bg-muted/50 hover:bg-muted/80 cursor-pointer transition-colors"
                  onClick={() => handleGoalClick(goal)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-6 h-6 rounded bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white flex-shrink-0`}>
                      {goalTypeIcons[goal.goal_type] || goalTypeIcons.custom}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium truncate">{goal.title}</p>
                        <div className="flex items-center gap-1">
                          {progress >= 100 && <Trophy className="w-3 h-3 text-yellow-500" />}
                          <span className="text-xs font-bold">{progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                  {daysRemaining && (
                    <p className="text-[10px] text-muted-foreground mt-1">{daysRemaining} kvar</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <EditGoalDialog
        goal={editingGoal}
        open={!!editingGoal}
        onOpenChange={(open) => !open && setEditingGoal(null)}
        onSave={fetchGoals}
      />

      <WeightLogDialog 
        open={showWeightDialog} 
        onOpenChange={setShowWeightDialog}
        onSuccess={fetchGoals}
      />
    </>
  );
}
