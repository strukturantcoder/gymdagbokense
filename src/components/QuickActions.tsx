import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Footprints, Flame, Clock, Trophy, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, endOfWeek, differenceInDays, subDays, isAfter } from "date-fns";
import { sv } from "date-fns/locale";

interface RecentActivity {
  type: "workout" | "cardio";
  name: string;
  date: string;
  duration?: number;
}

interface WeeklyStats {
  workouts: number;
  cardioSessions: number;
  totalMinutes: number;
  streak: number;
}

export default function QuickActions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recentActivity, setRecentActivity] = useState<RecentActivity | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    workouts: 0,
    cardioSessions: 0,
    totalMinutes: 0,
    streak: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Fetch weekly workouts
      const { data: workouts } = await supabase
        .from("workout_logs")
        .select("completed_at, duration_minutes, workout_day")
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString())
        .order("completed_at", { ascending: false });

      // Fetch weekly cardio
      const { data: cardio } = await supabase
        .from("cardio_logs")
        .select("completed_at, duration_minutes, activity_type")
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString())
        .order("completed_at", { ascending: false });

      // Calculate weekly stats
      const workoutMinutes = workouts?.reduce((sum, w) => sum + (w.duration_minutes || 0), 0) || 0;
      const cardioMinutes = cardio?.reduce((sum, c) => sum + (c.duration_minutes || 0), 0) || 0;

      // Get most recent activity
      let recent: RecentActivity | null = null;
      const latestWorkout = workouts?.[0];
      const latestCardio = cardio?.[0];

      if (latestWorkout && latestCardio) {
        if (new Date(latestWorkout.completed_at) > new Date(latestCardio.completed_at)) {
          recent = {
            type: "workout",
            name: latestWorkout.workout_day,
            date: latestWorkout.completed_at,
            duration: latestWorkout.duration_minutes,
          };
        } else {
          recent = {
            type: "cardio",
            name: latestCardio.activity_type,
            date: latestCardio.completed_at,
            duration: latestCardio.duration_minutes,
          };
        }
      } else if (latestWorkout) {
        recent = {
          type: "workout",
          name: latestWorkout.workout_day,
          date: latestWorkout.completed_at,
          duration: latestWorkout.duration_minutes,
        };
      } else if (latestCardio) {
        recent = {
          type: "cardio",
          name: latestCardio.activity_type,
          date: latestCardio.completed_at,
          duration: latestCardio.duration_minutes,
        };
      }

      // Calculate streak
      const streak = await calculateStreak();

      setWeeklyStats({
        workouts: workouts?.length || 0,
        cardioSessions: cardio?.length || 0,
        totalMinutes: workoutMinutes + cardioMinutes,
        streak,
      });
      setRecentActivity(recent);
    } catch (error) {
      console.error("Error fetching quick actions data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = async (): Promise<number> => {
    if (!user) return 0;

    // Get all workout and cardio logs from last 60 days
    const sixtyDaysAgo = subDays(new Date(), 60);

    const [{ data: workouts }, { data: cardio }] = await Promise.all([
      supabase
        .from("workout_logs")
        .select("completed_at")
        .gte("completed_at", sixtyDaysAgo.toISOString())
        .order("completed_at", { ascending: false }),
      supabase
        .from("cardio_logs")
        .select("completed_at")
        .gte("completed_at", sixtyDaysAgo.toISOString())
        .order("completed_at", { ascending: false }),
    ]);

    // Get unique dates with activity
    const activityDates = new Set<string>();
    workouts?.forEach((w) => activityDates.add(format(new Date(w.completed_at), "yyyy-MM-dd")));
    cardio?.forEach((c) => activityDates.add(format(new Date(c.completed_at), "yyyy-MM-dd")));

    // Calculate consecutive days from today/yesterday
    let streak = 0;
    let checkDate = new Date();
    const today = format(checkDate, "yyyy-MM-dd");
    const yesterday = format(subDays(checkDate, 1), "yyyy-MM-dd");

    // Start from today or yesterday
    if (!activityDates.has(today) && !activityDates.has(yesterday)) {
      return 0;
    }

    if (!activityDates.has(today)) {
      checkDate = subDays(checkDate, 1);
    }

    while (activityDates.has(format(checkDate, "yyyy-MM-dd"))) {
      streak++;
      checkDate = subDays(checkDate, 1);
    }

    return streak;
  };

  const activityTypeLabels: Record<string, string> = {
    running: "Löpning",
    walking: "Promenad",
    cycling: "Cykling",
    swimming: "Simning",
    golf: "Golf",
    other: "Kondition",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 space-y-4"
    >
      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="hero"
          size="lg"
          className="h-16 text-lg"
          onClick={() => navigate("/training")}
        >
          <Dumbbell className="w-5 h-5 mr-2" />
          Starta styrkepass
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-16 text-lg border-gym-orange/50 hover:bg-gym-orange/10"
          onClick={() => navigate("/training?tab=cardio")}
        >
          <Footprints className="w-5 h-5 mr-2" />
          Starta konditionspass
        </Button>
      </div>

      {/* Weekly Stats & Streak */}
      <Card className="bg-gradient-to-br from-card to-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="space-y-1">
              <div className="flex items-center justify-center">
                <Flame className="w-5 h-5 text-gym-orange" />
              </div>
              <p className="text-2xl font-bold">{weeklyStats.streak}</p>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold">{weeklyStats.workouts}</p>
              <p className="text-xs text-muted-foreground">Styrka</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center">
                <Footprints className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{weeklyStats.cardioSessions}</p>
              <p className="text-xs text-muted-foreground">Kondition</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{weeklyStats.totalMinutes}</p>
              <p className="text-xs text-muted-foreground">Minuter</p>
            </div>
          </div>

          {/* Weekly progress bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Veckans aktivitet</span>
              <span>{weeklyStats.workouts + weeklyStats.cardioSessions} pass</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((weeklyStats.workouts + weeklyStats.cardioSessions) / 5) * 100, 100)}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="h-full bg-gradient-to-r from-gym-orange to-amber-500 rounded-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {recentActivity && (
        <Card className="bg-secondary/30">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  recentActivity.type === "workout" 
                    ? "bg-primary/10" 
                    : "bg-green-500/10"
                }`}>
                  {recentActivity.type === "workout" ? (
                    <Dumbbell className="w-5 h-5 text-primary" />
                  ) : (
                    <Footprints className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {recentActivity.type === "workout" 
                      ? recentActivity.name 
                      : activityTypeLabels[recentActivity.name] || recentActivity.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(recentActivity.date), "EEEE d MMM", { locale: sv })}
                    {recentActivity.duration && ` • ${recentActivity.duration} min`}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                Senaste pass
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
