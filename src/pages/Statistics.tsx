import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, ArrowLeft, Loader2, TrendingUp, TrendingDown, Calendar, Flame, Weight, Footprints, MapPin, Timer, Zap, Sparkles, Minus, Watch } from 'lucide-react';
import GarminActivitiesSection from '@/components/GarminActivitiesSection';
import AdBanner from '@/components/AdBanner';
import TrainingAIAnalysis from '@/components/TrainingAIAnalysis';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, subDays, startOfWeek, eachWeekOfInterval, parseISO, addDays, differenceInDays } from 'date-fns';
import { sv } from 'date-fns/locale';

interface ProgressionData {
  firstMonthAvg: number;
  recentAvg: number;
  percentChange: number;
  isImproving: boolean;
  hasEnoughData: boolean;
}

interface ExerciseLog {
  exercise_name: string;
  weight_kg: number | null;
  sets_completed: number;
  reps_completed: string;
  created_at: string;
  workout_logs: {
    completed_at: string;
  } | null;
}

interface WorkoutLog {
  id: string;
  completed_at: string;
  duration_minutes: number | null;
}

interface CardioLog {
  id: string;
  activity_type: string;
  duration_minutes: number;
  distance_km: number | null;
  completed_at: string;
}

interface WeeklyData {
  week: string;
  workouts: number;
  totalMinutes: number;
}

interface CardioWeeklyData {
  week: string;
  sessions: number;
  totalMinutes: number;
  totalDistance: number;
}

interface ExerciseProgress {
  date: string;
  weight: number;
  volume: number;
}

interface WodLog {
  id: string;
  wod_name: string;
  wod_format: string;
  completed_at: string;
}

const XP_PER_WOD = 50;

export default function Statistics() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [cardioLogs, setCardioLogs] = useState<CardioLog[]>([]);
  const [wodLogs, setWodLogs] = useState<WodLog[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [uniqueExercises, setUniqueExercises] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch workout logs
    const { data: workouts } = await supabase
      .from('workout_logs')
      .select('id, completed_at, duration_minutes')
      .order('completed_at', { ascending: true });
    
    if (workouts) {
      setWorkoutLogs(workouts);
    }

    // Fetch exercise logs with workout dates
    const { data: exercises } = await supabase
      .from('exercise_logs')
      .select(`
        exercise_name,
        weight_kg,
        sets_completed,
        reps_completed,
        created_at,
        workout_logs (
          completed_at
        )
      `)
      .not('weight_kg', 'is', null)
      .order('created_at', { ascending: true });
    
    if (exercises) {
      setExerciseLogs(exercises as ExerciseLog[]);
      
      // Get unique exercise names
      const names = [...new Set(exercises.map(e => e.exercise_name))].sort();
      setUniqueExercises(names);
      if (names.length > 0 && !selectedExercise) {
        setSelectedExercise(names[0]);
      }
    }

    // Fetch cardio logs
    const { data: cardio } = await supabase
      .from('cardio_logs')
      .select('id, activity_type, duration_minutes, distance_km, completed_at')
      .order('completed_at', { ascending: true });
    
    if (cardio) {
      setCardioLogs(cardio);
    }

    // Fetch WOD logs
    const { data: wods } = await supabase
      .from('wod_logs')
      .select('id, wod_name, wod_format, completed_at')
      .order('completed_at', { ascending: true });
    
    if (wods) {
      setWodLogs(wods);
    }
    
    setIsLoading(false);
  };

  // Calculate weekly workout frequency
  const getWeeklyData = (): WeeklyData[] => {
    if (workoutLogs.length === 0) return [];
    
    const now = new Date();
    const twelveWeeksAgo = subDays(now, 84);
    
    const weeks = eachWeekOfInterval(
      { start: twelveWeeksAgo, end: now },
      { weekStartsOn: 1 }
    );

    return weeks.map(weekStart => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const weekWorkouts = workoutLogs.filter(log => {
        const logDate = parseISO(log.completed_at);
        return logDate >= weekStart && logDate < weekEnd;
      });

      return {
        week: format(weekStart, 'd MMM', { locale: sv }),
        workouts: weekWorkouts.length,
        totalMinutes: weekWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0)
      };
    });
  };

  // Calculate weekly cardio data
  const getCardioWeeklyData = (): CardioWeeklyData[] => {
    if (cardioLogs.length === 0) return [];
    
    const now = new Date();
    const twelveWeeksAgo = subDays(now, 84);
    
    const weeks = eachWeekOfInterval(
      { start: twelveWeeksAgo, end: now },
      { weekStartsOn: 1 }
    );

    return weeks.map(weekStart => {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      
      const weekCardio = cardioLogs.filter(log => {
        const logDate = parseISO(log.completed_at);
        return logDate >= weekStart && logDate < weekEnd;
      });

      return {
        week: format(weekStart, 'd MMM', { locale: sv }),
        sessions: weekCardio.length,
        totalMinutes: weekCardio.reduce((sum, c) => sum + c.duration_minutes, 0),
        totalDistance: weekCardio.reduce((sum, c) => sum + (c.distance_km || 0), 0)
      };
    });
  };

  // Calculate exercise progression
  const getExerciseProgress = (): ExerciseProgress[] => {
    if (!selectedExercise) return [];
    
    const exerciseData = exerciseLogs
      .filter(log => log.exercise_name === selectedExercise && log.weight_kg)
      .map(log => {
        const date = log.workout_logs?.completed_at || log.created_at;
        const reps = parseInt(log.reps_completed.split('-')[0]) || parseInt(log.reps_completed) || 10;
        return {
          date: format(parseISO(date), 'd MMM', { locale: sv }),
          weight: log.weight_kg!,
          volume: log.weight_kg! * log.sets_completed * reps
        };
      });

    // Group by date and take max weight
    const grouped = exerciseData.reduce((acc, curr) => {
      if (!acc[curr.date] || curr.weight > acc[curr.date].weight) {
        acc[curr.date] = curr;
      }
      return acc;
    }, {} as Record<string, ExerciseProgress>);

    return Object.values(grouped);
  };

  // Helper function to calculate weeks since first log
  const getWeeksSinceStart = (logs: { completed_at?: string; created_at?: string }[]): number => {
    if (logs.length === 0) return 1;
    const firstDate = logs[0].completed_at || logs[0].created_at;
    if (!firstDate) return 1;
    const diffMs = Date.now() - parseISO(firstDate).getTime();
    const weeks = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
    return weeks;
  };

  // Calculate stats with user's actual active period
  const totalWorkouts = workoutLogs.length;
  const totalMinutes = workoutLogs.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
  const workoutWeeks = getWeeksSinceStart(workoutLogs);
  const avgWorkoutsPerWeek = totalWorkouts > 0 ? (totalWorkouts / workoutWeeks).toFixed(1) : '0';
  const maxWeight = selectedExercise 
    ? Math.max(...exerciseLogs.filter(e => e.exercise_name === selectedExercise).map(e => e.weight_kg || 0))
    : 0;

  // Cardio stats with user's actual active period
  const totalCardioSessions = cardioLogs.length;
  const totalCardioMinutes = cardioLogs.reduce((sum, c) => sum + c.duration_minutes, 0);
  const totalCardioDistance = cardioLogs.reduce((sum, c) => sum + (c.distance_km || 0), 0);
  const cardioWeeks = getWeeksSinceStart(cardioLogs);
  const avgCardioPerWeek = totalCardioSessions > 0 ? (totalCardioSessions / cardioWeeks).toFixed(1) : '0';

  // CrossFit/WOD stats with user's actual active period
  const totalWods = wodLogs.length;
  const totalWodXP = totalWods * XP_PER_WOD;
  const wodWeeks = getWeeksSinceStart(wodLogs);
  const avgWodsPerWeek = totalWods > 0 ? (totalWods / wodWeeks).toFixed(1) : '0';
  const wodFormats = wodLogs.reduce((acc, wod) => {
    acc[wod.wod_format] = (acc[wod.wod_format] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mostPopularFormat = Object.entries(wodFormats).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

  // Calculate progression comparing first month vs recent month
  const calculateProgression = (logs: { completed_at: string }[]): ProgressionData => {
    if (logs.length < 2) {
      return { firstMonthAvg: 0, recentAvg: 0, percentChange: 0, isImproving: false, hasEnoughData: false };
    }

    const sortedLogs = [...logs].sort((a, b) => 
      parseISO(a.completed_at).getTime() - parseISO(b.completed_at).getTime()
    );

    const firstLogDate = parseISO(sortedLogs[0].completed_at);
    const lastLogDate = parseISO(sortedLogs[sortedLogs.length - 1].completed_at);
    const totalDays = differenceInDays(lastLogDate, firstLogDate);

    // Need at least 30 days of data for meaningful comparison
    if (totalDays < 30) {
      return { firstMonthAvg: 0, recentAvg: 0, percentChange: 0, isImproving: false, hasEnoughData: false };
    }

    const firstMonthEnd = addDays(firstLogDate, 30);
    const recentMonthStart = subDays(new Date(), 30);

    const firstMonthLogs = sortedLogs.filter(log => {
      const date = parseISO(log.completed_at);
      return date >= firstLogDate && date <= firstMonthEnd;
    });

    const recentMonthLogs = sortedLogs.filter(log => {
      const date = parseISO(log.completed_at);
      return date >= recentMonthStart;
    });

    const firstMonthAvg = firstMonthLogs.length / 4; // Weekly avg
    const recentAvg = recentMonthLogs.length / 4; // Weekly avg

    const percentChange = firstMonthAvg > 0 
      ? Math.round(((recentAvg - firstMonthAvg) / firstMonthAvg) * 100)
      : recentAvg > 0 ? 100 : 0;

    return {
      firstMonthAvg,
      recentAvg,
      percentChange,
      isImproving: recentAvg >= firstMonthAvg,
      hasEnoughData: true
    };
  };

  const workoutProgression = calculateProgression(workoutLogs.map(w => ({ completed_at: w.completed_at })));
  const cardioProgression = calculateProgression(cardioLogs.map(c => ({ completed_at: c.completed_at })));
  const wodProgression = calculateProgression(wodLogs.map(w => ({ completed_at: w.completed_at })));

  const weeklyData = getWeeklyData();
  const cardioWeeklyData = getCardioWeeklyData();
  const exerciseProgress = getExerciseProgress();

  // Progression indicator component
  const ProgressionIndicator = ({ progression, label }: { progression: ProgressionData; label: string }) => {
    if (!progression.hasEnoughData) {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Minus className="w-3 h-3" />
          <span>Behöver mer data</span>
        </div>
      );
    }

    const isPositive = progression.percentChange >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-green-500' : 'text-red-500';
    const bgClass = isPositive ? 'bg-green-500/10' : 'bg-red-500/10';

    return (
      <div className={`flex items-center gap-2 text-xs ${colorClass} px-2 py-1 rounded-full ${bgClass}`}>
        <Icon className="w-3 h-3" />
        <span>
          {isPositive ? '+' : ''}{progression.percentChange}% vs första månaden
        </span>
      </div>
    );
  };

  if (loading || isLoading) {
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
        <div className="container px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">STATISTIK</span>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        {/* Leaderboard ad at top */}
        <AdBanner format="leaderboard" placement="statistics_leaderboard" className="mb-6" />
        
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold">Din utveckling</h1>
          <p className="text-muted-foreground">Spåra din träningsfrekvens och styrkeökning</p>
        </div>

        <Tabs defaultValue="strength" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="strength" className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Styrka
            </TabsTrigger>
            <TabsTrigger value="cardio" className="flex items-center gap-2">
              <Footprints className="w-4 h-4" />
              Kondition
            </TabsTrigger>
            <TabsTrigger value="crossfit" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              CrossFit
            </TabsTrigger>
          </TabsList>

          {/* Strength Tab */}
          <TabsContent value="strength" className="space-y-6">
            {/* Progression Banner */}
            {workoutProgression.hasEnoughData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`border-2 ${workoutProgression.isImproving ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        {workoutProgression.isImproving ? (
                          <div className="p-2 bg-green-500/20 rounded-full">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          </div>
                        ) : (
                          <div className="p-2 bg-amber-500/20 rounded-full">
                            <TrendingDown className="w-5 h-5 text-amber-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">
                            {workoutProgression.isImproving 
                              ? 'Du förbättrar dig! 💪' 
                              : 'Lite lägre aktivitet just nu'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {workoutProgression.percentChange >= 0 ? '+' : ''}{workoutProgression.percentChange}% jämfört med din första månad
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground">Första månaden</p>
                          <p className="font-bold">{workoutProgression.firstMonthAvg.toFixed(1)} pass/vecka</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Senaste månaden</p>
                          <p className="font-bold">{workoutProgression.recentAvg.toFixed(1)} pass/vecka</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{totalWorkouts}</p>
                        <p className="text-xs text-muted-foreground">Totala pass</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gym-orange/10 rounded-lg">
                        <Flame className="w-5 h-5 text-gym-orange" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{avgWorkoutsPerWeek}</p>
                        <p className="text-xs text-muted-foreground">Pass/vecka</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{Math.round(totalMinutes / 60)}h</p>
                        <p className="text-xs text-muted-foreground">Total tid</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Weight className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{maxWeight}kg</p>
                        <p className="text-xs text-muted-foreground">Max vikt</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Training Frequency Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Träningsfrekvens</CardTitle>
                    <CardDescription>Antal pass per vecka de senaste 12 veckorna</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {weeklyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="week" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Bar 
                            dataKey="workouts" 
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]}
                            name="Pass"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Ingen data att visa ännu
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Training Duration Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Träningstid</CardTitle>
                    <CardDescription>Totala minuter per vecka</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {weeklyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="week" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <defs>
                            <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area 
                            type="monotone" 
                            dataKey="totalMinutes" 
                            stroke="hsl(24, 95%, 53%)" 
                            fill="url(#colorMinutes)"
                            name="Minuter"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Ingen data att visa ännu
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Exercise Progression Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="lg:col-span-2"
              >
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle>Styrkeutveckling</CardTitle>
                        <CardDescription>Följ din viktökning över tid</CardDescription>
                      </div>
                      {uniqueExercises.length > 0 && (
                        <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Välj övning" />
                          </SelectTrigger>
                          <SelectContent>
                            {uniqueExercises.map(name => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {exerciseProgress.length > 0 ? (
                      <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={exerciseProgress}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="date" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            yAxisId="left"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Legend />
                          <Line 
                            yAxisId="left"
                            type="monotone" 
                            dataKey="weight" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))' }}
                            name="Vikt (kg)"
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="volume" 
                            stroke="hsl(24, 95%, 53%)" 
                            strokeWidth={2}
                            dot={{ fill: 'hsl(24, 95%, 53%)' }}
                            name="Volym (kg×sets×reps)"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                        {uniqueExercises.length === 0 
                          ? 'Logga pass med vikter för att se din utveckling'
                          : 'Ingen viktdata för denna övning ännu'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* Cardio Tab */}
          <TabsContent value="cardio" className="space-y-6">
            {/* Progression Banner */}
            {cardioProgression.hasEnoughData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`border-2 ${cardioProgression.isImproving ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        {cardioProgression.isImproving ? (
                          <div className="p-2 bg-green-500/20 rounded-full">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          </div>
                        ) : (
                          <div className="p-2 bg-amber-500/20 rounded-full">
                            <TrendingDown className="w-5 h-5 text-amber-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">
                            {cardioProgression.isImproving 
                              ? 'Bra konditionsträning! 🏃' 
                              : 'Lite mindre kondition just nu'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {cardioProgression.percentChange >= 0 ? '+' : ''}{cardioProgression.percentChange}% jämfört med din första månad
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground">Första månaden</p>
                          <p className="font-bold">{cardioProgression.firstMonthAvg.toFixed(1)} pass/vecka</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Senaste månaden</p>
                          <p className="font-bold">{cardioProgression.recentAvg.toFixed(1)} pass/vecka</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Cardio Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Footprints className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{totalCardioSessions}</p>
                        <p className="text-xs text-muted-foreground">Totala pass</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gym-orange/10 rounded-lg">
                        <Flame className="w-5 h-5 text-gym-orange" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{avgCardioPerWeek}</p>
                        <p className="text-xs text-muted-foreground">Pass/vecka</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <Timer className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{Math.round(totalCardioMinutes / 60)}h</p>
                        <p className="text-xs text-muted-foreground">Total tid</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <MapPin className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{totalCardioDistance.toFixed(1)}km</p>
                        <p className="text-xs text-muted-foreground">Total distans</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Cardio Distance Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Distans per vecka</CardTitle>
                    <CardDescription>Totala kilometer de senaste 12 veckorna</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cardioWeeklyData.length > 0 && cardioWeeklyData.some(d => d.totalDistance > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={cardioWeeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="week" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                            formatter={(value: number) => [`${value.toFixed(1)} km`, 'Distans']}
                          />
                          <defs>
                            <linearGradient id="colorDistance" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area 
                            type="monotone" 
                            dataKey="totalDistance" 
                            stroke="hsl(var(--primary))" 
                            fill="url(#colorDistance)"
                            name="Kilometer"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Logga konditionspass med distans för att se din utveckling
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Cardio Time Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Tid per vecka</CardTitle>
                    <CardDescription>Totala minuter konditionsträning</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cardioWeeklyData.length > 0 && cardioWeeklyData.some(d => d.totalMinutes > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={cardioWeeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="week" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Bar 
                            dataKey="totalMinutes" 
                            fill="hsl(24, 95%, 53%)" 
                            radius={[4, 4, 0, 0]}
                            name="Minuter"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Logga konditionspass för att se din utveckling
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Cardio Sessions Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="lg:col-span-2"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Antal konditionspass</CardTitle>
                    <CardDescription>Pass per vecka de senaste 12 veckorna</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cardioWeeklyData.length > 0 && cardioWeeklyData.some(d => d.sessions > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={cardioWeeklyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="week" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Bar 
                            dataKey="sessions" 
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]}
                            name="Pass"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Logga konditionspass för att se din utveckling
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Garmin Activities Section */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Watch className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">Garmin Connect</h3>
              </div>
              <GarminActivitiesSection />
            </div>
          </TabsContent>

          {/* CrossFit Tab */}
          <TabsContent value="crossfit" className="space-y-6">
            {/* Progression Banner */}
            {wodProgression.hasEnoughData && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`border-2 ${wodProgression.isImproving ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        {wodProgression.isImproving ? (
                          <div className="p-2 bg-green-500/20 rounded-full">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          </div>
                        ) : (
                          <div className="p-2 bg-amber-500/20 rounded-full">
                            <TrendingDown className="w-5 h-5 text-amber-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">
                            {wodProgression.isImproving 
                              ? 'Stark WOD-utveckling! ⚡' 
                              : 'Lite färre WODs just nu'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {wodProgression.percentChange >= 0 ? '+' : ''}{wodProgression.percentChange}% jämfört med din första månad
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-muted-foreground">Första månaden</p>
                          <p className="font-bold">{wodProgression.firstMonthAvg.toFixed(1)} WODs/vecka</p>
                        </div>
                        <div className="text-center">
                          <p className="text-muted-foreground">Senaste månaden</p>
                          <p className="font-bold">{wodProgression.recentAvg.toFixed(1)} WODs/vecka</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* CrossFit Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{totalWods}</p>
                        <p className="text-xs text-muted-foreground">Totala WODs</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Sparkles className="w-5 h-5 text-yellow-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{totalWodXP}</p>
                        <p className="text-xs text-muted-foreground">Total XP</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gym-orange/10 rounded-lg">
                        <Flame className="w-5 h-5 text-gym-orange" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{avgWodsPerWeek}</p>
                        <p className="text-xs text-muted-foreground">WODs/vecka</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold">{mostPopularFormat}</p>
                        <p className="text-xs text-muted-foreground">Favoritformat</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* WOD Format Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>WOD-format</CardTitle>
                  <CardDescription>Fördelning av dina loggade WODs per format</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(wodFormats).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={Object.entries(wodFormats).map(([format, count]) => ({ format, count }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="format" 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Bar 
                          dataKey="count" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                          name="Antal"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Logga WODs för att se din fördelning
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
        
        {/* AI Training Analysis */}
        <div className="mt-8">
          <TrainingAIAnalysis />
        </div>
        
        {/* Vertical sidebar ad - only on desktop */}
        <div className="hidden lg:block fixed right-4 top-1/2 -translate-y-1/2 z-40">
          <AdBanner format="vertical" placement="statistics_sidebar" showPremiumPrompt={false} />
        </div>
        
        {/* Bottom Ad Banner - horizontal */}
        <AdBanner format="horizontal" placement="statistics_bottom" className="mt-8" />
      </main>
    </div>
  );
}
