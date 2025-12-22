import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Dumbbell, Footprints, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, addDays, isSameDay, isToday, isBefore } from "date-fns";
import { sv } from "date-fns/locale";

interface DayActivity {
  date: Date;
  hasWorkout: boolean;
  hasCardio: boolean;
  workoutName?: string;
  cardioType?: string;
}

export default function WeeklyCalendar() {
  const { user } = useAuth();
  const [weekDays, setWeekDays] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWeekData();
    }
  }, [user]);

  const fetchWeekData = async () => {
    if (!user) return;

    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const days: DayActivity[] = [];

      for (let i = 0; i < 7; i++) {
        days.push({
          date: addDays(weekStart, i),
          hasWorkout: false,
          hasCardio: false,
        });
      }

      // Fetch workouts for the week
      const { data: workouts } = await supabase
        .from("workout_logs")
        .select("completed_at, workout_day")
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", addDays(weekStart, 7).toISOString());

      // Fetch cardio for the week
      const { data: cardio } = await supabase
        .from("cardio_logs")
        .select("completed_at, activity_type")
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", addDays(weekStart, 7).toISOString());

      // Map activities to days
      workouts?.forEach((w) => {
        const activityDate = new Date(w.completed_at);
        const dayIndex = days.findIndex((d) => isSameDay(d.date, activityDate));
        if (dayIndex !== -1) {
          days[dayIndex].hasWorkout = true;
          days[dayIndex].workoutName = w.workout_day;
        }
      });

      cardio?.forEach((c) => {
        const activityDate = new Date(c.completed_at);
        const dayIndex = days.findIndex((d) => isSameDay(d.date, activityDate));
        if (dayIndex !== -1) {
          days[dayIndex].hasCardio = true;
          days[dayIndex].cardioType = c.activity_type;
        }
      });

      setWeekDays(days);
    } catch (error) {
      console.error("Error fetching week data:", error);
    } finally {
      setLoading(false);
    }
  };

  const activityTypeLabels: Record<string, string> = {
    running: "Löpning",
    walking: "Promenad",
    cycling: "Cykling",
    swimming: "Simning",
    golf: "Golf",
    other: "Kondition",
  };

  const dayNames = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
    >
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-primary" />
            Veckans träning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, index) => {
              const isPast = isBefore(day.date, new Date()) && !isToday(day.date);
              const hasActivity = day.hasWorkout || day.hasCardio;
              const today = isToday(day.date);

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                    today
                      ? "bg-primary/20 ring-2 ring-primary"
                      : hasActivity
                      ? "bg-green-500/10"
                      : isPast
                      ? "bg-secondary/30 opacity-60"
                      : "bg-secondary/50"
                  }`}
                >
                  <span
                    className={`text-xs font-medium mb-1 ${
                      today ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {dayNames[index]}
                  </span>
                  <span
                    className={`text-sm font-bold mb-2 ${
                      today ? "text-primary" : ""
                    }`}
                  >
                    {format(day.date, "d")}
                  </span>
                  
                  <div className="flex flex-col gap-1 min-h-[24px]">
                    {day.hasWorkout && (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <Dumbbell className="w-3 h-3 text-primary" />
                      </div>
                    )}
                    {day.hasCardio && (
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Footprints className="w-3 h-3 text-green-500" />
                      </div>
                    )}
                    {!hasActivity && isPast && (
                      <div className="w-6 h-6 rounded-full bg-secondary/50 flex items-center justify-center">
                        <span className="text-muted-foreground/50 text-xs">-</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Dumbbell className="w-2 h-2 text-primary" />
              </div>
              <span>Styrka</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <Footprints className="w-2 h-2 text-green-500" />
              </div>
              <span>Kondition</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
