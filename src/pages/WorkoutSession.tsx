import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Clock, 
  Dumbbell, 
  Pause, 
  Play, 
  Save, 
  Target, 
  Trophy, 
  X,
  ChevronLeft,
  Weight,
  Repeat,
  Sparkles,
  ChevronsUpDown,
  Instagram,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import confetti from 'canvas-confetti';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ShareToInstagramDialog from '@/components/ShareToInstagramDialog';

interface SetDetail {
  reps: number;
  weight: number;
  completed?: boolean;
}

interface ExerciseLogEntry {
  exercise_name: string;
  sets_completed: number;
  reps_completed: string;
  weight_kg: string;
  notes: string;
  set_details: SetDetail[];
  programSets?: number;
  programReps?: string;
}

interface PersonalBest {
  exercise_name: string;
  best_weight_kg: number;
  best_reps: number | null;
}

interface ExerciseGoal {
  exercise_name: string;
  target_weight_kg: number | null;
  target_reps: number | null;
}

interface WorkoutSessionData {
  programId: string;
  programName: string;
  dayIndex: string;
  dayName: string;
  exercises: ExerciseLogEntry[];
  startedAt: number;
}

const SESSION_STORAGE_KEY = 'active_workout_session';

// Helper component for comparison display
function ComparisonItem({ label, current, previous, unit = '' }: { 
  label: string; 
  current: number; 
  previous: number; 
  unit?: string;
}) {
  const diff = current - previous;
  const isPositive = diff > 0;
  const isNegative = diff < 0;
  
  return (
    <div className="flex items-center justify-between p-2 bg-background/50 rounded">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {isPositive && <TrendingUp className="w-3 h-3 text-green-500" />}
        {isNegative && <TrendingDown className="w-3 h-3 text-red-500" />}
        {diff === 0 && <Minus className="w-3 h-3 text-muted-foreground" />}
        <span className={
          isPositive ? 'text-green-500 font-medium' : 
          isNegative ? 'text-red-500 font-medium' : 
          'text-muted-foreground'
        }>
          {isPositive ? '+' : ''}{diff}{unit ? ` ${unit}` : ''}
        </span>
      </div>
    </div>
  );
}

export default function WorkoutSession() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [sessionData, setSessionData] = useState<WorkoutSessionData | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [personalBests, setPersonalBests] = useState<Map<string, PersonalBest>>(new Map());
  const [exerciseGoals, setExerciseGoals] = useState<Map<string, ExerciseGoal>>(new Map());
  const [showSummary, setShowSummary] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [savedSessionName, setSavedSessionName] = useState('');
  const [summaryData, setSummaryData] = useState<{
    totalSets: number;
    totalReps: number;
    durationMinutes: number;
    xpEarned: number;
    newPBs: string[];
    totalWeight: number;
    exerciseCount: number;
    comparison: {
      prevTotalSets: number;
      prevTotalReps: number;
      prevDurationMinutes: number;
      prevTotalWeight: number;
      prevDate: string;
    } | null;
  } | null>(null);

  // Load session from storage
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored) as WorkoutSessionData;
        setSessionData(data);
        setElapsedTime(Math.floor((Date.now() - data.startedAt) / 1000));
      } catch {
        navigate('/training');
      }
    } else {
      navigate('/training');
    }
  }, [navigate]);

  // Fetch personal bests and goals
  useEffect(() => {
    if (user && sessionData) {
      fetchPersonalBests();
      fetchExerciseGoals();
    }
  }, [user, sessionData]);

  const fetchPersonalBests = async () => {
    const { data } = await supabase.from('personal_bests').select('*');
    if (data) {
      const map = new Map<string, PersonalBest>();
      data.forEach(pb => map.set(pb.exercise_name, pb));
      setPersonalBests(map);
    }
  };

  const fetchExerciseGoals = async () => {
    const { data } = await supabase.from('exercise_goals').select('*');
    if (data) {
      const map = new Map<string, ExerciseGoal>();
      data.forEach(goal => map.set(goal.exercise_name, goal));
      setExerciseGoals(map);
    }
  };

  // Timer
  useEffect(() => {
    if (!sessionData || isPaused) return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - sessionData.startedAt) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [sessionData, isPaused]);

  // Save session to storage on changes
  useEffect(() => {
    if (sessionData) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    }
  }, [sessionData]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const updateSetDetail = useCallback((setIndex: number, field: 'reps' | 'weight', value: number) => {
    if (!sessionData) return;
    
    setSessionData(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      const exercise = { ...newExercises[currentExerciseIndex] };
      const newSetDetails = [...exercise.set_details];
      newSetDetails[setIndex] = { ...newSetDetails[setIndex], [field]: value };
      
      const maxWeight = Math.max(...newSetDetails.map(s => s.weight));
      const totalReps = newSetDetails.map(s => s.reps).join(', ');
      
      exercise.set_details = newSetDetails;
      exercise.weight_kg = maxWeight > 0 ? maxWeight.toString() : '';
      exercise.reps_completed = totalReps;
      newExercises[currentExerciseIndex] = exercise;
      
      return { ...prev, exercises: newExercises };
    });
  }, [sessionData, currentExerciseIndex]);

  const toggleSetComplete = useCallback((setIndex: number) => {
    if (!sessionData) return;
    
    setSessionData(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      const exercise = { ...newExercises[currentExerciseIndex] };
      const newSetDetails = [...exercise.set_details];
      newSetDetails[setIndex] = { 
        ...newSetDetails[setIndex], 
        completed: !newSetDetails[setIndex].completed 
      };
      exercise.set_details = newSetDetails;
      newExercises[currentExerciseIndex] = exercise;
      return { ...prev, exercises: newExercises };
    });
  }, [sessionData, currentExerciseIndex]);

  const addSet = useCallback(() => {
    if (!sessionData) return;
    
    setSessionData(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      const exercise = { ...newExercises[currentExerciseIndex] };
      const lastSet = exercise.set_details[exercise.set_details.length - 1] || { reps: 10, weight: 0 };
      exercise.set_details = [...exercise.set_details, { ...lastSet, completed: false }];
      exercise.sets_completed = exercise.set_details.length;
      newExercises[currentExerciseIndex] = exercise;
      return { ...prev, exercises: newExercises };
    });
  }, [sessionData, currentExerciseIndex]);

  const removeSet = useCallback((setIndex: number) => {
    if (!sessionData) return;
    
    setSessionData(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      const exercise = { ...newExercises[currentExerciseIndex] };
      if (exercise.set_details.length <= 1) return prev;
      exercise.set_details = exercise.set_details.filter((_, i) => i !== setIndex);
      exercise.sets_completed = exercise.set_details.length;
      newExercises[currentExerciseIndex] = exercise;
      return { ...prev, exercises: newExercises };
    });
  }, [sessionData, currentExerciseIndex]);

  const handleSaveWorkout = async () => {
    if (!sessionData || !user) return;
    
    // Validate exercises exist before saving
    if (!sessionData.exercises || sessionData.exercises.length === 0) {
      toast.error('Inga övningar att spara');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const { data: workoutLog, error: workoutError } = await supabase
        .from('workout_logs')
        .insert([{
          user_id: user.id,
          program_id: sessionData.programId,
          workout_day: sessionData.dayName,
          duration_minutes: Math.round(elapsedTime / 60) || null,
          notes: workoutNotes || null
        }])
        .select()
        .single();

      if (workoutError) throw workoutError;

      const exerciseLogData = sessionData.exercises.map(log => {
        // Parse weight safely - handle empty strings and invalid values
        let weightKg: number | null = null;
        if (log.weight_kg && log.weight_kg.trim() !== '') {
          const parsed = parseFloat(log.weight_kg);
          if (!isNaN(parsed)) {
            weightKg = parsed;
          }
        }
        
        return {
          workout_log_id: workoutLog.id,
          exercise_name: log.exercise_name,
          sets_completed: log.sets_completed,
          reps_completed: log.reps_completed || '0',
          weight_kg: weightKg,
          notes: log.notes || null,
          set_details: log.set_details && log.set_details.length > 0 ? JSON.parse(JSON.stringify(log.set_details)) : null
        };
      });

      console.log('Saving exercise logs:', exerciseLogData);

      const { error: exerciseError } = await supabase
        .from('exercise_logs')
        .insert(exerciseLogData);

      if (exerciseError) {
        console.error('Exercise log error:', exerciseError);
        // If exercise logs fail, delete the workout log to maintain consistency
        await supabase.from('workout_logs').delete().eq('id', workoutLog.id);
        throw exerciseError;
      }

      // Check for new PBs
      const newPBsList: string[] = [];
      for (const log of sessionData.exercises) {
        if (!log.weight_kg) continue;
        const weight = parseFloat(log.weight_kg);
        const currentPB = personalBests.get(log.exercise_name);
        
        if (!currentPB || weight > currentPB.best_weight_kg) {
          newPBsList.push(log.exercise_name);
          
          await supabase
            .from('personal_bests')
            .upsert({
              user_id: user.id,
              exercise_name: log.exercise_name,
              best_weight_kg: weight,
              best_reps: parseInt(log.reps_completed) || null,
              achieved_at: new Date().toISOString()
            }, { onConflict: 'user_id,exercise_name' });
        }
      }

      // Update user stats
      const totalSets = sessionData.exercises.reduce((sum, ex) => sum + ex.sets_completed, 0);
      const durationMinutes = Math.round(elapsedTime / 60);
      const xpEarned = 50 + totalSets * 2 + Math.floor(durationMinutes / 5) * 5;

      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('total_workouts, total_sets, total_minutes, total_xp')
        .eq('user_id', user.id)
        .maybeSingle();

      if (currentStats) {
        await supabase
          .from('user_stats')
          .update({
            total_workouts: (currentStats.total_workouts || 0) + 1,
            total_sets: (currentStats.total_sets || 0) + totalSets,
            total_minutes: (currentStats.total_minutes || 0) + durationMinutes,
            total_xp: (currentStats.total_xp || 0) + xpEarned,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      }

      // Calculate summary stats
      const totalReps = sessionData.exercises.reduce((sum, ex) => {
        return sum + ex.set_details.reduce((setSum, set) => setSum + (set.reps || 0), 0);
      }, 0);
      const totalWeight = sessionData.exercises.reduce((sum, ex) => {
        return sum + ex.set_details.reduce((setSum, set) => setSum + ((set.weight || 0) * (set.reps || 0)), 0);
      }, 0);

      // Fetch previous workout for comparison (skip the one we just created)
      let comparison = null;
      const { data: prevWorkout } = await supabase
        .from('workout_logs')
        .select('id, duration_minutes, completed_at')
        .eq('user_id', user.id)
        .eq('program_id', sessionData.programId)
        .eq('workout_day', sessionData.dayName)
        .neq('id', workoutLog.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevWorkout) {
        const { data: prevExercises } = await supabase
          .from('exercise_logs')
          .select('sets_completed, set_details')
          .eq('workout_log_id', prevWorkout.id);

        if (prevExercises) {
          const prevTotalSets = prevExercises.reduce((sum, ex) => sum + ex.sets_completed, 0);
          const prevTotalReps = prevExercises.reduce((sum, ex) => {
            const details = ex.set_details as unknown as SetDetail[] | null;
            if (!details || !Array.isArray(details)) return sum;
            return sum + details.reduce((setSum, set) => setSum + (set.reps || 0), 0);
          }, 0);
          const prevTotalWeight = prevExercises.reduce((sum, ex) => {
            const details = ex.set_details as unknown as SetDetail[] | null;
            if (!details || !Array.isArray(details)) return sum;
            return sum + details.reduce((setSum, set) => setSum + ((set.weight || 0) * (set.reps || 0)), 0);
          }, 0);

          comparison = {
            prevTotalSets,
            prevTotalReps,
            prevDurationMinutes: prevWorkout.duration_minutes || 0,
            prevTotalWeight,
            prevDate: new Date(prevWorkout.completed_at).toLocaleDateString('sv-SE')
          };
        }
      }

      setSummaryData({
        totalSets,
        totalReps,
        durationMinutes,
        xpEarned,
        newPBs: newPBsList,
        totalWeight,
        exerciseCount: sessionData.exercises.length,
        comparison
      });

      if (newPBsList.length > 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      // Save session name for sharing and clear session
      setSavedSessionName(sessionData.dayName);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setShowSummary(true);
      
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('Kunde inte spara passet');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExit = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    navigate('/training');
  };

  if (!sessionData && !showSummary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Laddar...</div>
      </div>
    );
  }

  // Summary Screen
  if (showSummary && summaryData) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-center p-4">
            <h1 className="font-display font-bold text-lg">Träningspass avslutat!</h1>
          </div>
        </header>

        <main className="flex-1 p-4 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md space-y-6"
          >
            {/* Success icon */}
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-green-500" />
              </motion.div>
            </div>

            {/* XP Earned */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold text-primary">+{summaryData.xpEarned} XP</span>
              </div>
            </motion.div>

            {/* New PBs */}
            {summaryData.newPBs.length > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-gym-orange bg-gym-orange/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="w-5 h-5 text-gym-orange" />
                      <h3 className="font-bold text-gym-orange">Nya personbästa!</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {summaryData.newPBs.map((pb, idx) => (
                        <Badge key={idx} variant="secondary" className="bg-gym-orange/20 text-gym-orange border-0">
                          {pb}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Comparison with previous workout */}
            {summaryData.comparison && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <h3 className="font-medium text-sm">Jämfört med {summaryData.comparison.prevDate}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <ComparisonItem 
                        label="Tid" 
                        current={summaryData.durationMinutes} 
                        previous={summaryData.comparison.prevDurationMinutes}
                        unit="min"
                      />
                      <ComparisonItem 
                        label="Set" 
                        current={summaryData.totalSets} 
                        previous={summaryData.comparison.prevTotalSets}
                      />
                      <ComparisonItem 
                        label="Reps" 
                        current={summaryData.totalReps} 
                        previous={summaryData.comparison.prevTotalReps}
                      />
                      <ComparisonItem 
                        label="Total vikt" 
                        current={Math.round(summaryData.totalWeight)} 
                        previous={Math.round(summaryData.comparison.prevTotalWeight)}
                        unit="kg"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Stats Grid */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: summaryData.comparison ? 0.6 : 0.5 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">{summaryData.durationMinutes}</p>
                      <p className="text-xs text-muted-foreground">minuter</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <Dumbbell className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">{summaryData.exerciseCount}</p>
                      <p className="text-xs text-muted-foreground">övningar</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <Repeat className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">{summaryData.totalSets}</p>
                      <p className="text-xs text-muted-foreground">set</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/50 rounded-lg">
                      <Weight className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-2xl font-bold">{Math.round(summaryData.totalWeight)}</p>
                      <p className="text-xs text-muted-foreground">kg totalt</p>
                    </div>
                  </div>
                  <div className="mt-4 text-center p-3 bg-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground">Totalt antal reps</p>
                    <p className="text-3xl font-bold text-primary">{summaryData.totalReps}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="space-y-3"
            >
              <Button 
                variant="outline"
                className="w-full" 
                size="lg"
                onClick={() => setShowShareDialog(true)}
              >
                <Instagram className="w-4 h-4 mr-2" />
                Dela på Instagram
              </Button>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => navigate('/training')}
              >
                Tillbaka till träning
              </Button>
            </motion.div>
          </motion.div>
        </main>

        <ShareToInstagramDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          workoutData={{
            dayName: savedSessionName || 'Träningspass',
            duration: summaryData.durationMinutes,
            exerciseCount: summaryData.exerciseCount,
            totalSets: summaryData.totalSets,
            newPBs: summaryData.newPBs
          }}
        />
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Laddar...</div>
      </div>
    );
  }

  const currentExercise = sessionData.exercises[currentExerciseIndex];
  const progress = ((currentExerciseIndex + 1) / sessionData.exercises.length) * 100;
  const completedSets = currentExercise.set_details.filter(s => s.completed).length;
  const pb = personalBests.get(currentExercise.exercise_name);
  const goal = exerciseGoals.get(currentExercise.exercise_name);
  const currentMaxWeight = Math.max(...currentExercise.set_details.map(s => s.weight), 0);
  const isNewPB = pb && currentMaxWeight > pb.best_weight_kg;
  const isGoalReached = goal?.target_weight_kg && currentMaxWeight >= goal.target_weight_kg;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => setShowExitDialog(true)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <div className="text-center flex-1">
            <p className="text-xs text-muted-foreground">{sessionData.programName}</p>
            <h1 className="font-display font-bold text-sm">{sessionData.dayName}</h1>
          </div>
          
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isPaused ? 'bg-muted' : 'bg-primary/10'}`}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 p-0"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </Button>
            <Clock className={`h-3 w-3 ${isPaused ? 'text-muted-foreground' : 'text-primary'}`} />
            <span className={`font-mono text-sm font-bold ${isPaused ? 'text-muted-foreground' : 'text-primary'}`}>
              {formatTime(elapsedTime)}
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Övning {currentExerciseIndex + 1} av {sessionData.exercises.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentExerciseIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Exercise dropdown and badges */}
            <div className="text-center space-y-3">
              <Select
                value={currentExerciseIndex.toString()}
                onValueChange={(value) => setCurrentExerciseIndex(parseInt(value))}
              >
                <SelectTrigger className="mx-auto w-auto min-w-[200px] max-w-full text-center">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-muted-foreground" />
                    <SelectValue>
                      <span className="text-lg font-display font-bold">{currentExercise.exercise_name}</span>
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {sessionData.exercises.map((ex, idx) => {
                    const exCompletedSets = ex.set_details.filter(s => s.completed).length;
                    const exTotalSets = ex.set_details.length;
                    const isComplete = exCompletedSets === exTotalSets && exTotalSets > 0;
                    return (
                      <SelectItem key={idx} value={idx.toString()}>
                        <div className="flex items-center gap-2">
                          {isComplete ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <span className="w-4 h-4 flex items-center justify-center text-xs text-muted-foreground">
                              {idx + 1}
                            </span>
                          )}
                          <span className={isComplete ? 'text-muted-foreground' : ''}>{ex.exercise_name}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            ({exCompletedSets}/{exTotalSets})
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {currentExercise.programSets && currentExercise.programReps && (
                  <Badge variant="outline" className="text-xs">
                    Mål: {currentExercise.programSets} × {currentExercise.programReps}
                  </Badge>
                )}
                {pb && (
                  <Badge variant="secondary" className="text-xs">
                    <Trophy className="w-3 h-3 mr-1 text-gym-orange" />
                    PB: {pb.best_weight_kg} kg
                  </Badge>
                )}
                {goal?.target_weight_kg && (
                  <Badge variant="secondary" className="text-xs">
                    <Target className="w-3 h-3 mr-1 text-green-500" />
                    Mål: {goal.target_weight_kg} kg
                  </Badge>
                )}
              </div>
              {isNewPB && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-1 text-gym-orange font-bold"
                >
                  <Sparkles className="w-4 h-4" />
                  NYTT PERSONBÄSTA!
                </motion.div>
              )}
              {isGoalReached && !isNewPB && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-1 text-green-500 font-bold"
                >
                  <Trophy className="w-4 h-4" />
                  MÅL UPPNÅTT!
                </motion.div>
              )}
            </div>

            {/* Sets */}
            <Card className={isNewPB ? 'border-gym-orange' : isGoalReached ? 'border-green-500' : ''}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    Set ({completedSets}/{currentExercise.set_details.length})
                  </h3>
                  <Button variant="outline" size="sm" onClick={addSet}>
                    + Lägg till set
                  </Button>
                </div>

                <div className="space-y-2">
                  {currentExercise.set_details.map((set, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        set.completed 
                          ? 'bg-green-500/10 border border-green-500/30' 
                          : 'bg-secondary/50'
                      }`}
                    >
                      <Button
                        variant={set.completed ? "default" : "outline"}
                        size="icon"
                        className={`h-8 w-8 shrink-0 ${set.completed ? 'bg-green-500 hover:bg-green-600' : ''}`}
                        onClick={() => toggleSetComplete(idx)}
                      >
                        {set.completed ? <Check className="h-4 w-4" /> : <span className="text-sm">{idx + 1}</span>}
                      </Button>

                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Weight className="w-3 h-3" /> Vikt (kg)
                          </label>
                          <Input
                            type="number"
                            value={set.weight || ''}
                            onChange={(e) => updateSetDetail(idx, 'weight', parseFloat(e.target.value) || 0)}
                            className="h-10 text-center font-mono text-lg"
                            step="0.5"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Repeat className="w-3 h-3" /> Reps
                          </label>
                          <Input
                            type="number"
                            value={set.reps || ''}
                            onChange={(e) => updateSetDetail(idx, 'reps', parseInt(e.target.value) || 0)}
                            className="h-10 text-center font-mono text-lg"
                          />
                        </div>
                      </div>

                      {currentExercise.set_details.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeSet(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick navigation dots */}
            <div className="flex items-center justify-center gap-1.5 py-2">
              {sessionData.exercises.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentExerciseIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentExerciseIndex 
                      ? 'w-6 bg-primary' 
                      : idx < currentExerciseIndex 
                        ? 'bg-green-500' 
                        : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom navigation */}
      <footer className="sticky bottom-0 bg-background/95 backdrop-blur border-t p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="flex-1"
            disabled={currentExerciseIndex === 0}
            onClick={() => setCurrentExerciseIndex(prev => prev - 1)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Föregående
          </Button>
          
          {currentExerciseIndex === sessionData.exercises.length - 1 ? (
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleSaveWorkout}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="animate-pulse">Sparar...</span>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Avsluta pass
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="default"
              className="flex-1"
              onClick={() => setCurrentExerciseIndex(prev => prev + 1)}
            >
              Nästa
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
        
        {/* Notes section on last exercise */}
        {currentExerciseIndex === sessionData.exercises.length - 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4"
          >
            <Textarea
              placeholder="Anteckningar om passet (valfritt)..."
              value={workoutNotes}
              onChange={(e) => setWorkoutNotes(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </motion.div>
        )}
      </footer>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta pass?</AlertDialogTitle>
            <AlertDialogDescription>
              Vill du avsluta passet utan att spara? Dina framsteg kommer att gå förlorade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fortsätt träna</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExit}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Avsluta utan att spara
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
