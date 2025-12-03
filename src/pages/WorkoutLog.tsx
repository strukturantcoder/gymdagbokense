import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dumbbell, Plus, Save, Loader2, ArrowLeft, Calendar, Clock, Weight, Timer, Target, Trophy, Star, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import RestTimer from '@/components/RestTimer';
import ExerciseInfo from '@/components/ExerciseInfo';
import AdBanner from '@/components/AdBanner';
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

export default function WorkoutLog() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [recentLogs, setRecentLogs] = useState<WorkoutLogEntry[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // New workout form
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [duration, setDuration] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLogEntry[]>([]);
  const [showTimer, setShowTimer] = useState(false);
  
  // Personal bests and goals
  const [personalBests, setPersonalBests] = useState<Map<string, PersonalBest>>(new Map());
  const [exerciseGoals, setExerciseGoals] = useState<Map<string, ExerciseGoal>>(new Map());
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [goalWeight, setGoalWeight] = useState('');
  const [newPBs, setNewPBs] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
        // Fetch last used weights for these exercises
        const exerciseNames = day.exercises.map(ex => ex.name);
        const { data: lastWeights } = await supabase
          .from('exercise_logs')
          .select('exercise_name, weight_kg, sets_completed, reps_completed')
          .in('exercise_name', exerciseNames)
          .order('created_at', { ascending: false });
        
        // Create a map of exercise name to last used values
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
          
          // Create set_details array with default values for each set
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
      
      // Update the summary fields as well
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
        // Add new sets with default values from last set
        const lastSet = currentSets[currentSets.length - 1] || { reps: 10, weight: 0 };
        newSetDetails = [
          ...currentSets,
          ...Array.from({ length: newSetsCount - currentSets.length }, () => ({ ...lastSet }))
        ];
      } else {
        // Remove sets from the end
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
    try {
      const program = programs.find(p => p.id === selectedProgram);
      const dayName = program?.program_data.days[parseInt(selectedDay)]?.day || `Dag ${parseInt(selectedDay) + 1}`;

      // Create workout log
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

      // Create exercise logs with set_details
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

      // Check for new personal bests and goal achievements
      const newPBsList: string[] = [];
      const goalsAchieved: string[] = [];
      
      for (const log of exerciseLogs) {
        if (!log.weight_kg) continue;
        const weight = parseFloat(log.weight_kg);
        const currentPB = personalBests.get(log.exercise_name);
        const goal = exerciseGoals.get(log.exercise_name);
        
        // Check if new PB
        if (!currentPB || weight > currentPB.best_weight_kg) {
          newPBsList.push(log.exercise_name);
          
          // Update or insert PB
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
        
        // Check if goal achieved
        if (goal?.target_weight_kg && weight >= goal.target_weight_kg) {
          goalsAchieved.push(log.exercise_name);
        }
      }
      
      // Show celebrations
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

      toast.success('Träningspass sparat!');
      setIsLogging(false);
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
  };

  const currentProgram = programs.find(p => p.id === selectedProgram);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">TRÄNINGSLOGG</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        {/* Ad Banner */}
        <AdBanner className="mb-6" />
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Logga träning</h1>
            <p className="text-muted-foreground">Spåra dina pass och vikter</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={showTimer ? "default" : "outline"} 
              onClick={() => setShowTimer(!showTimer)}
              className={showTimer ? "bg-gym-orange hover:bg-gym-orange/90" : ""}
            >
              <Timer className="w-4 h-4 mr-2" />
              Vila Timer
            </Button>
            {!isLogging && (
              <Button variant="hero" onClick={() => setIsLogging(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nytt Pass
              </Button>
            )}
          </div>
        </div>

        {/* Rest Timer */}
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

        {/* New Workout Form */}
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
                {/* Program & Day Selection */}
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

                {/* Exercise Logs */}
                {exerciseLogs.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-display font-bold">Övningar</h3>
                    {exerciseLogs.map((log, index) => {
                      const pb = personalBests.get(log.exercise_name);
                      const goal = exerciseGoals.get(log.exercise_name);
                      const currentWeight = log.weight_kg ? parseFloat(log.weight_kg) : 0;
                      const isNewPB = pb && currentWeight > pb.best_weight_kg;
                      const isGoalReached = goal?.target_weight_kg && currentWeight >= goal.target_weight_kg;
                      
                      return (
                        <div 
                          key={index} 
                          className={`rounded-lg p-4 transition-all ${
                            isNewPB ? 'bg-gym-orange/20 border-2 border-gym-orange' : 
                            isGoalReached ? 'bg-green-500/20 border-2 border-green-500' : 
                            'bg-secondary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <ExerciseInfo exerciseName={log.exercise_name}>
                                <h4 className="font-medium">{log.exercise_name}</h4>
                              </ExerciseInfo>
                              {isNewPB && (
                                <Badge className="bg-gym-orange text-white animate-pulse">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Nytt PB!
                                </Badge>
                              )}
                              {isGoalReached && !isNewPB && (
                                <Badge className="bg-green-500 text-white">
                                  <Trophy className="w-3 h-3 mr-1" />
                                  Mål!
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
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
                                    onClick={() => {
                                      setEditingGoal(log.exercise_name);
                                      setGoalWeight(goal?.target_weight_kg?.toString() || '');
                                    }}
                                  >
                                    <Target className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
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
                          </div>
                          
                          {/* Quick summary row */}
                          <div className="flex items-center gap-2 mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => toggleExpanded(index)}
                            >
                              {log.expanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4 mr-1" />
                                  Dölj set-detaljer
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4 mr-1" />
                                  Visa per set ({log.sets_completed} sets)
                                </>
                              )}
                            </Button>
                            {!log.expanded && log.weight_kg && (
                              <span className="text-xs text-muted-foreground">
                                Max: {log.weight_kg} kg
                              </span>
                            )}
                          </div>

                          {/* Expanded per-set inputs */}
                          {log.expanded ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 mb-2">
                                <Label className="text-xs">Antal sets:</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={log.sets_completed}
                                  onChange={(e) => handleSetsChange(index, parseInt(e.target.value) || 1)}
                                  className="w-16 h-8"
                                />
                              </div>
                              {log.set_details.map((setDetail, setIndex) => (
                                <div key={setIndex} className="flex items-center gap-2 bg-background/50 rounded p-2">
                                  <span className="text-xs font-medium w-12 text-muted-foreground">
                                    Set {setIndex + 1}
                                  </span>
                                  <div className="flex-1 grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        value={setDetail.reps}
                                        onChange={(e) => updateSetDetail(index, setIndex, 'reps', parseInt(e.target.value) || 0)}
                                        className="h-8"
                                      />
                                      <span className="text-xs text-muted-foreground">reps</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Input
                                        type="number"
                                        step="0.5"
                                        value={setDetail.weight || ''}
                                        onChange={(e) => updateSetDetail(index, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                                        className="h-8"
                                        placeholder="0"
                                      />
                                      <span className="text-xs text-muted-foreground">kg</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* Compact summary view */
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Sets</Label>
                                <Input
                                  type="number"
                                  value={log.sets_completed}
                                  onChange={(e) => handleSetsChange(index, parseInt(e.target.value) || 1)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Reps</Label>
                                <Input
                                  value={log.reps_completed}
                                  onChange={(e) => updateExerciseLog(index, 'reps_completed', e.target.value)}
                                  placeholder="8-12"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Vikt (kg)</Label>
                                <Input
                                  type="number"
                                  step="0.5"
                                  placeholder="0"
                                  value={log.weight_kg}
                                  onChange={(e) => updateExerciseLog(index, 'weight_kg', e.target.value)}
                                  className={isNewPB ? 'border-gym-orange' : isGoalReached ? 'border-green-500' : ''}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Anteckningar (valfritt)</Label>
                  <Textarea
                    placeholder="Hur kändes passet?"
                    value={workoutNotes}
                    onChange={(e) => setWorkoutNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="hero"
                    onClick={handleSaveWorkout}
                    disabled={isSaving || exerciseLogs.length === 0}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sparar...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Spara pass
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => { setIsLogging(false); resetForm(); }}>
                    Avbryt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Logs */}
        <div>
          <h2 className="text-2xl font-display font-bold mb-4">Senaste pass</h2>
          {recentLogs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Du har inte loggat några pass än
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{log.workout_day}</CardTitle>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.completed_at), 'd MMM', { locale: sv })}
                        </span>
                      </div>
                      {log.duration_minutes && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {log.duration_minutes} min
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {log.exercise_logs?.slice(0, 3).map((ex, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="truncate">{ex.exercise_name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {ex.sets_completed}x{ex.reps_completed}
                              </span>
                              {ex.weight_kg && (
                                <span className="flex items-center gap-1 text-gym-orange">
                                  <Weight className="w-3 h-3" />
                                  {ex.weight_kg}kg
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {log.exercise_logs && log.exercise_logs.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{log.exercise_logs.length - 3} fler övningar
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
        
        {/* Bottom Ad Banner */}
        <AdBanner className="mt-8" />
      </main>
    </div>
  );
}
