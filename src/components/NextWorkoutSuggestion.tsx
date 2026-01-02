import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Play, Calendar, Dumbbell, Clock, ChevronRight } from 'lucide-react';
import { format, isToday, isTomorrow, addDays } from 'date-fns';
import { sv } from 'date-fns/locale';

interface ScheduledWorkout {
  id: string;
  title: string;
  scheduled_date: string;
  scheduled_time: string | null;
  workout_type: string;
  workout_program_id: string | null;
  workout_day_name: string | null;
}

interface NextWorkoutData {
  type: 'scheduled' | 'program';
  title: string;
  subtitle: string;
  date?: Date;
  programId?: string;
  dayIndex?: number;
}

export default function NextWorkoutSuggestion() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nextWorkout, setNextWorkout] = useState<NextWorkoutData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNextWorkout();
    }
  }, [user]);

  const fetchNextWorkout = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check for scheduled workouts first
      const { data: scheduledWorkouts } = await supabase
        .from('scheduled_workouts')
        .select('id, title, scheduled_date, scheduled_time, workout_type, workout_program_id, workout_day_name')
        .eq('user_id', user.id)
        .gte('scheduled_date', today.toISOString().split('T')[0])
        .is('completed_at', null)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true })
        .limit(1);

      if (scheduledWorkouts && scheduledWorkouts.length > 0) {
        const scheduled = scheduledWorkouts[0];
        setNextWorkout({
          type: 'scheduled',
          title: scheduled.title,
          subtitle: scheduled.workout_day_name || scheduled.workout_type,
          date: new Date(scheduled.scheduled_date),
          programId: scheduled.workout_program_id || undefined
        });
        setLoading(false);
        return;
      }

      // If no scheduled workout, suggest next workout from active program
      const { data: programs } = await supabase
        .from('workout_programs')
        .select('id, name, program_data')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (programs && programs.length > 0) {
        const program = programs[0];
        const programData = program.program_data as { days?: { day: string; focus: string }[] };
        
        if (programData.days && programData.days.length > 0) {
          // Get the last completed workout to suggest the next one
          const { data: lastWorkout } = await supabase
            .from('workout_logs')
            .select('workout_day')
            .eq('user_id', user.id)
            .eq('program_id', program.id)
            .order('completed_at', { ascending: false })
            .limit(1);

          let nextDayIndex = 0;
          if (lastWorkout && lastWorkout.length > 0) {
            const lastDayName = lastWorkout[0].workout_day;
            const lastIndex = programData.days.findIndex(d => d.day === lastDayName);
            nextDayIndex = (lastIndex + 1) % programData.days.length;
          }

          const nextDay = programData.days[nextDayIndex];
          setNextWorkout({
            type: 'program',
            title: nextDay.day,
            subtitle: `${program.name} • ${nextDay.focus}`,
            programId: program.id,
            dayIndex: nextDayIndex
          });
        }
      }
    } catch (error) {
      console.error('Error fetching next workout:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    if (isToday(date)) return 'Idag';
    if (isTomorrow(date)) return 'Imorgon';
    return format(date, 'EEEE d MMMM', { locale: sv });
  };

  const handleStartWorkout = () => {
    if (nextWorkout?.programId) {
      navigate(`/workout-session?programId=${nextWorkout.programId}${nextWorkout.dayIndex !== undefined ? `&dayIndex=${nextWorkout.dayIndex}` : ''}`);
    } else {
      navigate('/training');
    }
  };

  if (loading) {
    return (
      <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="flex-1">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="w-24 h-9" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!nextWorkout) {
    return (
      <Card className="mb-6 border-dashed">
        <CardContent className="py-6 text-center">
          <Dumbbell className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">Inget planerat träningspass</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            Skapa ett program
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground flex-shrink-0">
            <Play className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold truncate">{nextWorkout.title}</h3>
              {nextWorkout.date && (
                <span className="text-xs text-primary font-medium flex-shrink-0">
                  {formatDate(nextWorkout.date)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{nextWorkout.subtitle}</p>
          </div>
          <Button 
            onClick={handleStartWorkout}
            className="flex-shrink-0"
            size="sm"
          >
            Starta
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
