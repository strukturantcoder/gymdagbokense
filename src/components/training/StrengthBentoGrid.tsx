import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Dumbbell, 
  Plus, 
  Sparkles, 
  Calendar, 
  Clock, 
  Trophy, 
  ChevronRight, 
  Play,
  History,
  Target,
  Trash2,
  Loader2,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import AdBanner from '@/components/AdBanner';
import RestTimer from '@/components/RestTimer';

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
  description?: string | null;
  days_per_week?: number;
  goal?: string;
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

interface SetDetail {
  reps: number;
  weight: number;
  completed?: boolean;
}

export default function StrengthBentoGrid() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [recentLogs, setRecentLogs] = useState<WorkoutLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedDayIndex, setSelectedDayIndex] = useState('');
  const [startingWorkout, setStartingWorkout] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
      checkForDraft();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [programsRes, logsRes] = await Promise.all([
        supabase
          .from('workout_programs')
          .select('id, name, program_data, is_public, description, days_per_week, goal')
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        supabase
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
          .limit(5)
      ]);

      if (programsRes.data) {
        setPrograms(programsRes.data.map(p => ({
          ...p,
          program_data: p.program_data as unknown as ProgramData
        })));
      }

      if (logsRes.data) {
        setRecentLogs(logsRes.data as WorkoutLogEntry[]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForDraft = () => {
    const activeSession = localStorage.getItem('active_workout_session');
    if (activeSession) {
      try {
        const session = JSON.parse(activeSession);
        const sessionAge = Date.now() - session.startedAt;
        const maxAge = 24 * 60 * 60 * 1000;
        if (sessionAge < maxAge) {
          setHasDraft(true);
        } else {
          localStorage.removeItem('active_workout_session');
        }
      } catch {
        localStorage.removeItem('active_workout_session');
      }
    }
  };

  const startWorkout = async () => {
    const program = programs.find(p => p.id === selectedProgramId);
    if (!program || !selectedDayIndex) {
      toast.error('Välj program och dag');
      return;
    }

    setStartingWorkout(true);

    try {
      const dayIndex = parseInt(selectedDayIndex);
      const day = program.program_data.days[dayIndex];
      
      // Fetch last weights
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

      const sessionData = {
        programId: program.id,
        programName: program.name,
        dayIndex: selectedDayIndex,
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
      setStartingWorkout(false);
    }
  };

  const quickStartProgram = (programId: string) => {
    setSelectedProgramId(programId);
    setSelectedDayIndex('0');
    setShowProgramDialog(true);
  };

  const resumeSession = () => {
    navigate('/training/session');
  };

  const selectedProgram = programs.find(p => p.id === selectedProgramId);
  const totalWorkouts = recentLogs.length;
  const thisWeekWorkouts = recentLogs.filter(log => {
    const logDate = new Date(log.completed_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return logDate >= weekAgo;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Rest Timer Toggle */}
      {showRestTimer && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-4"
        >
          <RestTimer onClose={() => setShowRestTimer(false)} />
        </motion.div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* Resume Draft Card - Only if draft exists */}
        {hasDraft && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="col-span-2 md:col-span-3"
          >
            <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Play className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">Pågående pass</p>
                    <p className="text-xs text-muted-foreground">Fortsätt där du slutade</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem('active_workout_session');
                      setHasDraft(false);
                      toast.success('Pass borttaget');
                    }}
                    className="text-muted-foreground"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" onClick={resumeSession}>
                    Fortsätt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Create Program Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card 
            className="h-28 cursor-pointer bg-gradient-to-br from-gym-orange/20 to-gym-amber/10 border-gym-orange/30 hover:border-gym-orange/50 transition-all"
            onClick={() => navigate('/workout-log', { state: { createProgram: true } })}
          >
            <CardContent className="p-3 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Sparkles className="w-5 h-5 text-gym-orange" />
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">Skapa program</p>
                <p className="text-[10px] text-muted-foreground">AI-genererat</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Start Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card 
            className="h-28 cursor-pointer bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/30 hover:border-green-500/50 transition-all"
            onClick={() => programs.length > 0 ? setShowProgramDialog(true) : toast.info('Skapa ett program först')}
          >
            <CardContent className="p-3 h-full flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <Play className="w-5 h-5 text-green-500" />
                <Dumbbell className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">Starta pass</p>
                <p className="text-[10px] text-muted-foreground">Välj program & dag</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card 
            className="h-28 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/stats')}
          >
            <CardContent className="p-3 h-full flex flex-col justify-between">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-xl font-bold leading-none">{thisWeekWorkouts}</p>
                <p className="text-[10px] text-muted-foreground">pass denna vecka</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Programs Section Header */}
        {programs.length > 0 && (
          <div className="col-span-2 md:col-span-3 flex items-center justify-between pt-2">
            <h3 className="font-display font-bold text-sm">Mina program</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/public-programs')} className="text-xs h-7">
              Utforska fler <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        )}

        {/* Program Cards */}
        {programs.slice(0, 4).map((program, index) => (
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className="h-32 cursor-pointer hover:border-primary/50 transition-all group"
              onClick={() => quickStartProgram(program.id)}
            >
              <CardContent className="p-3 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{program.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {program.program_data.days?.length || 0} dagar
                    </p>
                  </div>
                  {program.is_public && (
                    <Globe className="w-3 h-3 text-green-500 shrink-0" />
                  )}
                </div>
                <div className="space-y-1">
                  {program.program_data.days?.slice(0, 2).map((day, idx) => (
                    <p key={idx} className="text-[10px] text-muted-foreground truncate">
                      {day.day}: {day.focus}
                    </p>
                  ))}
                  {(program.program_data.days?.length || 0) > 2 && (
                    <p className="text-[10px] text-muted-foreground">
                      +{program.program_data.days.length - 2} dagar till
                    </p>
                  )}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost" className="h-6 text-xs w-full">
                    <Play className="w-3 h-3 mr-1" /> Starta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* No Programs Card */}
        {programs.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-2 md:col-span-2"
          >
            <Card className="h-32 border-dashed">
              <CardContent className="p-4 h-full flex flex-col items-center justify-center text-center">
                <Dumbbell className="w-8 h-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Inga program än
                </p>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="text-xs mt-1"
                  onClick={() => navigate('/workout-log', { state: { createProgram: true } })}
                >
                  Skapa ditt första program
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Recent Workouts Section */}
        {recentLogs.length > 0 && (
          <>
            <div className="col-span-2 md:col-span-3 flex items-center justify-between pt-2">
              <h3 className="font-display font-bold text-sm">Senaste pass</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/workout-log')} className="text-xs h-7">
                Visa alla <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {recentLogs.slice(0, 3).map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                whileTap={{ scale: 0.98 }}
                className={index === 0 ? "col-span-2 md:col-span-1" : ""}
              >
                <Card 
                  className="h-24 cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => navigate('/workout-log')}
                >
                  <CardContent className="p-3 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {log.workout_day}
                      </Badge>
                      {log.duration_minutes && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {log.duration_minutes}m
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.completed_at), 'd MMM', { locale: sv })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {log.exercise_logs?.length || 0} övningar
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </>
        )}

        {/* Rest Timer Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card 
            className={`h-24 cursor-pointer transition-all ${showRestTimer ? 'bg-primary/10 border-primary/50' : 'hover:bg-muted/50'}`}
            onClick={() => setShowRestTimer(!showRestTimer)}
          >
            <CardContent className="p-3 h-full flex flex-col justify-between">
              <Clock className={`w-5 h-5 ${showRestTimer ? 'text-primary' : 'text-blue-500'}`} />
              <div>
                <p className="text-sm font-medium">Vilotimer</p>
                <p className="text-[10px] text-muted-foreground">
                  {showRestTimer ? 'Aktiv' : 'Tryck för timer'}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Ad Banner */}
      <div className="mt-4">
        <AdBanner format="horizontal" placement="training_bottom" showPremiumPrompt={false} />
      </div>

      {/* Start Workout Dialog */}
      <Dialog open={showProgramDialog} onOpenChange={setShowProgramDialog}>
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
              <Select 
                value={selectedProgramId} 
                onValueChange={(v) => { 
                  setSelectedProgramId(v); 
                  setSelectedDayIndex('0'); 
                }}
              >
                <SelectTrigger>
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
            </div>
            
            {selectedProgram && (
              <div className="space-y-2">
                <Label>Träningsdag</Label>
                <Select value={selectedDayIndex} onValueChange={setSelectedDayIndex}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj dag" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProgram.program_data.days.map((day, index) => (
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
            <Button variant="outline" onClick={() => setShowProgramDialog(false)} className="flex-1">
              Avbryt
            </Button>
            <Button 
              onClick={startWorkout} 
              className="flex-1" 
              disabled={!selectedProgramId || selectedDayIndex === '' || startingWorkout}
            >
              {startingWorkout ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Starta pass
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
