import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dumbbell, Footprints, Timer, Calendar, ChevronRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: 'workout' | 'cardio' | 'wod';
  title: string;
  subtitle: string;
  date: Date;
  duration?: number;
  distance?: number;
}

export default function RecentActivity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecentActivity();
    }
  }, [user]);

  const fetchRecentActivity = async () => {
    if (!user) return;

    try {
      // Fetch workouts, cardio, and WODs in parallel
      const [workoutsRes, cardioRes, wodsRes] = await Promise.all([
        supabase
          .from('workout_logs')
          .select('id, program_id, workout_day, duration_minutes, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(5),
        supabase
          .from('cardio_logs')
          .select('id, activity_type, duration_minutes, distance_km, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(5),
        supabase
          .from('wod_logs')
          .select('id, wod_name, wod_format, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(5)
      ]);

      const items: ActivityItem[] = [];

      // Process workouts
      if (workoutsRes.data) {
        workoutsRes.data.forEach(w => {
          items.push({
            id: w.id,
            type: 'workout',
            title: w.workout_day || 'Styrketräning',
            subtitle: 'Träningspass',
            date: new Date(w.completed_at),
            duration: w.duration_minutes
          });
        });
      }

      // Process cardio
      if (cardioRes.data) {
        cardioRes.data.forEach(c => {
          items.push({
            id: c.id,
            type: 'cardio',
            title: c.activity_type,
            subtitle: c.distance_km ? `${c.distance_km} km` : `${c.duration_minutes} min`,
            date: new Date(c.completed_at),
            duration: c.duration_minutes,
            distance: c.distance_km
          });
        });
      }

      // Process WODs
      if (wodsRes.data) {
        wodsRes.data.forEach(w => {
          items.push({
            id: w.id,
            type: 'wod',
            title: w.wod_name,
            subtitle: w.wod_format,
            date: new Date(w.completed_at)
          });
        });
      }

      // Sort by date and take top 5
      items.sort((a, b) => b.date.getTime() - a.date.getTime());
      setActivities(items.slice(0, 5));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'workout':
        return <Dumbbell className="w-4 h-4" />;
      case 'cardio':
        return <Footprints className="w-4 h-4" />;
      case 'wod':
        return <Timer className="w-4 h-4" />;
    }
  };

  const getIconBg = (type: ActivityItem['type']) => {
    switch (type) {
      case 'workout':
        return 'bg-blue-500/10 text-blue-500';
      case 'cardio':
        return 'bg-green-500/10 text-green-500';
      case 'wod':
        return 'bg-purple-500/10 text-purple-500';
    }
  };

  const handleClick = (activity: ActivityItem) => {
    if (activity.type === 'workout') {
      navigate('/training?tab=log');
    } else if (activity.type === 'cardio') {
      navigate('/training?tab=cardio');
    } else {
      navigate('/training?tab=crossfit');
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Senaste aktivitet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.map(activity => (
          <div
            key={`${activity.type}-${activity.id}`}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
            onClick={() => handleClick(activity)}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getIconBg(activity.type)}`}>
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{activity.title}</p>
              <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs hidden sm:flex">
                {formatDistanceToNow(activity.date, { addSuffix: true, locale: sv })}
              </Badge>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
