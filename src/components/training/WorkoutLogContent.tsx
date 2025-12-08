import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dumbbell, Plus, Save, Loader2, Calendar, Clock, Weight, Timer, Target, Trophy, Star, Sparkles, ChevronDown, ChevronUp, WifiOff, Trash2, Copy } from 'lucide-react';
import RestTimer from '@/components/RestTimer';
import ExerciseInfo from '@/components/ExerciseInfo';
import AdBanner from '@/components/AdBanner';
import ShareToInstagramDialog from '@/components/ShareToInstagramDialog';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import confetti from 'canvas-confetti';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
}

interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[];
}

interface ProgramData {
  name: string;
  days: WorkoutDay[];
}

interface WorkoutProgram {
  id: string;
  name: string;
  program_data: ProgramData;
}

interface SetDetail {
  reps: number;
  weight: number;
}

interface ExerciseLogEntry {
  exercise_name: string;
  sets_completed: number;
  reps_completed: string;
  weight_kg: string;
  notes: string;
  set_details: SetDetail[];
  expanded: boolean;
}

interface WorkoutLogEntry {
  id: string;
  workout_day: string;
  duration_minutes: number | null;
  notes: string | null;
  completed_at: string;
  program_id: string | null;
  exercise_logs?: {
    exercise_name: string;
    sets_completed: number;
    reps_completed: string;
    weight_kg: number | null;
  }[];
}

interface PersonalBest {
  exercise_name: string;
  best_weight_kg: number;
  best_reps: number | null;
  achieved_at: string;
}

interface ExerciseGoal {
  exercise_name: string;
  target_weight_kg: number | null;
  target_reps: number | null;
}

const DRAFT_STORAGE_KEY = 'gymdagboken_workout_draft';

interface WorkoutDraft {
  selectedProgram: string;
  selectedDay: string;
  duration: string;
  workoutNotes: string;
  exerciseLogs: ExerciseLogEntry[];
  startedAt: number;
  userId: string;
}

export default function WorkoutLogContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isOnline, addPendingLog } = useOfflineSync();
  
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [recentLogs, setRecentLogs] = useState<WorkoutLogEntry[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showDeleteDraftDialog, setShowDeleteDraftDialog] = useState(false);
  
  // New workout form
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [duration, setDuration] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLogEntry[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [autoSuggestLoading, setAutoSuggestLoading] = useState(false);
  
  // Personal bests and goals
  const [personalBests, setPersonalBests] = useState<Map<string, PersonalBest>>(new Map());
  const [exerciseGoals, setExerciseGoals] = useState<Map<string, ExerciseGoal>>(new Map());
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [goalWeight, setGoalWeight] = useState('');
  const [newPBs, setNewPBs] = useState<string[]>([]);
  
  // Share to Instagram
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareData, setShareData] = useState<{
    dayName: string;
    duration?: number;
    exerciseCount: number;
    totalSets: number;
    newPBs?: string[];
    programName?: string;
  } | null>(null);

  // Check for saved draft on mount
  useEffect(() => {
    if (user) {
      const storedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (storedDraft) {
        try {
          const draft: WorkoutDraft = JSON.parse(storedDraft);
          // Only show draft if it belongs to current user and is less than 24 hours old
          if (draft.userId === user.id && Date.now() - draft.startedAt < 24 * 60 * 60 * 1000) {
            setHasDraft(true);
            setShowDraftDialog(true);
          } else {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
          }
        } catch (e) {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      }
    }
  }, [user]);

  // Auto-save draft when logging
  useEffect(() => {
    if (isLogging && user && (selectedProgram || exerciseLogs.length > 0)) {
      const draft: WorkoutDraft = {
        selectedProgram,
        selectedDay,
        duration,
        workoutNotes,
        exerciseLogs,
        startedAt: Date.now(),
        userId: user.id
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [isLogging, selectedProgram, selectedDay, duration, workoutNotes, exerciseLogs, user]);

  const restoreDraft = () => {
    const storedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (storedDraft) {
      try {
        const draft: WorkoutDraft = JSON.parse(storedDraft);
        setSelectedProgram(draft.selectedProgram);
        setSelectedDay(draft.selectedDay);
        setDuration(draft.duration);
        setWorkoutNotes(draft.workoutNotes);
        setExerciseLogs(draft.exerciseLogs);
        setIsLogging(true);
        toast.success('Pågående pass återställt');
      } catch (e) {
        toast.error('Kunde inte återställa passet');
      }
    }
    setShowDraftDialog(false);
    setHasDraft(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setShowDraftDialog(false);
    setHasDraft(false);
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  useEffect(() => {
    if (user) {
      fetchPrograms();
      fetchRecentLogs();
      fetchPersonalBests();
      fetchExerciseGoals();
    }
  }, [user]);

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from('workout_programs')
      .select('id, name, program_data')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPrograms(data.map(p => ({
        ...p,
        program_data: p.program_data as unknown as ProgramData
      })));
    }
  };

  const fetchRecentLogs = async () => {
    const { data, error } = await supabase
      .from('workout_logs')
      .select(`
        id,
        workout_day,
        duration_minutes,
        notes,
        completed_at,
        program_id,
        exercise_logs (
          exercise_name,
          sets_completed,
          reps_completed,
          weight_kg
        )
      `)
      .order('completed_at', { ascending: false })
      .limit(10);
    
    if (!error && data) {
      setRecentLogs(data as WorkoutLogEntry[]);
    }
  };

  const fetchPersonalBests = async () => {
    const { data } = await supabase
      .from('personal_bests')
      .select('*');
    
    if (data) {
      const pbMap = new Map<string, PersonalBest>();
      data.forEach(pb => pbMap.set(pb.exercise_name, pb as PersonalBest));
      setPersonalBests(pbMap);
    }
  };

  const fetchExerciseGoals = async () => {
    const { data } = await supabase
      .from('exercise_goals')
      .select('*');
    
    if (data) {
      const goalMap = new Map<string, ExerciseGoal>();
      data.forEach(g => goalMap.set(g.exercise_name, g as ExerciseGoal));
      setExerciseGoals(goalMap);
    }
  };

  const saveExerciseGoal = async (exerciseName: string, targetWeight: number) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('exercise_goals')
      .upsert({
        user_id: user.id,
        exercise_name: exerciseName,
        target_weight_kg: targetWeight
      }, { onConflict: 'user_id,exercise_name' });
    
    if (!error) {
      toast.success(`Mål satt: ${targetWeight} kg för ${exerciseName}`);
      fetchExerciseGoals();
    }
    setEditingGoal(null);
    setGoalWeight('');
  };

  const handleProgramChange = (programId: string) => {
    setSelectedProgram(programId);
    setSelectedDay('');
    setExerciseLogs([]);
  };

  const handleDayChange = async (dayIndex: string) => {
    setSelectedDay(dayIndex);
    const program = programs.find(p => p.id === selectedProgram);
    if (program) {
      const day = program.program_data.days[parseInt(dayIndex)];
      if (day) {
        const exerciseNames = day.exercises.map(ex => ex.name);
        const { data: lastWeights } = await supabase
          .from('exercise_logs')
          .select('exercise_name, weight_kg, sets_completed, reps_completed')
          .in('exercise_name', exerciseNames)
          .order('created_at', { ascending: false });
        
        const lastValuesMap = new Map<string, { weight: string; sets: number; reps: string }>();
        if (lastWeights) {
          for (const log of lastWeights) {
            if (!lastValuesMap.has(log.exercise_name) && log.weight_kg !== null) {
              lastValuesMap.set(log.exercise_name, {
                weight: log.weight_kg.toString(),
                sets: log.sets_completed,
                reps: log.reps_completed
              });
            }
          }
        }
        
        setExerciseLogs(day.exercises.map(ex => {
          const lastValues = lastValuesMap.get(ex.name);
          const numSets = lastValues?.sets ?? ex.sets;
          const defaultWeight = lastValues?.weight ? parseFloat(lastValues.weight) : 0;
          const defaultReps = parseInt(ex.reps.split('-')[0]) || 10;
          
          const setDetails: SetDetail[] = Array.from({ length: numSets }, () => ({
            reps: defaultReps,
            weight: defaultWeight
          }));
          
          return {
            exercise_name: ex.name,
            sets_completed: numSets,
            reps_completed: lastValues?.reps ?? ex.reps,
            weight_kg: lastValues?.weight ?? '',
            notes: '',
            set_details: setDetails,
            expanded: false
          };
        }));
      }
    }
  };

  const updateExerciseLog = (index: number, field: keyof ExerciseLogEntry, value: string | number | boolean) => {
    setExerciseLogs(prev => prev.map((log, i) => 
      i === index ? { ...log, [field]: value } : log
    ));
  };

  const updateSetDetail = (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => {
    setExerciseLogs(prev => prev.map((log, i) => {
      if (i !== exerciseIndex) return log;
      const newSetDetails = [...log.set_details];
      newSetDetails[setIndex] = { ...newSetDetails[setIndex], [field]: value };
      
      const maxWeight = Math.max(...newSetDetails.map(s => s.weight));
      const totalReps = newSetDetails.map(s => s.reps).join(', ');
      
      return { 
        ...log, 
        set_details: newSetDetails,
        weight_kg: maxWeight > 0 ? maxWeight.toString() : '',
        reps_completed: totalReps
      };
    }));
  };

  const handleSetsChange = (index: number, newSetsCount: number) => {
    setExerciseLogs(prev => prev.map((log, i) => {
      if (i !== index) return log;
      
      const currentSets = log.set_details;
      let newSetDetails: SetDetail[];
      
      if (newSetsCount > currentSets.length) {
        const lastSet = currentSets[currentSets.length - 1] || { reps: 10, weight: 0 };
        newSetDetails = [
          ...currentSets,
          ...Array.from({ length: newSetsCount - currentSets.length }, () => ({ ...lastSet }))
        ];
      } else {
        newSetDetails = currentSets.slice(0, newSetsCount);
      }
      
      return { ...log, sets_completed: newSetsCount, set_details: newSetDetails };
    }));
  };

  const toggleExpanded = (index: number) => {
    updateExerciseLog(index, 'expanded', !exerciseLogs[index].expanded);
  };

  const handleSaveWorkout = async () => {
    if (!selectedProgram || !selectedDay || exerciseLogs.length === 0) {
      toast.error('Välj program och dag först');
      return;
    }

    setIsSaving(true);
    
    const program = programs.find(p => p.id === selectedProgram);
    const dayName = program?.program_data.days[parseInt(selectedDay)]?.day || `Dag ${parseInt(selectedDay) + 1}`;

    // If offline, save to pending queue
    if (!isOnline) {
      const exerciseData = exerciseLogs.map(log => ({
        exercise_name: log.exercise_name,
        sets_completed: log.sets_completed,
        reps_completed: log.reps_completed,
        weight_kg: log.weight_kg ? parseFloat(log.weight_kg) : undefined,
        notes: log.notes || undefined,
        set_details: log.set_details.length > 0 ? log.set_details : undefined
      }));

      addPendingLog({
        type: 'workout',
        id: `workout_${Date.now()}`,
        data: {
          user_id: user!.id,
          workout_day: dayName,
          program_id: selectedProgram,
          duration_minutes: duration ? parseInt(duration) : undefined,
          notes: workoutNotes || undefined,
          completed_at: new Date().toISOString()
        },
        exercises: exerciseData
      });

      const shareProgram = programs.find(p => p.id === selectedProgram);
      setShareData({
        dayName,
        duration: duration ? parseInt(duration) : undefined,
        exerciseCount: exerciseLogs.length,
        totalSets: exerciseLogs.reduce((sum, log) => sum + log.sets_completed, 0),
        programName: shareProgram?.name
      });

      setIsLogging(false);
      setIsSaving(false);
      resetForm();
      return;
    }

    try {
      const { data: workoutLog, error: workoutError } = await supabase
        .from('workout_logs')
        .insert([{
          user_id: user!.id,
          program_id: selectedProgram,
          workout_day: dayName,
          duration_minutes: duration ? parseInt(duration) : null,
          notes: workoutNotes || null
        }])
        .select()
        .single();

      if (workoutError) throw workoutError;

      const exerciseLogData = exerciseLogs.map(log => ({
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

      const newPBsList: string[] = [];
      const goalsAchieved: string[] = [];
      
      for (const log of exerciseLogs) {
        if (!log.weight_kg) continue;
        const weight = parseFloat(log.weight_kg);
        const currentPB = personalBests.get(log.exercise_name);
        const goal = exerciseGoals.get(log.exercise_name);
        
        if (!currentPB || weight > currentPB.best_weight_kg) {
          newPBsList.push(log.exercise_name);
          
          await supabase
            .from('personal_bests')
            .upsert({
              user_id: user!.id,
              exercise_name: log.exercise_name,
              best_weight_kg: weight,
              best_reps: parseInt(log.reps_completed) || null,
              achieved_at: new Date().toISOString()
            }, { onConflict: 'user_id,exercise_name' });
        }
        
        if (goal?.target_weight_kg && weight >= goal.target_weight_kg) {
          goalsAchieved.push(log.exercise_name);
        }
      }
      
      if (newPBsList.length > 0) {
        setNewPBs(newPBsList);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        
        toast.success(
          `🎉 NYTT PERSONBÄSTA! ${newPBsList.join(', ')}`,
          { duration: 5000 }
        );
      }
      
      if (goalsAchieved.length > 0) {
        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#FFD700', '#FFA500', '#FF6347']
          });
        }, 500);
        
        toast.success(
          `🏆 MÅL UPPNÅTT! ${goalsAchieved.join(', ')}`,
          { duration: 5000 }
        );
      }

      // Update user stats
      const totalSets = exerciseLogs.reduce((sum, log) => sum + log.sets_completed, 0);
      const durationMins = duration ? parseInt(duration) : 0;
      const xpEarned = 50 + totalSets * 2 + Math.floor(durationMins / 5);
      
      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (currentStats) {
        await supabase
          .from('user_stats')
          .update({
            total_workouts: currentStats.total_workouts + 1,
            total_sets: currentStats.total_sets + totalSets,
            total_minutes: currentStats.total_minutes + durationMins,
            total_xp: currentStats.total_xp + xpEarned,
            level: Math.floor((currentStats.total_xp + xpEarned) / 1000) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user!.id);
      } else {
        await supabase
          .from('user_stats')
          .insert({
            user_id: user!.id,
            total_workouts: 1,
            total_sets: totalSets,
            total_minutes: durationMins,
            total_xp: xpEarned,
            level: 1
          });
      }

      const shareProgram = programs.find(p => p.id === selectedProgram);
      setShareData({
        dayName,
        duration: duration ? parseInt(duration) : undefined,
        exerciseCount: exerciseLogs.length,
        totalSets,
        newPBs: newPBsList.length > 0 ? newPBsList : undefined,
        programName: shareProgram?.name
      });

      toast.success(`Träningspass sparat! +${xpEarned} XP`);
      setIsLogging(false);
      
      setTimeout(() => {
        setShowShareDialog(true);
      }, 1000);
      
      resetForm();
      fetchRecentLogs();
      fetchPersonalBests();
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('Kunde inte spara träningspasset');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedProgram('');
    setSelectedDay('');
    setDuration('');
    setWorkoutNotes('');
    setExerciseLogs([]);
    setNewPBs([]);
    clearDraft();
  };

  const currentProgram = programs.find(p => p.id === selectedProgram);

  const startNewWorkout = async () => {
    setIsLogging(true);
    setAutoSuggestLoading(true);
    
    try {
      if (programs.length === 1) {
        const program = programs[0];
        setSelectedProgram(program.id);
        
        const { data: lastWorkout } = await supabase
          .from('workout_logs')
          .select('workout_day, program_id')
          .eq('program_id', program.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();
        
        if (lastWorkout && program.program_data.days) {
          const lastDayIndex = program.program_data.days.findIndex(
            d => d.day === lastWorkout.workout_day
          );
          
          if (lastDayIndex !== -1) {
            const nextDayIndex = (lastDayIndex + 1) % program.program_data.days.length;
            await handleDayChange(nextDayIndex.toString());
            toast.info(`Föreslår: ${program.program_data.days[nextDayIndex].day}`, {
              description: 'Baserat på ditt senaste pass'
            });
          }
        } else if (program.program_data.days?.length > 0) {
          await handleDayChange('0');
          toast.info(`Föreslår: ${program.program_data.days[0].day}`, {
            description: 'Starta från början!'
          });
        }
      } else if (programs.length > 1) {
        const { data: lastWorkout } = await supabase
          .from('workout_logs')
          .select('workout_day, program_id')
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();
        
        if (lastWorkout?.program_id) {
          const program = programs.find(p => p.id === lastWorkout.program_id);
          if (program) {
            setSelectedProgram(program.id);
            
            const lastDayIndex = program.program_data.days?.findIndex(
              d => d.day === lastWorkout.workout_day
            ) ?? -1;
            
            if (lastDayIndex !== -1 && program.program_data.days) {
              const nextDayIndex = (lastDayIndex + 1) % program.program_data.days.length;
              await handleDayChange(nextDayIndex.toString());
              toast.info(`Föreslår: ${program.program_data.days[nextDayIndex].day}`, {
                description: `Program: ${program.name}`
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error auto-suggesting workout:', error);
    } finally {
      setAutoSuggestLoading(false);
    }
  };

  return (
    <>
      {/* Share Dialog */}
      {shareData && (
        <ShareToInstagramDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          workoutData={shareData}
        />
      )}

      <AdBanner className="mb-6" />

      {/* Draft restore dialog */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Pågående pass hittat
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Du har ett osparat träningspass. Vill du fortsätta där du slutade?
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={discardDraft} className="flex-1">
              Kasta bort
            </Button>
            <Button onClick={restoreDraft} className="flex-1">
              Fortsätt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Logga styrketräning</h1>
          <p className="text-muted-foreground text-sm">Spåra dina pass och vikter</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showTimer ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowTimer(!showTimer)}
            className={showTimer ? "bg-gym-orange hover:bg-gym-orange/90" : ""}
          >
            <Timer className="w-4 h-4 mr-2" />
            Vila
          </Button>
          {!isLogging && hasDraft && (
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setShowDraftDialog(true)}>
                <Dumbbell className="w-4 h-4 mr-2" />
                Fortsätt pass
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDeleteDraftDialog(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
          {!isLogging && (
            <Button variant="hero" size="sm" onClick={startNewWorkout} disabled={autoSuggestLoading}>
              {autoSuggestLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Nytt Pass
            </Button>
          )}
        </div>
      </div>

      {showTimer && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6 max-w-sm"
        >
          <RestTimer onClose={() => setShowTimer(false)} />
        </motion.div>
      )}

      {isLogging && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle>Logga träningspass</CardTitle>
              <CardDescription>Välj program och fyll i dina vikter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Träningsprogram</Label>
                  <Select value={selectedProgram} onValueChange={handleProgramChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map(program => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {currentProgram && (
                  <div className="space-y-2">
                    <Label>Träningsdag</Label>
                    <Select value={selectedDay} onValueChange={handleDayChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj dag" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentProgram.program_data.days.map((day, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {day.day} - {day.focus}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Längd (min)</Label>
                  <Input
                    type="number"
                    placeholder="60"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              </div>

              {exerciseLogs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-sm">Övningar ({exerciseLogs.length})</h3>
                    <span className="text-xs text-muted-foreground">
                      Tryck för detaljer
                    </span>
                  </div>
                  {exerciseLogs.map((log, index) => {
                    const pb = personalBests.get(log.exercise_name);
                    const goal = exerciseGoals.get(log.exercise_name);
                    const currentWeight = log.weight_kg ? parseFloat(log.weight_kg) : 0;
                    const isNewPB = pb && currentWeight > pb.best_weight_kg;
                    const isGoalReached = goal?.target_weight_kg && currentWeight >= goal.target_weight_kg;
                    
                    return (
                      <div 
                        key={index} 
                        className={`rounded-lg transition-all ${
                          isNewPB ? 'bg-gym-orange/20 border border-gym-orange' : 
                          isGoalReached ? 'bg-green-500/20 border border-green-500' : 
                          'bg-secondary/30 border border-border/50'
                        } ${log.expanded ? 'p-3' : 'p-2'}`}
                      >
                        {/* Compact header - always visible */}
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleExpanded(index)}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <ExerciseInfo exerciseName={log.exercise_name}>
                                <h4 className="font-medium text-sm truncate">{log.exercise_name}</h4>
                              </ExerciseInfo>
                              {isNewPB && (
                                <Badge className="bg-gym-orange text-white text-[10px] px-1.5 py-0 h-5 animate-pulse">
                                  <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                                  PB!
                                </Badge>
                              )}
                              {isGoalReached && !isNewPB && (
                                <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0 h-5">
                                  <Trophy className="w-2.5 h-2.5 mr-0.5" />
                                  Mål!
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {/* Quick stats when collapsed */}
                          {!log.expanded && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="font-medium">{log.sets_completed}×</span>
                              {log.weight_kg && (
                                <span className="font-medium text-foreground">{log.weight_kg} kg</span>
                              )}
                              <ChevronDown className="w-4 h-4 shrink-0" />
                            </div>
                          )}
                          {log.expanded && (
                            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        
                        {/* Expanded details */}
                        <AnimatePresence>
                          {log.expanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="pt-3 space-y-3">
                                {/* PB and Goal info */}
                                <div className="flex items-center gap-3 flex-wrap">
                                  {pb && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Trophy className="w-3 h-3 text-gym-orange" />
                                      PB: {pb.best_weight_kg} kg
                                    </span>
                                  )}
                                  {goal?.target_weight_kg && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Target className="w-3 h-3 text-green-500" />
                                      Mål: {goal.target_weight_kg} kg
                                    </span>
                                  )}
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingGoal(log.exercise_name);
                                          setGoalWeight(goal?.target_weight_kg?.toString() || '');
                                        }}
                                      >
                                        <Target className="w-3 h-3 mr-1" />
                                        Sätt mål
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent onClick={(e) => e.stopPropagation()}>
                                      <DialogHeader>
                                        <DialogTitle>Sätt mål för {log.exercise_name}</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4 pt-4">
                                        {pb && (
                                          <p className="text-sm text-muted-foreground">
                                            Ditt nuvarande PB: <span className="font-bold text-gym-orange">{pb.best_weight_kg} kg</span>
                                          </p>
                                        )}
                                        <div className="space-y-2">
                                          <Label>Målvikt (kg)</Label>
                                          <Input
                                            type="number"
                                            step="0.5"
                                            value={goalWeight}
                                            onChange={(e) => setGoalWeight(e.target.value)}
                                            placeholder={pb ? `${pb.best_weight_kg + 2.5}` : '50'}
                                          />
                                        </div>
                                        <Button 
                                          variant="hero" 
                                          className="w-full"
                                          onClick={() => saveExerciseGoal(log.exercise_name, parseFloat(goalWeight))}
                                          disabled={!goalWeight}
                                        >
                                          <Target className="w-4 h-4 mr-2" />
                                          Spara mål
                                        </Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>

                                {/* Set details toggle */}
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs">Sets:</Label>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (log.sets_completed > 1) handleSetsChange(index, log.sets_completed - 1);
                                      }}
                                    >
                                      -
                                    </Button>
                                    <span className="w-6 text-center text-sm font-medium">{log.sets_completed}</span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (log.sets_completed < 10) handleSetsChange(index, log.sets_completed + 1);
                                      }}
                                    >
                                      +
                                    </Button>
                                  </div>
                                </div>

                                {/* Per-set input */}
                                <div className="space-y-1.5">
                                  {log.set_details.map((setDetail, setIndex) => {
                                    const prevSet = setIndex > 0 ? log.set_details[setIndex - 1] : null;
                                    const canCopyWeight = prevSet && prevSet.weight > 0 && setDetail.weight !== prevSet.weight;
                                    const canCopyReps = prevSet && prevSet.reps > 0 && setDetail.reps !== prevSet.reps;
                                    
                                    return (
                                      <div key={setIndex} className="flex items-center gap-2 bg-background/50 rounded-md p-2">
                                        <span className="text-xs font-medium w-10 text-muted-foreground shrink-0">
                                          Set {setIndex + 1}
                                        </span>
                                        <div className="flex-1 flex items-center gap-2">
                                          <div className="flex items-center gap-1 flex-1">
                                            <Input
                                              type="number"
                                              value={setDetail.reps === 0 ? '' : setDetail.reps}
                                              onChange={(e) => {
                                                e.stopPropagation();
                                                updateSetDetail(index, setIndex, 'reps', e.target.value === '' ? 0 : parseInt(e.target.value));
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              className="h-8 text-center"
                                              placeholder="0"
                                            />
                                            <span className="text-xs text-muted-foreground shrink-0">reps</span>
                                            {canCopyReps && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  updateSetDetail(index, setIndex, 'reps', prevSet.reps);
                                                }}
                                                title={`Kopiera ${prevSet.reps} reps`}
                                              >
                                                <Copy className="w-3 h-3" />
                                              </Button>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 flex-1">
                                            <Input
                                              type="number"
                                              step="0.5"
                                              value={setDetail.weight === 0 ? '' : setDetail.weight}
                                              onChange={(e) => {
                                                e.stopPropagation();
                                                updateSetDetail(index, setIndex, 'weight', e.target.value === '' ? 0 : parseFloat(e.target.value));
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              className="h-8 text-center"
                                              placeholder="0"
                                            />
                                            <span className="text-xs text-muted-foreground shrink-0">kg</span>
                                            {canCopyWeight && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  updateSetDetail(index, setIndex, 'weight', prevSet.weight);
                                                }}
                                                title={`Kopiera ${prevSet.weight} kg`}
                                              >
                                                <Copy className="w-3 h-3" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                <Label>Anteckningar</Label>
                <Textarea
                  placeholder="Hur kändes passet?"
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="hero"
                  onClick={handleSaveWorkout}
                  disabled={isSaving || exerciseLogs.length === 0}
                  className="flex-1"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Spara Pass
                </Button>
                <Button variant="outline" onClick={() => { setIsLogging(false); resetForm(); }}>
                  Avbryt
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Logs */}
      <div>
        <h2 className="text-xl font-display font-bold mb-4">Senaste pass</h2>
        {recentLogs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Du har inte loggat några pass än. Tryck på "Nytt Pass" för att börja!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log) => (
              <Card key={log.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Dumbbell className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{log.workout_day}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(log.completed_at), 'd MMMM yyyy', { locale: sv })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {log.duration_minutes && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {log.duration_minutes} min
                        </p>
                      )}
                      {log.exercise_logs && (
                        <p className="text-xs text-muted-foreground">
                          {log.exercise_logs.length} övningar
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete draft confirmation dialog */}
      <AlertDialog open={showDeleteDraftDialog} onOpenChange={setShowDeleteDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort utkast?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort det sparade passet? Detta kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                discardDraft();
                toast.success('Sparat utkast borttaget');
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
