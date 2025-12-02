import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Clock, MapPin, Zap, Heart, Play, ChevronRight } from 'lucide-react';
import { format, differenceInWeeks } from 'date-fns';
import { sv } from 'date-fns/locale';

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

interface Props {
  onLogSession?: (session: CardioPlanSession) => void;
}

export default function ActiveCardioPlanSession({ onLogSession }: Props) {
  const { user } = useAuth();
  const [activePlan, setActivePlan] = useState<SavedCardioPlan | null>(null);
  const [todaySession, setTodaySession] = useState<CardioPlanSession | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
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

        // Find today's session
        const today = new Date();
        const todayDayNum = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        
        const currentWeekData = plan.plan_data.weeks.find(w => w.weekNumber === currentWeekNum);
        if (currentWeekData) {
          const session = currentWeekData.sessions.find(s => {
            const sessionDayNum = dayMap[s.day.toLowerCase()];
            return sessionDayNum === todayDayNum;
          });
          setTodaySession(session || null);
        }
      }
    } catch (error) {
      console.error('Error fetching active plan:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!activePlan) {
    return null;
  }

  const todayFormatted = format(new Date(), 'EEEE d MMMM', { locale: sv });

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Dagens träning</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            Vecka {currentWeek} av {activePlan.total_weeks}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground capitalize">{todayFormatted}</p>
      </CardHeader>
      <CardContent>
        {todaySession ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{todaySession.type}</h3>
                <p className="text-sm text-muted-foreground">{todaySession.activity}</p>
              </div>
              <Badge className={getIntensityColor(todaySession.intensity)}>
                {todaySession.intensity}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{todaySession.duration} min</span>
              </div>
              {todaySession.distance && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{todaySession.distance} km</span>
                </div>
              )}
              {todaySession.heartRateZone && (
                <div className="flex items-center gap-2 text-sm">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                  <span>Zon {todaySession.heartRateZone}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {todaySession.description}
            </p>

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
        ) : (
          <div className="text-center py-4">
            <Zap className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Ingen planerad träning idag</p>
            <p className="text-sm text-muted-foreground mt-1">
              Enligt planen "{activePlan.name}" är detta en vilodag.
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Aktiv plan: <span className="font-medium">{activePlan.name}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
