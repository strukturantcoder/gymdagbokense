import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Dumbbell, 
  Clock, 
  Check, 
  X, 
  ChevronDown, 
  ChevronUp,
  Play,
  Pause,
  RotateCcw,
  Trophy,
  ThumbsUp,
  ThumbsDown,
  BookmarkPlus
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
  supersetGroup?: number | null;
}

interface GeneratedWorkout {
  name: string;
  focus: string;
  estimatedDuration: number;
  exercises: Exercise[];
}

interface SetLog {
  reps: number;
  weight: number;
  completed: boolean;
}

interface ExerciseLog {
  exercise: Exercise;
  sets: SetLog[];
  expanded: boolean;
}

interface SpontaneousWorkoutSessionProps {
  workout: GeneratedWorkout;
  onClose: () => void;
}

export default function SpontaneousWorkoutSession({ workout, onClose }: SpontaneousWorkoutSessionProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [startTime] = useState(new Date());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showCompletedDialog, setShowCompletedDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initialize exercise logs
    setExerciseLogs(
      workout.exercises.map(exercise => ({
        exercise,
        sets: Array.from({ length: exercise.sets }, () => ({
          reps: parseInt(exercise.reps) || 10,
          weight: 0,
          completed: false
        })),
        expanded: true
      }))
    );
  }, [workout]);

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const completedSets = exerciseLogs.reduce(
    (acc, log) => acc + log.sets.filter(s => s.completed).length, 
    0
  );
  const totalSets = exerciseLogs.reduce(
    (acc, log) => acc + log.sets.length, 
    0
  );
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof SetLog, value: any) => {
    setExerciseLogs(prev => {
      const updated = [...prev];
      updated[exerciseIndex].sets[setIndex] = {
        ...updated[exerciseIndex].sets[setIndex],
        [field]: value
      };
      return updated;
    });
  };

  const toggleExpanded = (index: number) => {
    setExerciseLogs(prev => {
      const updated = [...prev];
      updated[index].expanded = !updated[index].expanded;
      return updated;
    });
  };

  const handleComplete = async () => {
    if (!user) {
      toast.error("Du måste vara inloggad");
      return;
    }

    setIsSaving(true);
    try {
      const durationMinutes = Math.round(elapsedSeconds / 60);
      
      // Create workout log
      const { data: workoutLog, error: workoutError } = await supabase
        .from("workout_logs")
        .insert({
          user_id: user.id,
          workout_day: workout.name,
          duration_minutes: durationMinutes,
          notes: `Spontan-pass: ${workout.focus}`
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Create exercise logs
      const exerciseLogsToInsert = exerciseLogs
        .filter(log => log.sets.some(s => s.completed))
        .map(log => {
          const completedSets = log.sets.filter(s => s.completed);
          const avgWeight = completedSets.reduce((sum, s) => sum + s.weight, 0) / completedSets.length;
          
          return {
            workout_log_id: workoutLog.id,
            exercise_name: log.exercise.name,
            sets_completed: completedSets.length,
            reps_completed: completedSets.map(s => s.reps).join(", "),
            weight_kg: avgWeight || null,
            set_details: completedSets.map((s, i) => ({
              set: i + 1,
              reps: s.reps,
              weight: s.weight
            }))
          };
        });

      if (exerciseLogsToInsert.length > 0) {
        const { error: exerciseError } = await supabase
          .from("exercise_logs")
          .insert(exerciseLogsToInsert);

        if (exerciseError) throw exerciseError;
      }

      // Update user stats
      const { data: stats } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (stats) {
        await supabase
          .from("user_stats")
          .update({
            total_workouts: stats.total_workouts + 1,
            total_minutes: stats.total_minutes + durationMinutes,
            total_sets: stats.total_sets + completedSets,
            total_xp: stats.total_xp + 50 + (completedSets * 5),
            last_activity_date: new Date().toISOString()
          })
          .eq("user_id", user.id);
      }

      toast.success("Passet sparat! 🎉");
      setShowCompletedDialog(true);
    } catch (error) {
      console.error("Error saving workout:", error);
      toast.error("Kunde inte spara passet");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateProgram = () => {
    navigate("/training", { 
      state: { 
        createProgramFrom: workout 
      } 
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg">{workout.name}</h1>
              <p className="text-xs text-muted-foreground">{workout.focus}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center gap-1 text-lg font-mono font-bold">
                  <Clock className="w-4 h-4" />
                  {formatTime(elapsedSeconds)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowExitDialog(true)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Framsteg</span>
              <span>{completedSets} / {totalSets} sets</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Exercise list */}
      <div className="container px-4 py-4 pb-24 overflow-y-auto max-h-[calc(100vh-180px)]">
        <div className="space-y-3">
          {exerciseLogs.map((log, exerciseIndex) => (
            <Card key={exerciseIndex} className="overflow-hidden">
              <CardHeader 
                className="py-3 cursor-pointer"
                onClick={() => toggleExpanded(exerciseIndex)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{log.exercise.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {log.exercise.sets} × {log.exercise.reps} • {log.exercise.rest} vila
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={log.sets.every(s => s.completed) ? "default" : "outline"}>
                      {log.sets.filter(s => s.completed).length}/{log.sets.length}
                    </Badge>
                    {log.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </CardHeader>
              
              {log.expanded && (
                <CardContent className="pt-0 pb-3">
                  {log.exercise.notes && (
                    <p className="text-xs text-muted-foreground mb-3 italic">
                      💡 {log.exercise.notes}
                    </p>
                  )}
                  
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground px-2">
                      <span>Set</span>
                      <span className="text-center">Vikt (kg)</span>
                      <span className="text-center">Reps</span>
                      <span className="text-right">Klar</span>
                    </div>
                    
                    {log.sets.map((set, setIndex) => (
                      <motion.div
                        key={setIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: setIndex * 0.05 }}
                        className={`grid grid-cols-4 gap-2 items-center p-2 rounded-lg ${
                          set.completed ? "bg-primary/10" : "bg-muted/50"
                        }`}
                      >
                        <span className="text-sm font-medium">{setIndex + 1}</span>
                        <Input
                          type="number"
                          value={set.weight || ""}
                          onChange={(e) => updateSet(exerciseIndex, setIndex, "weight", parseFloat(e.target.value) || 0)}
                          className="h-8 text-center"
                          placeholder="0"
                        />
                        <Input
                          type="number"
                          value={set.reps}
                          onChange={(e) => updateSet(exerciseIndex, setIndex, "reps", parseInt(e.target.value) || 0)}
                          className="h-8 text-center"
                        />
                        <div className="flex justify-end">
                          <Checkbox
                            checked={set.completed}
                            onCheckedChange={(checked) => updateSet(exerciseIndex, setIndex, "completed", checked)}
                            className="h-6 w-6"
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 bg-background border-t p-4">
        <Button 
          variant="hero" 
          className="w-full gap-2"
          onClick={handleComplete}
          disabled={completedSets === 0 || isSaving}
        >
          {isSaving ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              Sparar...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Avsluta pass
            </>
          )}
        </Button>
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avsluta passet?</AlertDialogTitle>
            <AlertDialogDescription>
              Du har loggat {completedSets} sets. Vill du spara och avsluta eller avbryta utan att spara?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Fortsätt träna</AlertDialogCancel>
            <Button variant="outline" onClick={onClose}>
              Avbryt utan att spara
            </Button>
            <AlertDialogAction onClick={handleComplete}>
              Spara och avsluta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Completed dialog */}
      <AlertDialog open={showCompletedDialog} onOpenChange={setShowCompletedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gym-orange to-amber-500 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Bra jobbat! 🎉</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Du genomförde {completedSets} sets på {formatTime(elapsedSeconds)}!
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-3">
            <p className="text-sm text-center font-medium">Gillade du passet?</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2">
                <ThumbsUp className="w-4 h-4" />
                Ja!
              </Button>
              <Button variant="outline" className="flex-1 gap-2">
                <ThumbsDown className="w-4 h-4" />
                Nej
              </Button>
            </div>
          </div>

          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="secondary" className="gap-2" onClick={handleCreateProgram}>
              <BookmarkPlus className="w-4 h-4" />
              Skapa program från detta
            </Button>
            <AlertDialogAction onClick={onClose}>
              Klar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
