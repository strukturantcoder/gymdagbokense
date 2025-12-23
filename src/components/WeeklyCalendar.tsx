import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Dumbbell, Footprints, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfWeek, addDays, isSameDay, isToday, isBefore, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import ScheduleWorkoutDialog from "./ScheduleWorkoutDialog";

interface ScheduledWorkout {
  id: string;
  title: string;
  workout_type: string;
  description: string | null;
  duration_minutes: number | null;
  reminder_enabled: boolean;
  reminder_minutes_before: number | null;
  workout_program_id: string | null;
  workout_day_name: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  completed_at: string | null;
}

interface DayActivity {
  date: Date;
  hasWorkout: boolean;
  hasCardio: boolean;
  scheduledWorkouts: ScheduledWorkout[];
  completedWorkouts: number;
  completedCardio: number;
}

export default function WeeklyCalendar() {
  const { user } = useAuth();
  const [weekDays, setWeekDays] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWeekData();
    }
  }, [user]);

  const fetchWeekData = async () => {
    if (!user) return;

    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = addDays(weekStart, 7);
      const days: DayActivity[] = [];

      for (let i = 0; i < 7; i++) {
        days.push({
          date: addDays(weekStart, i),
          hasWorkout: false,
          hasCardio: false,
          scheduledWorkouts: [],
          completedWorkouts: 0,
          completedCardio: 0,
        });
      }

      // Fetch scheduled workouts for the week
      const { data: scheduled } = await supabase
        .from("scheduled_workouts")
        .select("*")
        .eq("user_id", user.id)
        .gte("scheduled_date", format(weekStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"));

      // Fetch completed workouts for the week
      const { data: workouts } = await supabase
        .from("workout_logs")
        .select("completed_at")
        .eq("user_id", user.id)
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString());

      // Fetch completed cardio for the week
      const { data: cardio } = await supabase
        .from("cardio_logs")
        .select("completed_at")
        .eq("user_id", user.id)
        .gte("completed_at", weekStart.toISOString())
        .lte("completed_at", weekEnd.toISOString());

      // Map scheduled workouts to days
      scheduled?.forEach((s) => {
        const scheduledDate = parseISO(s.scheduled_date);
        const dayIndex = days.findIndex((d) => isSameDay(d.date, scheduledDate));
        if (dayIndex !== -1) {
          days[dayIndex].scheduledWorkouts.push(s as ScheduledWorkout);
          if (s.workout_type === "cardio") {
            days[dayIndex].hasCardio = true;
          } else {
            days[dayIndex].hasWorkout = true;
          }
        }
      });

      // Count completed workouts per day
      workouts?.forEach((w) => {
        const activityDate = new Date(w.completed_at);
        const dayIndex = days.findIndex((d) => isSameDay(d.date, activityDate));
        if (dayIndex !== -1) {
          days[dayIndex].completedWorkouts++;
        }
      });

      // Count completed cardio per day
      cardio?.forEach((c) => {
        const activityDate = new Date(c.completed_at);
        const dayIndex = days.findIndex((d) => isSameDay(d.date, activityDate));
        if (dayIndex !== -1) {
          days[dayIndex].completedCardio++;
        }
      });

      setWeekDays(days);
    } catch (error) {
      console.error("Error fetching week data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const dayNames = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

  const getSelectedDayWorkouts = (): ScheduledWorkout[] => {
    if (!selectedDate) return [];
    const day = weekDays.find((d) => isSameDay(d.date, selectedDate));
    return day?.scheduledWorkouts || [];
  };

  return (
    <>
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
                const hasScheduled = day.scheduledWorkouts.length > 0;
                const hasCompleted = day.completedWorkouts > 0 || day.completedCardio > 0;
                const today = isToday(day.date);
                const scheduledCount = day.scheduledWorkouts.length;

                return (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleDayClick(day.date)}
                    className={`flex flex-col items-center p-2 rounded-lg transition-all cursor-pointer hover:ring-2 hover:ring-primary/50 ${
                      today
                        ? "bg-primary/20 ring-2 ring-primary"
                        : hasScheduled || hasCompleted
                        ? "bg-green-500/10"
                        : isPast
                        ? "bg-secondary/30 opacity-60"
                        : "bg-secondary/50 hover:bg-secondary/70"
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
                      {/* Show scheduled/completed indicators */}
                      {(day.hasWorkout || day.completedWorkouts > 0) && (
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center relative">
                          <Dumbbell className="w-3 h-3 text-primary" />
                          {day.completedWorkouts > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                      )}
                      {(day.hasCardio || day.completedCardio > 0) && (
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center relative">
                          <Footprints className="w-3 h-3 text-green-500" />
                          {day.completedCardio > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                      )}
                      {!hasScheduled && !hasCompleted && (
                        <div className="w-6 h-6 rounded-full bg-secondary/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        </div>
                      )}
                      {/* Show count badge if multiple */}
                      {scheduledCount > 1 && (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          +{scheduledCount - 1}
                        </span>
                      )}
                    </div>
                  </motion.button>
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
              <div className="flex items-center gap-1 text-muted-foreground/70">
                <span className="text-green-500">✓</span>
                <span>Avklarat</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {selectedDate && (
        <ScheduleWorkoutDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          selectedDate={selectedDate}
          existingWorkouts={getSelectedDayWorkouts()}
          onWorkoutsChange={fetchWeekData}
        />
      )}
    </>
  );
}
