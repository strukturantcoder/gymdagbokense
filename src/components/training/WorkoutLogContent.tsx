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
import { Dumbbell, Plus, Save, Loader2, Calendar, Clock, Weight, Timer, Target, Trophy, Star, Sparkles, ChevronDown, ChevronUp, WifiOff, Trash2, Share2, Globe } from 'lucide-react';
import SwipeableSetRow from './SwipeableSetRow';
import RestTimer from '@/components/RestTimer';
import ExerciseInfo from '@/components/ExerciseInfo';
import AdBanner from '@/components/AdBanner';
import ShareToInstagramDialog from '@/components/ShareToInstagramDialog';
import { ShareProgramDialog } from './ShareProgramDialog';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import ExerciseListSkeleton from './ExerciseListSkeleton';

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
  is_public?: boolean;
  share_code?: string | null;
  description?: string | null;
}

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
  const [showCancelWorkoutDialog, setShowCancelWorkoutDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WorkoutLogEntry | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [showDeleteLogDialog, setShowDeleteLogDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showProgramSelectDialog, setShowProgramSelectDialog] = useState(false);
  const [pendingProgramId, setPendingProgramId] = useState<string>('');
  const [pendingDayIndex, setPendingDayIndex] = useState<string>('');
  
  // New workout form
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [duration, setDuration] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLogEntry[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  const [autoSuggestLoading, setAutoSuggestLoading] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Personal bests and goals
  const [personalBests, setPersonalBests] = useState<Map<string, PersonalBest>>(new Map());
  const [exerciseGoals, setExerciseGoals] = useState<Map<string, ExerciseGoal>>(new Map());
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [goalWeight, setGoalWeight] = useState('');
  const [newPBs, setNewPBs] = useState<string[]>([]);
  
  // Share to Instagram
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showShareProgramDialog, setShowShareProgramDialog] = useState(false);
  const [programToShare, setProgramToShare] = useState<WorkoutProgram | null>(null);
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
        startedAt: workoutStartTime || Date.now(),
        userId: user.id
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [isLogging, selectedProgram, selectedDay, duration, workoutNotes, exerciseLogs, user, workoutStartTime]);

  // Workout timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isLogging && workoutStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLogging, workoutStartTime]);

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
        setWorkoutStartTime(draft.startedAt);
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
    setWorkoutStartTime(null);
    setElapsedTime(0);
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
      .select('id, name, program_data, is_public, share_code, description')
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

  const handleDayChange = async (dayIndex: string, programIdOverride?: string) => {
    setSelectedDay(dayIndex);
    const programId = programIdOverride || selectedProgram;
    const program = programs.find(p => p.id === programId);
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

  const toggleSetComplete = (exerciseIndex: number, setIndex: number) => {
    setExerciseLogs(prev => prev.map((log, i) => {
      if (i !== exerciseIndex) return log;
      const newSetDetails = [...log.set_details];
      newSetDetails[setIndex] = { 
        ...newSetDetails[setIndex], 
        completed: !newSetDetails[setIndex].completed 
      };
      return { ...log, set_details: newSetDetails };
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
          duration_minutes: duration ? parseInt(duration) : getElapsedMinutes() || null,
          notes: workoutNotes || null
        }])
        .select()
        .single();

      if (workoutError) throw workoutError;

      const exerciseLogData = exerciseLogs.map(log => {
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
    setWorkoutStartTime(null);
    setElapsedTime(0);
    clearDraft();
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getElapsedMinutes = () => Math.floor(elapsedTime / 60);

  const handleDeleteLog = async () => {
    if (!selectedLog) return;
    
    setIsDeleting(true);
    try {
      // Delete exercise logs first (cascade would handle this but being explicit)
      await supabase
        .from('exercise_logs')
        .delete()
        .eq('workout_log_id', selectedLog.id);
      
      // Delete the workout log
      const { error } = await supabase
        .from('workout_logs')
        .delete()
        .eq('id', selectedLog.id);
      
      if (error) throw error;
      
      toast.success('Träningspass borttaget');
      setShowDeleteLogDialog(false);
      setShowLogDetails(false);
      setSelectedLog(null);
      fetchRecentLogs();
    } catch (error) {
      console.error('Error deleting workout:', error);
      toast.error('Kunde inte ta bort passet');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentProgram = programs.find(p => p.id === selectedProgram);

  const openProgramSelectDialog = async () => {
    if (!programs.length) {
      toast.error('Skapa ett träningsprogram först');
      return;
    }
    
    setAutoSuggestLoading(true);
    
    try {
      let suggestedProgramId = programs[0].id;
      let suggestedDayIndex = 0;
      
      // Find the best program and day to suggest
      if (programs.length === 1) {
        const { data: lastWorkout } = await supabase
          .from('workout_logs')
          .select('workout_day, program_id')
          .eq('program_id', programs[0].id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (lastWorkout && programs[0].program_data.days) {
          const lastDayIndex = programs[0].program_data.days.findIndex(
            d => d.day === lastWorkout.workout_day
          );
          
          if (lastDayIndex !== -1) {
            suggestedDayIndex = (lastDayIndex + 1) % programs[0].program_data.days.length;
          }
        }
      } else {
        const { data: lastWorkout } = await supabase
          .from('workout_logs')
          .select('workout_day, program_id')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (lastWorkout?.program_id) {
          const program = programs.find(p => p.id === lastWorkout.program_id);
          if (program) {
            suggestedProgramId = program.id;
            
            const lastDayIndex = program.program_data.days?.findIndex(
              d => d.day === lastWorkout.workout_day
            ) ?? -1;
            
            if (lastDayIndex !== -1 && program.program_data.days) {
              suggestedDayIndex = (lastDayIndex + 1) % program.program_data.days.length;
            }
          }
        }
      }
      
      setPendingProgramId(suggestedProgramId);
      setPendingDayIndex(suggestedDayIndex.toString());
      setShowProgramSelectDialog(true);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setPendingProgramId(programs[0].id);
      setPendingDayIndex('0');
      setShowProgramSelectDialog(true);
    } finally {
      setAutoSuggestLoading(false);
    }
  };

  const confirmAndStartWorkout = async () => {
    const program = programs.find(p => p.id === pendingProgramId);
    if (!program || !pendingDayIndex) {
      toast.error('Välj program och dag');
      return;
    }

    const dayIndex = parseInt(pendingDayIndex);
    const day = program.program_data.days[dayIndex];
    if (!day) {
      toast.error('Kunde inte hitta träningsdag');
      return;
    }

    setShowProgramSelectDialog(false);
    setAutoSuggestLoading(true);

    try {
      // Fetch last weights for exercises
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
      
      // Prepare session data
      const exercises = day.exercises.map(ex => {
        const lastValues = lastValuesMap.get(ex.name);
        const numSets = lastValues?.sets ?? ex.sets;
        const defaultWeight = lastValues?.weight ? parseFloat(lastValues.weight) : 0;
        const defaultReps = parseInt(ex.reps.split('-')[0]) || 10;
        
        const setDetails: SetDetail[] = Array.from({ length: numSets }, () => ({
          reps: defaultReps,
          weight: defaultWeight,
          completed: false
        }));
        
        return {
          exercise_name: ex.name,
          sets_completed: numSets,
          reps_completed: lastValues?.reps ?? ex.reps,
          weight_kg: lastValues?.weight ?? '',
          notes: '',
          set_details: setDetails,
          expanded: false,
          programSets: ex.sets,
          programReps: ex.reps
        };
      });

      // Store session data and navigate
      const sessionData = {
        programId: program.id,
        programName: program.name,
        dayIndex: pendingDayIndex,
        dayName: day.day,
        exercises,
        startedAt: Date.now()
      };
      
      localStorage.setItem('active_workout_session', JSON.stringify(sessionData));
      navigate('/training/session');
      
    } catch (error) {
      console.error('Error starting workout:', error);
      toast.error('Kunde inte starta passet');
    } finally {
      setAutoSuggestLoading(false);
    }
  };

  const pendingProgram = programs.find(p => p.id === pendingProgramId);

  const startWorkoutTimer = () => {
    setWorkoutStartTime(Date.now());
    toast.success('Timer startad!');
  };

  // Check if there's an active session and offer to resume
  useEffect(() => {
    const activeSession = localStorage.getItem('active_workout_session');
    if (activeSession && !isLogging) {
      try {
        const session = JSON.parse(activeSession);
        const sessionAge = Date.now() - session.startedAt;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (sessionAge < maxAge) {
          setHasDraft(true);
        } else {
          localStorage.removeItem('active_workout_session');
        }
      } catch {
        localStorage.removeItem('active_workout_session');
      }
    }
  }, [isLogging]);

  const resumeSession = () => {
    navigate('/training/session');
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

      {/* Share Program Dialog */}
      {programToShare && (
        <ShareProgramDialog
          open={showShareProgramDialog}
          onOpenChange={setShowShareProgramDialog}
          program={programToShare}
          onUpdate={fetchPrograms}
        />
      )}

      <AdBanner format="horizontal" placement="training_top" className="mb-6" />

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

      {/* Program select dialog */}
      <Dialog open={showProgramSelectDialog} onOpenChange={setShowProgramSelectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Välj träningspass
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Träningsprogram</Label>
              <Select value={pendingProgramId} onValueChange={(v) => { setPendingProgramId(v); setPendingDayIndex('0'); }}>
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
            
            {pendingProgram && (
              <div className="space-y-2">
                <Label>Träningsdag</Label>
                <Select value={pendingDayIndex} onValueChange={setPendingDayIndex}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj dag" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingProgram.program_data.days.map((day, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {day.day} - {day.focus}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setShowProgramSelectDialog(false)} className="flex-1">
              Avbryt
            </Button>
            <Button onClick={confirmAndStartWorkout} className="flex-1" disabled={!pendingProgramId || pendingDayIndex === ''}>
              Starta pass
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Styrketräning</h1>
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
              <Button variant="outline" size="sm" onClick={resumeSession}>
                <Dumbbell className="w-4 h-4 mr-2" />
                Fortsätt pass
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  localStorage.removeItem('active_workout_session');
                  setHasDraft(false);
                  toast.success('Pågående pass borttaget');
                }}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
          {!isLogging && (
            <Button variant="hero" size="sm" onClick={openProgramSelectDialog} disabled={autoSuggestLoading}>
              {autoSuggestLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Starta pass
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Logga träningspass</CardTitle>
                  <CardDescription>Välj program och fyll i dina vikter</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {!workoutStartTime ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startWorkoutTimer}
                      className="gap-2"
                    >
                      <Timer className="w-4 h-4" />
                      Starta timer
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-lg">
                      <Timer className="w-4 h-4 text-primary animate-pulse" />
                      <span className="font-mono font-bold text-lg text-primary">
                        {formatElapsedTime(elapsedTime)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Träningsprogram</Label>
                  <div className="flex gap-2">
                    <Select value={selectedProgram} onValueChange={handleProgramChange}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Välj program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map(program => (
                          <SelectItem key={program.id} value={program.id}>
                            <div className="flex items-center gap-2">
                              {program.name}
                              {program.is_public && <Globe className="w-3 h-3 text-green-500" />}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {currentProgram && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setProgramToShare(currentProgram);
                          setShowShareProgramDialog(true);
                        }}
                        title="Dela program"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
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

              {autoSuggestLoading && exerciseLogs.length === 0 && (
                <ExerciseListSkeleton />
              )}

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

                                {/* Per-set input with swipe gestures */}
                                <div className="space-y-1.5">
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Svep höger för att markera som klar
                                  </p>
                                  {log.set_details.map((setDetail, setIndex) => {
                                    const prevSet = setIndex > 0 ? log.set_details[setIndex - 1] : null;
                                    
                                    return (
                                      <SwipeableSetRow
                                        key={setIndex}
                                        setIndex={setIndex}
                                        setDetail={setDetail}
                                        prevSet={prevSet}
                                        isCompleted={setDetail.completed || false}
                                        onUpdateReps={(value) => updateSetDetail(index, setIndex, 'reps', value)}
                                        onUpdateWeight={(value) => updateSetDetail(index, setIndex, 'weight', value)}
                                        onToggleComplete={() => toggleSetComplete(index, setIndex)}
                                      />
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
                <Button 
                  variant="outline" 
                  onClick={() => setShowCancelWorkoutDialog(true)}
                  className="text-destructive border-destructive/50 hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
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
              <Card 
                key={log.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  setSelectedLog(log);
                  setShowLogDetails(true);
                }}
              >
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
                    <div className="text-right flex items-center gap-2">
                      <div>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                          setShowDeleteLogDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Log details dialog */}
      <Dialog open={showLogDetails} onOpenChange={setShowLogDetails}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              {selectedLog?.workout_day}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedLog.completed_at), 'd MMMM yyyy', { locale: sv })}
                </span>
                {selectedLog.duration_minutes && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {selectedLog.duration_minutes} min
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Övningar</h4>
                {selectedLog.exercise_logs && selectedLog.exercise_logs.length > 0 ? (
                  <div className="space-y-2">
                    {selectedLog.exercise_logs.map((exercise, idx) => (
                      <div key={idx} className="bg-secondary/30 rounded-lg p-3">
                        <p className="font-medium text-sm">{exercise.exercise_name}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span>{exercise.sets_completed} set</span>
                          <span>{exercise.reps_completed} reps</span>
                          {exercise.weight_kg && <span>{exercise.weight_kg} kg</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Inga övningar loggades för detta pass
                  </p>
                )}
              </div>
              
              {selectedLog.notes && (
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Anteckningar</h4>
                  <p className="text-sm text-muted-foreground">{selectedLog.notes}</p>
                </div>
              )}
              
              <div className="pt-4 border-t space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (selectedLog) {
                      setShareData({
                        dayName: selectedLog.workout_day,
                        duration: selectedLog.duration_minutes || undefined,
                        exerciseCount: selectedLog.exercise_logs?.length || 0,
                        totalSets: selectedLog.exercise_logs?.reduce((sum, ex) => sum + ex.sets_completed, 0) || 0,
                      });
                      setShowLogDetails(false);
                      setShowShareDialog(true);
                    }
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Dela på Instagram
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowDeleteLogDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Ta bort pass
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete log confirmation dialog */}
      <AlertDialog open={showDeleteLogDialog} onOpenChange={setShowDeleteLogDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort träningspass?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort detta träningspass? Detta kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLog}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {/* Cancel active workout confirmation dialog */}
      <AlertDialog open={showCancelWorkoutDialog} onOpenChange={setShowCancelWorkoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avbryt träningspass?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill avbryta detta pass? All data som du har loggat kommer att försvinna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Fortsätt träna</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsLogging(false);
                resetForm();
                setShowCancelWorkoutDialog(false);
                toast.success('Träningspass avbrutet');
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Avbryt pass
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
