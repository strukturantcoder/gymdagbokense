import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, Timer, Flame, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfWeek, endOfWeek } from "date-fns";

interface WeeklyStats {
  workoutCount: number;
  cardioCount: number;
  wodCount: number;
  totalMinutes: number;
}

export function WeeklySummary() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchWeeklyStats = async () => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();

      const [workoutRes, cardioRes, wodRes, garminCardioRes] = await Promise.all([
        supabase
          .from("workout_logs")
          .select("duration_minutes")
          .eq("user_id", user.id)
          .gte("completed_at", weekStart)
          .lte("completed_at", weekEnd),
        supabase
          .from("cardio_logs")
          .select("duration_minutes")
          .eq("user_id", user.id)
          .gte("completed_at", weekStart)
          .lte("completed_at", weekEnd),
        supabase
          .from("wod_logs")
          .select("id")
          .eq("user_id", user.id)
          .gte("completed_at", weekStart)
          .lte("completed_at", weekEnd),
        // Garmin cardio not synced to cardio_logs
        supabase
          .from("garmin_activities")
          .select("duration_seconds")
          .eq("user_id", user.id)
          .neq("activity_type", "strength")
          .is("synced_to_cardio_log_id", null)
          .gte("start_time", weekStart)
          .lte("start_time", weekEnd),
      ]);

      const workoutMinutes = workoutRes.data?.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) || 0;
      const cardioMinutes = cardioRes.data?.reduce((sum, c) => sum + (c.duration_minutes || 0), 0) || 0;
      const garminCardioMinutes = garminCardioRes.data?.reduce((sum, g) => sum + Math.round((g.duration_seconds || 0) / 60), 0) || 0;

      setStats({
        workoutCount: workoutRes.data?.length || 0,
        cardioCount: (cardioRes.data?.length || 0) + (garminCardioRes.data?.length || 0),
        wodCount: wodRes.data?.length || 0,
        totalMinutes: workoutMinutes + cardioMinutes + garminCardioMinutes,
      });
      setLoading(false);
    };

    fetchWeeklyStats();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSessions = (stats?.workoutCount || 0) + (stats?.cardioCount || 0) + (stats?.wodCount || 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Denna vecka
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-primary/10">
              <Dumbbell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSessions}</p>
              <p className="text-xs text-muted-foreground">Träningspass</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-orange-500/10">
              <Timer className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalMinutes || 0}</p>
              <p className="text-xs text-muted-foreground">Minuter</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-blue-500/10">
              <Dumbbell className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.workoutCount || 0}</p>
              <p className="text-xs text-muted-foreground">Styrka</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-green-500/10">
              <Flame className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(stats?.cardioCount || 0) + (stats?.wodCount || 0)}</p>
              <p className="text-xs text-muted-foreground">Kondition/WOD</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
