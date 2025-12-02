import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Dumbbell, Plus, Save, Loader2, ArrowLeft, Calendar, Clock, Weight, Timer } from 'lucide-react';
import RestTimer from '@/components/RestTimer';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

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

interface ExerciseLogEntry {
  exercise_name: string;
  sets_completed: number;
  reps_completed: string;
  weight_kg: string;
  notes: string;
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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPrograms();
      fetchRecentLogs();
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

  const handleProgramChange = (programId: string) => {
    setSelectedProgram(programId);
    setSelectedDay('');
    setExerciseLogs([]);
  };

  const handleDayChange = (dayIndex: string) => {
    setSelectedDay(dayIndex);
    const program = programs.find(p => p.id === selectedProgram);
    if (program) {
      const day = program.program_data.days[parseInt(dayIndex)];
      if (day) {
        setExerciseLogs(day.exercises.map(ex => ({
          exercise_name: ex.name,
          sets_completed: ex.sets,
          reps_completed: ex.reps,
          weight_kg: '',
          notes: ''
        })));
      }
    }
  };

  const updateExerciseLog = (index: number, field: keyof ExerciseLogEntry, value: string | number) => {
    setExerciseLogs(prev => prev.map((log, i) => 
      i === index ? { ...log, [field]: value } : log
    ));
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

      // Create exercise logs
      const exerciseLogData = exerciseLogs.map(log => ({
        workout_log_id: workoutLog.id,
        exercise_name: log.exercise_name,
        sets_completed: log.sets_completed,
        reps_completed: log.reps_completed,
        weight_kg: log.weight_kg ? parseFloat(log.weight_kg) : null,
        notes: log.notes || null
      }));

      const { error: exerciseError } = await supabase
        .from('exercise_logs')
        .insert(exerciseLogData);

      if (exerciseError) throw exerciseError;

      toast.success('Träningspass sparat!');
      setIsLogging(false);
      resetForm();
      fetchRecentLogs();
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
                    {exerciseLogs.map((log, index) => (
                      <div key={index} className="bg-secondary/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{log.exercise_name}</h4>
                          <span className="text-sm text-muted-foreground">
                            Mål: {log.sets_completed} x {log.reps_completed}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Sets</Label>
                            <Input
                              type="number"
                              value={log.sets_completed}
                              onChange={(e) => updateExerciseLog(index, 'sets_completed', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Reps</Label>
                            <Input
                              value={log.reps_completed}
                              onChange={(e) => updateExerciseLog(index, 'reps_completed', e.target.value)}
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
                            />
                          </div>
                        </div>
                      </div>
                    ))}
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
      </main>
    </div>
  );
}
