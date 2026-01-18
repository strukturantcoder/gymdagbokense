import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, ChevronRight, Dumbbell, Heart, Scale, Calendar, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { differenceInDays, format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';

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
}

interface GoalProgressCardProps {
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

export default function GoalProgressCard({ onAddGoal, refreshTrigger }: GoalProgressCardProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);

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
        .limit(3);

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (goal: UserGoal): number => {
    if (!goal.target_value || goal.target_value === 0) return 0;
    const current = goal.current_value || 0;
    return Math.min(100, Math.round((current / goal.target_value) * 100));
  };

  const getDaysRemaining = (goal: UserGoal): string | null => {
    if (!goal.target_date) return null;
    const days = differenceInDays(parseISO(goal.target_date), new Date());
    if (days < 0) return 'Förfallen';
    if (days === 0) return 'Idag';
    if (days === 1) return '1 dag kvar';
    return `${days} dagar kvar`;
  };

  if (loading) {
    return (
      <Card className="col-span-full lg:col-span-2">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card className="col-span-full lg:col-span-2 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sätt ditt första mål</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Vad vill du uppnå med din träning? AI:n hjälper dig formulera konkreta mål.
            </p>
            <Button 
              onClick={onAddGoal}
              className="bg-gradient-to-r from-gym-orange to-gym-amber hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Skapa mål med AI
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Dina mål
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onAddGoal}>
            <Plus className="w-4 h-4 mr-1" />
            Lägg till
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.map((goal, index) => {
          const progress = calculateProgress(goal);
          const daysRemaining = getDaysRemaining(goal);
          const gradientClass = goalTypeColors[goal.goal_type] || goalTypeColors.custom;
          
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white`}>
                    {goalTypeIcons[goal.goal_type] || goalTypeIcons.custom}
                  </div>
                  <div>
                    <h4 className="font-medium text-sm leading-tight">{goal.title}</h4>
                    {daysRemaining && (
                      <span className="text-xs text-muted-foreground">{daysRemaining}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold">{progress}%</span>
                  {progress >= 100 && (
                    <Trophy className="w-4 h-4 text-yellow-500 inline-block ml-1" />
                  )}
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between items-center mt-1.5 text-xs text-muted-foreground">
                <span>{goal.current_value || 0} / {goal.target_value} {goal.target_unit}</span>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
