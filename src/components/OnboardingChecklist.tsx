import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  Dumbbell, 
  ClipboardList, 
  Users, 
  Target,
  ChevronRight,
  X,
  Sparkles,
  Trophy
} from 'lucide-react';

interface OnboardingChecklistProps {
  userId: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  actionLabel: string;
  completed: boolean;
}

export default function OnboardingChecklist({ userId }: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasShownCompletion, setHasShownCompletion] = useState(false);
  const [hasProgram, setHasProgram] = useState(false);
  const [hasWorkout, setHasWorkout] = useState(false);
  const [hasFriend, setHasFriend] = useState(false);
  const [hasGoal, setHasGoal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem(`onboarding_dismissed_${userId}`);
    const completionShown = localStorage.getItem(`onboarding_completed_${userId}`);
    if (dismissed) {
      setIsDismissed(true);
    }
    if (completionShown) {
      setHasShownCompletion(true);
    }
    fetchProgress();
  }, [userId]);

  const fetchProgress = async () => {
    try {
      const [programsRes, workoutsRes, friendsRes, goalsRes] = await Promise.all([
        supabase.from('workout_programs').select('id').is('deleted_at', null).limit(1),
        supabase.from('workout_logs').select('id').limit(1),
        supabase.from('friendships').select('id').eq('status', 'accepted').limit(1),
        supabase.from('exercise_goals').select('id').limit(1),
      ]);

      setHasProgram((programsRes.data?.length ?? 0) > 0);
      setHasWorkout((workoutsRes.data?.length ?? 0) > 0);
      setHasFriend((friendsRes.data?.length ?? 0) > 0);
      setHasGoal((goalsRes.data?.length ?? 0) > 0);
    } catch (error) {
      console.error('Error fetching onboarding progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(`onboarding_dismissed_${userId}`, 'true');
    setIsDismissed(true);
  };

  // Check if user has a scheduled workout
  const [hasSchedule, setHasSchedule] = useState(false);

  useEffect(() => {
    const checkSchedule = async () => {
      const { data } = await supabase
        .from('scheduled_workouts')
        .select('id')
        .limit(1);
      setHasSchedule((data?.length ?? 0) > 0);
    };
    checkSchedule();
  }, []);

  const items: ChecklistItem[] = [
    {
      id: 'program',
      title: 'Skapa ditt träningsprogram',
      description: 'Låt AI generera ett personligt program',
      icon: Dumbbell,
      action: () => {
        const generatorSection = document.getElementById('program-generator');
        if (generatorSection) {
          generatorSection.scrollIntoView({ behavior: 'smooth' });
        }
      },
      actionLabel: 'Skapa program',
      completed: hasProgram,
    },
    {
      id: 'schedule',
      title: 'Schemalägg ditt första pass',
      description: 'Planera när du ska träna',
      icon: ClipboardList,
      action: () => navigate('/training'),
      actionLabel: 'Schemalägg',
      completed: hasSchedule || hasWorkout,
    },
    {
      id: 'goal',
      title: 'Sätt ett träningsmål',
      description: 'Definiera ett mål för en övning',
      icon: Target,
      action: () => navigate('/stats'),
      actionLabel: 'Se statistik',
      completed: hasGoal,
    },
    {
      id: 'friend',
      title: 'Lägg till en vän',
      description: 'Bjud in vänner och tävla tillsammans',
      icon: Users,
      action: () => navigate('/social'),
      actionLabel: 'Gå till socialt',
      completed: hasFriend,
    },
  ];

  const completedCount = items.filter(item => item.completed).length;
  const progressPercentage = (completedCount / items.length) * 100;
  const allCompleted = completedCount === items.length;

  // Don't show if dismissed or still loading
  if (isDismissed || loading) return null;

  // If all completed and already shown completion message before, don't show anything
  if (allCompleted && hasShownCompletion) return null;

  // Show celebration briefly when all completed for the first time, then hide forever
  if (allCompleted && !hasShownCompletion) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onAnimationComplete={() => {
            setTimeout(() => {
              localStorage.setItem(`onboarding_completed_${userId}`, 'true');
              setHasShownCompletion(true);
              setIsVisible(false);
            }, 3000);
          }}
        >
          {isVisible && (
            <Card className="mb-6 border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-14 h-14 bg-gradient-to-br from-primary to-gym-amber rounded-xl flex items-center justify-center"
                  >
                    <Trophy className="w-7 h-7 text-primary-foreground" />
                  </motion.div>
                  <div>
                    <h3 className="font-display font-bold text-lg flex items-center gap-2">
                      Fantastiskt jobbat! 
                      <Sparkles className="w-5 h-5 text-primary" />
                    </h3>
                    <p className="text-muted-foreground">
                      Du har slutfört alla kom igång-steg. Nu kör vi! 💪
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="mb-6 border-border/50 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-gym-amber rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg font-display">Kom igång</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {completedCount} av {items.length} steg klara
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Progress value={progressPercentage} className="h-2 mt-3" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    item.completed 
                      ? 'bg-primary/5' 
                      : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    item.completed 
                      ? 'bg-primary/20' 
                      : 'bg-muted'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      item.completed ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={`font-medium text-sm ${
                        item.completed ? 'line-through text-muted-foreground' : ''
                      }`}>
                        {item.title}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6 truncate">
                      {item.description}
                    </p>
                  </div>
                  
                  {!item.completed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={item.action}
                    >
                      {item.actionLabel}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
