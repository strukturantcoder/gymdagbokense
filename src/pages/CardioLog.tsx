import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Dumbbell, Plus, Trash2, Loader2, ArrowLeft, 
  Bike, Footprints, Waves, Flag, Timer, Flame, MapPin, Target, Sparkles
} from 'lucide-react';
import GenerateCardioPlanDialog from '@/components/GenerateCardioPlanDialog';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { sv } from 'date-fns/locale';
import confetti from 'canvas-confetti';

interface CardioLog {
  id: string;
  activity_type: string;
  duration_minutes: number;
  distance_km: number | null;
  calories_burned: number | null;
  notes: string | null;
  completed_at: string;
}

interface CardioGoal {
  id: string;
  activity_type: string;
  target_type: string;
  target_value: number;
  period: string;
}

const activityTypes = [
  { value: 'running', label: 'Löpning', icon: Footprints },
  { value: 'walking', label: 'Promenad', icon: Footprints },
  { value: 'cycling', label: 'Cykling', icon: Bike },
  { value: 'swimming', label: 'Simning', icon: Waves },
  { value: 'golf', label: 'Golf', icon: Flag },
  { value: 'other', label: 'Annat', icon: Timer },
];

const getActivityIcon = (type: string) => {
  const activity = activityTypes.find(a => a.value === type);
  return activity?.icon || Timer;
};

const getActivityLabel = (type: string) => {
  const activity = activityTypes.find(a => a.value === type);
  return activity?.label || type;
};

// XP calculations for cardio
const CARDIO_XP_PER_MINUTE = 2;
const CARDIO_XP_PER_KM = 10;

export default function CardioLog() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<CardioLog[]>([]);
  const [goals, setGoals] = useState<CardioGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  // Form state
  const [activityType, setActivityType] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [notes, setNotes] = useState('');

  // Goal form state
  const [goalActivityType, setGoalActivityType] = useState('all');
  const [goalTargetType, setGoalTargetType] = useState('distance_km');
  const [goalTargetValue, setGoalTargetValue] = useState('');
  const [goalPeriod, setGoalPeriod] = useState('weekly');

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
    await Promise.all([fetchLogs(), fetchGoals()]);
    setIsLoading(false);
  };

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('cardio_logs')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching cardio logs:', error);
    } else {
      setLogs(data || []);
    }
  };

  const fetchGoals = async () => {
    const { data, error } = await supabase
      .from('cardio_goals')
      .select('*');

    if (error) {
      console.error('Error fetching cardio goals:', error);
    } else {
      setGoals(data || []);
    }
  };

  const calculateXP = (duration: number, distance: number | null) => {
    let xp = duration * CARDIO_XP_PER_MINUTE;
    if (distance) {
      xp += distance * CARDIO_XP_PER_KM;
    }
    return Math.round(xp);
  };

  const updateUserStats = async (duration: number, distance: number | null) => {
    if (!user) return { xpEarned: 0, newStats: null };

    const xpEarned = calculateXP(duration, distance);

    // First get current stats
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('total_xp, total_cardio_sessions, total_cardio_minutes, total_cardio_distance_km')
      .eq('user_id', user.id)
      .maybeSingle();

    let newStats;
    if (currentStats) {
      newStats = {
        total_cardio_sessions: currentStats.total_cardio_sessions + 1,
        total_cardio_minutes: currentStats.total_cardio_minutes + duration,
        total_cardio_distance_km: Number(currentStats.total_cardio_distance_km) + (distance || 0)
      };
      await supabase
        .from('user_stats')
        .update({
          total_xp: currentStats.total_xp + xpEarned,
          ...newStats
        })
        .eq('user_id', user.id);
    } else {
      newStats = {
        total_cardio_sessions: 1,
        total_cardio_minutes: duration,
        total_cardio_distance_km: distance || 0
      };
      await supabase
        .from('user_stats')
        .insert({
          user_id: user.id,
          total_xp: xpEarned,
          ...newStats
        });
    }

    return { xpEarned, newStats };
  };

  const checkCardioAchievements = async (newStats: { total_cardio_sessions: number; total_cardio_minutes: number; total_cardio_distance_km: number }) => {
    if (!user) return;

    // Fetch all cardio achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .in('requirement_type', ['cardio_sessions', 'cardio_distance', 'cardio_minutes']);

    if (!achievements) return;

    // Fetch user's earned achievements
    const { data: earnedAchievements } = await supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id);

    const earnedIds = new Set(earnedAchievements?.map(e => e.achievement_id) || []);

    // Check each achievement
    for (const achievement of achievements) {
      if (earnedIds.has(achievement.id)) continue;

      let currentValue = 0;
      switch (achievement.requirement_type) {
        case 'cardio_sessions':
          currentValue = newStats.total_cardio_sessions;
          break;
        case 'cardio_minutes':
          currentValue = newStats.total_cardio_minutes;
          break;
        case 'cardio_distance':
          currentValue = newStats.total_cardio_distance_km;
          break;
      }

      if (currentValue >= achievement.requirement_value) {
        // Award achievement
        const { error } = await supabase
          .from('user_achievements')
          .insert({ user_id: user.id, achievement_id: achievement.id });

        if (!error) {
          // Award XP
          await supabase
            .from('user_stats')
            .update({ total_xp: supabase.rpc ? undefined : undefined })
            .eq('user_id', user.id);

          // Get current XP and update
          const { data: stats } = await supabase
            .from('user_stats')
            .select('total_xp')
            .eq('user_id', user.id)
            .single();

          if (stats) {
            await supabase
              .from('user_stats')
              .update({ total_xp: stats.total_xp + achievement.xp_reward })
              .eq('user_id', user.id);
          }

          toast.success(`🏆 Achievement: ${achievement.name}! +${achievement.xp_reward} XP`, {
            duration: 5000,
            icon: achievement.icon
          });
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      }
    }
  };

  const handleSave = async () => {
    if (!activityType || !durationMinutes) {
      toast.error('Fyll i aktivitetstyp och tid');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('cardio_logs').insert({
        user_id: user!.id,
        activity_type: activityType,
        duration_minutes: parseInt(durationMinutes),
        distance_km: distanceKm ? parseFloat(distanceKm) : null,
        calories_burned: caloriesBurned ? parseInt(caloriesBurned) : null,
        notes: notes || null,
      });

      if (error) throw error;

      const { xpEarned, newStats } = await updateUserStats(
        parseInt(durationMinutes),
        distanceKm ? parseFloat(distanceKm) : null
      );

      // Check goals
      await checkGoals(activityType, parseInt(durationMinutes), distanceKm ? parseFloat(distanceKm) : null);

      // Check achievements
      if (newStats) {
        await checkCardioAchievements(newStats);
      }

      toast.success(`Konditionspass loggat! +${xpEarned} XP`);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      
      resetForm();
      fetchLogs();
    } catch (error) {
      console.error('Error saving cardio log:', error);
      toast.error('Kunde inte spara passet');
    } finally {
      setIsSaving(false);
    }
  };

  const checkGoals = async (activity: string, duration: number, distance: number | null) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    for (const goal of goals) {
      // Check if goal applies to this activity
      if (goal.activity_type !== 'all' && goal.activity_type !== activity) continue;

      // Get period dates
      const periodStart = goal.period === 'weekly' ? weekStart : monthStart;
      const periodEnd = goal.period === 'weekly' ? weekEnd : monthEnd;

      // Get logs for this period
      const { data: periodLogs } = await supabase
        .from('cardio_logs')
        .select('*')
        .gte('completed_at', periodStart.toISOString())
        .lte('completed_at', periodEnd.toISOString());

      if (!periodLogs) continue;

      // Filter by activity if needed
      const relevantLogs = goal.activity_type === 'all' 
        ? periodLogs 
        : periodLogs.filter(l => l.activity_type === goal.activity_type);

      // Calculate current progress
      let currentValue = 0;
      if (goal.target_type === 'distance_km') {
        currentValue = relevantLogs.reduce((sum, l) => sum + (l.distance_km || 0), 0);
      } else if (goal.target_type === 'duration_minutes') {
        currentValue = relevantLogs.reduce((sum, l) => sum + l.duration_minutes, 0);
      } else if (goal.target_type === 'sessions') {
        currentValue = relevantLogs.length;
      }

      // Check if goal reached
      if (currentValue >= goal.target_value) {
        toast.success(`🎯 Mål uppnått! ${getGoalDescription(goal)}`);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }
  };

  const getGoalDescription = (goal: CardioGoal) => {
    const activityLabel = goal.activity_type === 'all' ? 'Alla aktiviteter' : getActivityLabel(goal.activity_type);
    const targetLabel = goal.target_type === 'distance_km' ? 'km' 
      : goal.target_type === 'duration_minutes' ? 'minuter' : 'pass';
    const periodLabel = goal.period === 'weekly' ? 'vecka' : 'månad';
    return `${goal.target_value} ${targetLabel} ${activityLabel.toLowerCase()} per ${periodLabel}`;
  };

  const handleSaveGoal = async () => {
    if (!goalTargetValue) {
      toast.error('Ange ett målvärde');
      return;
    }

    try {
      const { error } = await supabase.from('cardio_goals').upsert({
        user_id: user!.id,
        activity_type: goalActivityType,
        target_type: goalTargetType,
        target_value: parseFloat(goalTargetValue),
        period: goalPeriod,
      }, { onConflict: 'user_id,activity_type,target_type,period' });

      if (error) throw error;

      toast.success('Mål sparat!');
      setShowGoalDialog(false);
      setGoalTargetValue('');
      fetchGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Kunde inte spara målet');
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const { error } = await supabase.from('cardio_goals').delete().eq('id', id);
    if (error) {
      toast.error('Kunde inte ta bort målet');
    } else {
      toast.success('Mål borttaget');
      fetchGoals();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('cardio_logs')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Kunde inte ta bort passet');
    } else {
      toast.success('Pass borttaget');
      fetchLogs();
    }
  };

  const resetForm = () => {
    setActivityType('');
    setDurationMinutes('');
    setDistanceKm('');
    setCaloriesBurned('');
    setNotes('');
    setShowForm(false);
  };

  // Calculate goal progress
  const getGoalProgress = (goal: CardioGoal) => {
    const now = new Date();
    const periodStart = goal.period === 'weekly' 
      ? startOfWeek(now, { weekStartsOn: 1 }) 
      : startOfMonth(now);

    const relevantLogs = logs.filter(log => {
      const logDate = new Date(log.completed_at);
      const activityMatches = goal.activity_type === 'all' || log.activity_type === goal.activity_type;
      return activityMatches && logDate >= periodStart;
    });

    let currentValue = 0;
    if (goal.target_type === 'distance_km') {
      currentValue = relevantLogs.reduce((sum, l) => sum + (l.distance_km || 0), 0);
    } else if (goal.target_type === 'duration_minutes') {
      currentValue = relevantLogs.reduce((sum, l) => sum + l.duration_minutes, 0);
    } else if (goal.target_type === 'sessions') {
      currentValue = relevantLogs.length;
    }

    return { current: currentValue, target: goal.target_value, percentage: Math.min(100, (currentValue / goal.target_value) * 100) };
  };

  // Calculate stats
  const totalMinutes = logs.reduce((sum, log) => sum + log.duration_minutes, 0);
  const totalDistance = logs.reduce((sum, log) => sum + (log.distance_km || 0), 0);
  const totalCalories = logs.reduce((sum, log) => sum + (log.calories_burned || 0), 0);

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
        <div className="container px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">Konditionspass</span>
          </div>
          <div className="flex gap-2">
            <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Target className="w-4 h-4 mr-2" />
                  Sätt mål
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sätt konditionsmål</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Aktivitet</Label>
                    <Select value={goalActivityType} onValueChange={setGoalActivityType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alla aktiviteter</SelectItem>
                        {activityTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Måltyp</Label>
                    <Select value={goalTargetType} onValueChange={setGoalTargetType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distance_km">Distans (km)</SelectItem>
                        <SelectItem value="duration_minutes">Tid (minuter)</SelectItem>
                        <SelectItem value="sessions">Antal pass</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Målvärde</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={goalTargetValue}
                      onChange={(e) => setGoalTargetValue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Period</Label>
                    <Select value={goalPeriod} onValueChange={setGoalPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Per vecka</SelectItem>
                        <SelectItem value="monthly">Per månad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSaveGoal} className="w-full">Spara mål</Button>
                </div>
              </DialogContent>
            </Dialog>
            <GenerateCardioPlanDialog />
            <Button variant="hero" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Logga pass
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Timer className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalMinutes}</p>
                  <p className="text-sm text-muted-foreground">Minuter totalt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDistance.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Kilometer totalt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Flame className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCalories}</p>
                  <p className="text-sm text-muted-foreground">Kalorier brända</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Goals */}
        {goals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-display font-bold mb-4">Dina mål</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {goals.map(goal => {
                const progress = getGoalProgress(goal);
                const targetLabel = goal.target_type === 'distance_km' ? 'km' 
                  : goal.target_type === 'duration_minutes' ? 'min' : 'pass';
                return (
                  <Card key={goal.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {goal.activity_type === 'all' ? 'Alla aktiviteter' : getActivityLabel(goal.activity_type)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeleteGoal(goal.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {progress.current.toFixed(1)} / {goal.target_value} {targetLabel} ({goal.period === 'weekly' ? 'vecka' : 'månad'})
                      </p>
                      <Progress value={progress.percentage} className="h-2" />
                      {progress.percentage >= 100 && (
                        <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Mål uppnått!
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-primary/50 bg-gradient-to-b from-primary/5 to-card">
              <CardHeader>
                <CardTitle>Logga konditionspass</CardTitle>
                <CardDescription>
                  Du får {CARDIO_XP_PER_MINUTE} XP per minut + {CARDIO_XP_PER_KM} XP per km
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Aktivitetstyp *</Label>
                    <Select value={activityType} onValueChange={setActivityType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj aktivitet" />
                      </SelectTrigger>
                      <SelectContent>
                        {activityTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tid (minuter) *</Label>
                    <Input
                      type="number"
                      placeholder="45"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Distans (km)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="5.0"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Kalorier brända</Label>
                    <Input
                      type="number"
                      placeholder="300"
                      value={caloriesBurned}
                      onChange={(e) => setCaloriesBurned(e.target.value)}
                    />
                  </div>
                </div>

                {durationMinutes && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Förväntad XP: +{calculateXP(parseInt(durationMinutes) || 0, distanceKm ? parseFloat(distanceKm) : null)}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Anteckningar</Label>
                  <Textarea
                    placeholder="Hur kändes passet?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="hero" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sparar...
                      </>
                    ) : (
                      'Spara pass'
                    )}
                  </Button>
                  <Button variant="ghost" onClick={resetForm}>
                    Avbryt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Logs list */}
        <div>
          <h2 className="text-xl font-display font-bold mb-4">Senaste pass</h2>
          {logs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Footprints className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Du har inte loggat några konditionspass än
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const ActivityIcon = getActivityIcon(log.activity_type);
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                              <ActivityIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">
                                {getActivityLabel(log.activity_type)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(log.completed_at), 'd MMMM yyyy, HH:mm', { locale: sv })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="font-semibold">{log.duration_minutes} min</p>
                              {log.distance_km && (
                                <p className="text-sm text-muted-foreground">{log.distance_km} km</p>
                              )}
                            </div>
                            {log.calories_burned && (
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                  <Flame className="w-4 h-4 inline mr-1" />
                                  {log.calories_burned} kcal
                                </p>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(log.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {log.notes && (
                          <p className="mt-2 text-sm text-muted-foreground pl-16">
                            {log.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
