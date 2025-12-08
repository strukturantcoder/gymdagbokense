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
  ChevronsUpDown
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

      const exerciseLogData = sessionData.exercises.map(log => ({
        workout_log_id: workoutLog.id,
        exercise_name: log.exercise_name,
        sets_completed: log.sets_completed,
        reps_completed: log.reps_completed,
        weight_kg: log.weight_kg ? parseFloat(log.weight_kg) : null,
        notes: log.notes || null,
        set_details: log.set_details.length > 0 ? JSON.parse(JSON.stringify(log.set_details)) : null
      }));

      const { error: exerciseError } = await supabase
        .from('exercise_logs')
        .insert(exerciseLogData);

      if (exerciseError) throw exerciseError;

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

      if (newPBsList.length > 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        toast.success(`🎉 NYTT PERSONBÄSTA! ${newPBsList.join(', ')}`, { duration: 5000 });
      } else {
        toast.success('Träningspass sparat!');
      }

      // Clear session
      localStorage.removeItem(SESSION_STORAGE_KEY);
      navigate('/training');
      
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
