import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp, Dumbbell } from "lucide-react";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

interface ExerciseDataPoint {
  date: string;
  weight: number;
  reps: number;
}

export const StrengthProgressChart = () => {
  const [selectedExercise, setSelectedExercise] = useState<string>("");

  const { data: exercises } = useQuery({
    queryKey: ["unique-exercises"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("exercise_logs")
        .select("exercise_name, workout_log_id")
        .order("exercise_name");

      if (error) throw error;

      // Get unique exercise names
      const uniqueExercises = [...new Set(data?.map(e => e.exercise_name) || [])];
      return uniqueExercises;
    },
  });

  const { data: progressData } = useQuery({
    queryKey: ["exercise-progress", selectedExercise],
    queryFn: async () => {
      if (!selectedExercise) return [];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("exercise_logs")
        .select(`
          weight_kg,
          reps_completed,
          created_at,
          workout_log_id,
          workout_logs!inner(user_id, completed_at)
        `)
        .eq("exercise_name", selectedExercise)
        .eq("workout_logs.user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Process data to get max weight per session
      const sessionMap = new Map<string, ExerciseDataPoint>();
      
      data?.forEach((log) => {
        const workout = log.workout_logs as unknown as { completed_at: string };
        const dateKey = format(parseISO(workout.completed_at), "yyyy-MM-dd");
        const weight = Number(log.weight_kg) || 0;
        const reps = parseInt(log.reps_completed?.split(",")[0] || "0") || 0;

        const existing = sessionMap.get(dateKey);
        if (!existing || weight > existing.weight) {
          sessionMap.set(dateKey, { date: dateKey, weight, reps });
        }
      });

      return Array.from(sessionMap.values()).slice(-12); // Last 12 sessions
    },
    enabled: !!selectedExercise,
  });

  const chartConfig = {
    weight: {
      label: "Vikt (kg)",
      color: "hsl(var(--primary))",
    },
  };

  const improvement = useMemo(() => {
    if (!progressData || progressData.length < 2) return null;
    const first = progressData[0].weight;
    const last = progressData[progressData.length - 1].weight;
    if (first === 0) return null;
    return ((last - first) / first * 100).toFixed(1);
  }, [progressData]);

  if (!exercises?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Styrkeprogression
          </CardTitle>
          {improvement && Number(improvement) > 0 && (
            <span className="text-xs text-green-600 font-medium">
              +{improvement}%
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedExercise} onValueChange={setSelectedExercise}>
          <SelectTrigger>
            <SelectValue placeholder="Välj övning..." />
          </SelectTrigger>
          <SelectContent>
            {exercises?.map((exercise) => (
              <SelectItem key={exercise} value={exercise}>
                {exercise}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedExercise && progressData && progressData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(parseISO(value), "d MMM", { locale: sv })}
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => `${value}kg`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => format(parseISO(value as string), "d MMMM yyyy", { locale: sv })}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : selectedExercise ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            Ingen data för denna övning
          </div>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
            <Dumbbell className="h-8 w-8 opacity-50" />
            <span>Välj en övning för att se progression</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
