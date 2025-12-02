import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock, MapPin, Zap, Heart, Play, Check, Circle } from 'lucide-react';
import { format, differenceInWeeks } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

interface CardioPlanSession {
  day: string;
  type: string;
  activity: string;
  duration: number;
  distance?: number;
  intensity: string;
  description: string;
  heartRateZone?: string;
}

interface CardioPlanWeek {
  weekNumber: number;
  theme: string;
  totalDistance?: number;
  sessions: CardioPlanSession[];
}

interface CardioPlan {
  name: string;
  description: string;
  totalWeeks: number;
  goalSummary: string;
  tips: string[];
  weeks: CardioPlanWeek[];
}

interface SavedCardioPlan {
  id: string;
  name: string;
  description: string | null;
  goal_type: string;
  target_value: string | null;
  total_weeks: number;
  plan_data: CardioPlan;
  created_at: string;
  is_active: boolean;
}

interface CompletedSession {
  id: string;
  week_number: number;
  session_day: string;
  completed_at: string;
}

const getIntensityColor = (intensity: string) => {
  switch (intensity.toLowerCase()) {
    case 'låg': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'medel': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'hög': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

const dayMap: Record<string, number> = {
  'måndag': 1,
  'tisdag': 2,
  'onsdag': 3,
  'torsdag': 4,
  'fredag': 5,
  'lördag': 6,
  'söndag': 0,
};

const dayOrder = ['måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag', 'söndag'];

interface Props {
  onLogSession?: (session: CardioPlanSession) => void;
}

export default function ActiveCardioPlanSession({ onLogSession }: Props) {
  const { user } = useAuth();
  const [activePlan, setActivePlan] = useState<SavedCardioPlan | null>(null);
  const [todaySession, setTodaySession] = useState<CardioPlanSession | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [currentWeekSessions, setCurrentWeekSessions] = useState<CardioPlanSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchActivePlan();
    }
  }, [user]);

  const fetchActivePlan = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cardio_plans')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const plan = {
          ...data,
          plan_data: data.plan_data as unknown as CardioPlan
        } as SavedCardioPlan;
        setActivePlan(plan);
        
        // Calculate current week based on plan creation date
        const createdAt = new Date(plan.created_at);
        const now = new Date();
        const weeksSinceCreation = differenceInWeeks(now, createdAt) + 1;
        const currentWeekNum = Math.min(weeksSinceCreation, plan.total_weeks);
        setCurrentWeek(currentWeekNum);

        // Find today's session and all week sessions
        const today = new Date();
        const todayDayNum = today.getDay();
        
        const currentWeekData = plan.plan_data.weeks.find(w => w.weekNumber === currentWeekNum);
        if (currentWeekData) {
          setCurrentWeekSessions(currentWeekData.sessions);
          const session = currentWeekData.sessions.find(s => {
            const sessionDayNum = dayMap[s.day.toLowerCase()];
            return sessionDayNum === todayDayNum;
          });
          setTodaySession(session || null);
        }

        // Fetch completed sessions for this plan and week
        await fetchCompletedSessions(plan.id, currentWeekNum);
      }
    } catch (error) {
      console.error('Error fetching active plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedSessions = async (planId: string, weekNum: number) => {
    const { data, error } = await supabase
      .from('cardio_plan_sessions')
      .select('*')
      .eq('plan_id', planId)
      .eq('week_number', weekNum);

    if (!error && data) {
      setCompletedSessions(data);
    }
  };

  const markSessionComplete = async (session: CardioPlanSession) => {
    if (!user || !activePlan) return;

    try {
      const { error } = await supabase
        .from('cardio_plan_sessions')
        .insert({
          user_id: user.id,
          plan_id: activePlan.id,
          week_number: currentWeek,
          session_day: session.day.toLowerCase(),
        });

      if (error) throw error;

      toast.success('Pass markerat som genomfört!');
      await fetchCompletedSessions(activePlan.id, currentWeek);
    } catch (error) {
      console.error('Error marking session complete:', error);
      toast.error('Kunde inte markera passet');
    }
  };

  const unmarkSessionComplete = async (session: CardioPlanSession) => {
    if (!user || !activePlan) return;

    const completed = completedSessions.find(c => c.session_day === session.day.toLowerCase());
    if (!completed) return;

    try {
      const { error } = await supabase
        .from('cardio_plan_sessions')
        .delete()
        .eq('id', completed.id);

      if (error) throw error;

      toast.success('Markering borttagen');
      await fetchCompletedSessions(activePlan.id, currentWeek);
    } catch (error) {
      console.error('Error unmarking session:', error);
      toast.error('Kunde inte ta bort markering');
    }
  };

  const isSessionCompleted = (session: CardioPlanSession) => {
    return completedSessions.some(c => c.session_day === session.day.toLowerCase());
  };

  if (loading) {
    return null;
  }

  if (!activePlan) {
    return null;
  }

  const todayFormatted = format(new Date(), 'EEEE d MMMM', { locale: sv });
  const completedCount = completedSessions.length;
  const totalSessions = currentWeekSessions.length;
  const progressPercent = totalSessions > 0 ? (completedCount / totalSessions) * 100 : 0;

  // Sort sessions by day order
  const sortedSessions = [...currentWeekSessions].sort((a, b) => {
    return dayOrder.indexOf(a.day.toLowerCase()) - dayOrder.indexOf(b.day.toLowerCase());
  });

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Aktiv träningsplan</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            Vecka {currentWeek} av {activePlan.total_weeks}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{activePlan.name}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weekly Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Veckans framsteg</span>
            <span className="font-medium">{completedCount}/{totalSessions} pass</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Weekly Sessions Overview */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Veckans pass</h4>
          <div className="grid gap-2">
            {sortedSessions.map((session, index) => {
              const completed = isSessionCompleted(session);
              const isToday = dayMap[session.day.toLowerCase()] === new Date().getDay();
              return (
                <div 
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    isToday 
                      ? 'border-primary bg-primary/10' 
                      : completed 
                        ? 'border-green-500/30 bg-green-500/10' 
                        : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => completed ? unmarkSessionComplete(session) : markSessionComplete(session)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        completed 
                          ? 'bg-green-500 text-white' 
                          : 'border-2 border-muted-foreground/30 hover:border-primary'
                      }`}
                    >
                      {completed && <Check className="w-4 h-4" />}
                    </button>
                    <div>
                      <p className={`text-sm font-medium capitalize ${completed ? 'line-through text-muted-foreground' : ''}`}>
                        {session.day} - {session.type}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{session.duration} min</span>
                        {session.distance && (
                          <>
                            <MapPin className="w-3 h-3 ml-1" />
                            <span>{session.distance} km</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <Badge variant="outline" className="text-xs border-primary text-primary">
                        Idag
                      </Badge>
                    )}
                    <Badge className={`text-xs ${getIntensityColor(session.intensity)}`}>
                      {session.intensity}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's Session Detail */}
        {todaySession && !isSessionCompleted(todaySession) && (
          <div className="pt-4 border-t border-border space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Dagens pass i detalj
            </h4>
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {todaySession.description}
            </p>
            {todaySession.heartRateZone && (
              <div className="flex items-center gap-2 text-sm">
                <Heart className="w-4 h-4 text-muted-foreground" />
                <span>Pulszon: {todaySession.heartRateZone}</span>
              </div>
            )}
            {onLogSession && (
              <Button 
                variant="hero" 
                className="w-full"
                onClick={() => onLogSession(todaySession)}
              >
                <Play className="w-4 h-4 mr-2" />
                Logga detta pass
              </Button>
            )}
          </div>
        )}

        {todaySession && isSessionCompleted(todaySession) && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-green-500">
              <Check className="w-5 h-5" />
              <span className="font-medium">Dagens pass är genomfört!</span>
            </div>
          </div>
        )}

        {!todaySession && (
          <div className="pt-4 border-t border-border text-center py-2">
            <p className="text-sm text-muted-foreground">
              Ingen planerad träning idag - vilodag 🌙
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
