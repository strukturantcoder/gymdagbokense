import { useEffect, useState, useCallback } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, Trash2, Loader2,
  Bike, Footprints, Waves, Flag, Timer, Flame, MapPin, Target, Sparkles, Map, Play, Zap, Share2
} from 'lucide-react';
import ActiveCardioPlanSession from '@/components/ActiveCardioPlanSession';
import QuickStartCardio from '@/components/QuickStartCardio';
import GenerateCardioPlanDialog from '@/components/GenerateCardioPlanDialog';
import TabataWorkout from '@/components/TabataWorkout';
import AdBanner from '@/components/AdBanner';
import ShareToInstagramDialog from '@/components/ShareToInstagramDialog';
import RouteMapDialog from '@/components/RouteMapDialog';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { sv } from 'date-fns/locale';
import confetti from 'canvas-confetti';

const CARDIO_DRAFT_KEY = 'gymdagboken_cardio_draft';
const DRAFT_EXPIRY_HOURS = 24;

interface CardioDraft {
  activityType: string;
  durationMinutes: string;
  distanceKm: string;
  caloriesBurned: string;
  notes: string;
  userId: string;
  createdAt: string;
}

interface CardioLog {
  id: string;
  activity_type: string;
  duration_minutes: number;
  distance_km: number | null;
  calories_burned: number | null;
  notes: string | null;
  completed_at: string;
  has_route?: boolean;
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

const CARDIO_XP_PER_MINUTE = 2;
const CARDIO_XP_PER_KM = 10;

export default function CardioLogContent() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<CardioLog[]>([]);
  const [goals, setGoals] = useState<CardioGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  const [activityType, setActivityType] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [notes, setNotes] = useState('');

  const [goalActivityType, setGoalActivityType] = useState('all');
  const [goalTargetType, setGoalTargetType] = useState('distance_km');
  const [goalTargetValue, setGoalTargetValue] = useState('');
  const [goalPeriod, setGoalPeriod] = useState('weekly');

  const [showShareDialog, setShowShareDialog] = useState(false);
  const [cardioShareData, setCardioShareData] = useState<{
    activityType: string;
    duration: number;
    distance?: number;
    calories?: number;
  } | null>(null);

  const [showRouteMap, setShowRouteMap] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedLogLabel, setSelectedLogLabel] = useState('');
  const [logsWithRoutes, setLogsWithRoutes] = useState<Set<string>>(new Set());

  // Draft state
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showDeleteDraftDialog, setShowDeleteDraftDialog] = useState(false);

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (!user || !showForm) return;
    
    const draft: CardioDraft = {
      activityType,
      durationMinutes,
      distanceKm,
      caloriesBurned,
      notes,
      userId: user.id,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(CARDIO_DRAFT_KEY, JSON.stringify(draft));
  }, [user, showForm, activityType, durationMinutes, distanceKm, caloriesBurned, notes]);

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    const saved = localStorage.getItem(CARDIO_DRAFT_KEY);
    if (!saved || !user) return null;
    
    try {
      const draft: CardioDraft = JSON.parse(saved);
      
      // Check if draft belongs to current user
      if (draft.userId !== user.id) return null;
      
      // Check if draft is expired
      const createdAt = new Date(draft.createdAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > DRAFT_EXPIRY_HOURS) {
        localStorage.removeItem(CARDIO_DRAFT_KEY);
        return null;
      }
      
      return draft;
    } catch {
      return null;
    }
  }, [user]);

  // Discard draft
  const discardDraft = useCallback(() => {
    localStorage.removeItem(CARDIO_DRAFT_KEY);
    setHasDraft(false);
  }, []);

  // Resume draft
  const resumeDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      setActivityType(draft.activityType);
      setDurationMinutes(draft.durationMinutes);
      setDistanceKm(draft.distanceKm);
      setCaloriesBurned(draft.caloriesBurned);
      setNotes(draft.notes);
      setShowForm(true);
      setShowDraftDialog(false);
    }
  }, [loadDraft]);

  useEffect(() => {
    if (user) {
      fetchData();
      
      const draft = loadDraft();
      if (draft) {
        setHasDraft(true);
        setShowDraftDialog(true);
      }
    }
  }, [user, loadDraft]);

  // Auto-save draft when form changes
  useEffect(() => {
    if (showForm && (activityType || durationMinutes)) {
      saveDraft();
    }
  }, [showForm, activityType, durationMinutes, distanceKm, caloriesBurned, notes, saveDraft]);

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
      
      if (data && data.length > 0) {
        const logIds = data.map(log => log.id);
        const { data: routes } = await supabase
          .from('cardio_routes')
          .select('cardio_log_id')
          .in('cardio_log_id', logIds);
        
        if (routes) {
          setLogsWithRoutes(new Set(routes.map(r => r.cardio_log_id)));
        }
      }
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

      setCardioShareData({
        activityType: getActivityLabel(activityType),
        duration: parseInt(durationMinutes),
        distance: distanceKm ? parseFloat(distanceKm) : undefined,
        calories: caloriesBurned ? parseInt(caloriesBurned) : undefined
      });

      toast.success(`Konditionspass loggat! +${xpEarned} XP`);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      
      resetForm();
      fetchLogs();

      setTimeout(() => {
        setShowShareDialog(true);
      }, 1000);
    } catch (error) {
      console.error('Error saving cardio log:', error);
      toast.error('Kunde inte spara passet');
    } finally {
      setIsSaving(false);
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
    discardDraft();
  };

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

  const totalMinutes = logs.reduce((sum, log) => sum + log.duration_minutes, 0);
  const totalDistance = logs.reduce((sum, log) => sum + (log.distance_km || 0), 0);
  const totalCalories = logs.reduce((sum, log) => sum + (log.calories_burned || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {cardioShareData && (
        <ShareToInstagramDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          cardioData={cardioShareData}
        />
      )}

      {selectedLogId && (
        <RouteMapDialog
          open={showRouteMap}
          onOpenChange={setShowRouteMap}
          cardioLogId={selectedLogId}
          activityLabel={selectedLogLabel}
        />
      )}

      {/* Draft Resume Card */}
      {hasDraft && !showForm && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-transparent mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Timer className="w-4 h-4 text-primary" />
                <span>Du har ett påbörjat konditionspass</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="default" size="sm" onClick={resumeDraft}>
                  <Play className="w-4 h-4 mr-1" />
                  Fortsätt
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
            </div>
          </CardContent>
        </Card>
      )}

      <AdBanner className="mb-6" />

      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Konditionsträning</h1>
          <p className="text-muted-foreground text-sm">Spåra löpning, cykling och mer</p>
        </div>
        <div className="relative">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="shrink-0">
                <Target className="w-4 h-4 mr-2" />
                Mål
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
            <Button variant="hero" size="sm" onClick={() => setShowForm(true)} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Starta pass
            </Button>
          </div>
          <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
        </div>
      </div>

      {user && (
        <QuickStartCardio 
          userId={user.id} 
          onSessionComplete={fetchLogs}
        />
      )}

      {/* Tabata Section */}
      <div className="mb-8">
        <TabataWorkout />
      </div>

      <div className="mb-8">
        <ActiveCardioPlanSession 
          onLogSession={(session) => {
            setActivityType(session.activity === 'Löpning' ? 'running' 
              : session.activity === 'Cykling' ? 'cycling'
              : session.activity === 'Simning' ? 'swimming'
              : session.activity === 'Promenad' ? 'walking'
              : 'other');
            setDurationMinutes(session.duration.toString());
            if (session.distance) {
              setDistanceKm(session.distance.toString());
            }
            setShowForm(true);
          }}
        />
      </div>

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
                        <div className="flex items-center gap-2 md:gap-6">
                          <div className="text-right">
                            <p className="font-semibold">{log.duration_minutes} min</p>
                            {log.distance_km && (
                              <p className="text-sm text-muted-foreground">{log.distance_km} km</p>
                            )}
                          </div>
                          {logsWithRoutes.has(log.id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedLogId(log.id);
                                setSelectedLogLabel(getActivityLabel(log.activity_type));
                                setShowRouteMap(true);
                              }}
                            >
                              <Map className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardioShareData({
                                activityType: getActivityLabel(log.activity_type),
                                duration: log.duration_minutes,
                                distance: log.distance_km || undefined,
                                calories: log.calories_burned || undefined
                              });
                              setShowShareDialog(true);
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(log.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Draft Resume Dialog */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-primary" />
              Fortsätt konditionspass?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Du har ett påbörjat konditionspass sparat. Vill du fortsätta där du slutade?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                discardDraft();
                setShowDraftDialog(false);
                toast.success('Utkast borttaget');
              }}
            >
              Kasta
            </Button>
            <Button onClick={resumeDraft}>
              <Play className="w-4 h-4 mr-1" />
              Fortsätt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete draft confirmation dialog */}
      <AlertDialog open={showDeleteDraftDialog} onOpenChange={setShowDeleteDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort utkast?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort det påbörjade konditionspasset? Detta kan inte ångras.
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
