import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Play, Pause, SkipForward, Check, StretchHorizontal } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface MobilityExercise {
  name: string;
  description: string;
  duration_seconds: number;
  target_area: string;
}

interface Routine {
  routine_name: string;
  exercises: MobilityExercise[];
  total_duration_minutes: number;
}

export default function MobilitySection() {
  const { user } = useAuth();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [generating, setGenerating] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            // Auto-advance
            handleNext();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, activeIndex]);

  const generateRoutine = async () => {
    if (!user) return;
    setGenerating(true);
    try {
      // Fetch recent workouts to determine muscle groups
      const { data: recentLogs } = await supabase
        .from("exercise_logs")
        .select("exercise_name")
        .order("created_at", { ascending: false })
        .limit(20);

      const muscleGroups = recentLogs?.length
        ? [...new Set(recentLogs.map((l) => l.exercise_name))]
        : ["helkropp"];

      const { data, error } = await supabase.functions.invoke("generate-mobility-routine", {
        body: { muscleGroups: muscleGroups.slice(0, 5), duration: 10 },
      });
      if (error) throw error;
      setRoutine(data as Routine);
      setActiveIndex(-1);
      setCompleted(false);
      toast.success("Mobilitetsrutin skapad!");
    } catch (err) {
      console.error(err);
      toast.error("Kunde inte generera rutin");
    } finally {
      setGenerating(false);
    }
  };

  const startRoutine = () => {
    if (!routine) return;
    setActiveIndex(0);
    setTimeLeft(routine.exercises[0].duration_seconds);
    setIsRunning(true);
    setCompleted(false);
  };

  const handleNext = () => {
    if (!routine) return;
    const nextIndex = activeIndex + 1;
    if (nextIndex >= routine.exercises.length) {
      setIsRunning(false);
      setActiveIndex(-1);
      setCompleted(true);
      saveCompletion();
      return;
    }
    setActiveIndex(nextIndex);
    setTimeLeft(routine.exercises[nextIndex].duration_seconds);
    setIsRunning(true);
  };

  const saveCompletion = async () => {
    if (!user || !routine) return;
    try {
      await supabase.from("mobility_routines").insert({
        user_id: user.id,
        routine_name: routine.routine_name,
        exercises: routine.exercises as any,
        duration_minutes: routine.total_duration_minutes,
        target_areas: routine.exercises.map((e) => e.target_area),
        completed_at: new Date().toISOString(),
      });
      toast.success(`+${routine.total_duration_minutes} XP för mobilitet!`);
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <StretchHorizontal className="w-5 h-5 text-teal-500" />
          Mobilitet & Stretching
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!routine ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Generera en stretchrutin anpassad efter din senaste träning
            </p>
            <Button onClick={generateRoutine} disabled={generating}>
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Skapa rutin med AI
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{routine.routine_name}</p>
                <p className="text-xs text-muted-foreground">{routine.total_duration_minutes} min • {routine.exercises.length} övningar</p>
              </div>
              {activeIndex === -1 && !completed && (
                <Button size="sm" onClick={startRoutine}>
                  <Play className="w-4 h-4 mr-1" /> Starta
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {routine.exercises.map((ex, i) => (
                <motion.div
                  key={i}
                  className={`p-2.5 rounded-lg border text-sm transition-all ${
                    i === activeIndex
                      ? "bg-primary/10 border-primary/30"
                      : i < activeIndex || completed
                      ? "bg-muted/30 border-border opacity-60"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{ex.name}</p>
                      <p className="text-xs text-muted-foreground">{ex.description}</p>
                    </div>
                    {i === activeIndex ? (
                      <span className="text-lg font-mono font-bold text-primary">{formatTime(timeLeft)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{ex.duration_seconds}s</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {activeIndex >= 0 && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsRunning(!isRunning)}>
                  {isRunning ? <Pause className="w-4 h-4 mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                  {isRunning ? "Pausa" : "Fortsätt"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext}>
                  <SkipForward className="w-4 h-4 mr-1" /> Nästa
                </Button>
              </div>
            )}

            {completed && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-3">
                <Check className="w-8 h-8 mx-auto text-green-500 mb-2" />
                <p className="font-semibold text-green-500">Rutin klar! 🎉</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={generateRoutine}>
                  Ny rutin
                </Button>
              </motion.div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
