import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Play, Pause, Square, Timer, Footprints, Bike, Waves, Flag, 
  MapPin, Flame, Sparkles, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const activityTypes = [
  { value: 'running', label: 'Löpning', icon: Footprints, color: 'from-orange-500 to-red-500' },
  { value: 'walking', label: 'Promenad', icon: Footprints, color: 'from-green-500 to-emerald-500' },
  { value: 'cycling', label: 'Cykling', icon: Bike, color: 'from-blue-500 to-cyan-500' },
  { value: 'swimming', label: 'Simning', icon: Waves, color: 'from-cyan-500 to-blue-500' },
  { value: 'golf', label: 'Golf', icon: Flag, color: 'from-green-600 to-lime-500' },
  { value: 'other', label: 'Annat', icon: Timer, color: 'from-purple-500 to-pink-500' },
];

const CARDIO_XP_PER_MINUTE = 2;
const CARDIO_XP_PER_KM = 10;

interface QuickStartCardioProps {
  userId: string;
  onSessionComplete: () => void;
}

export default function QuickStartCardio({ userId, onSessionComplete }: QuickStartCardioProps) {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [distanceKm, setDistanceKm] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (activeSession && !isPaused) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeSession, isPaused]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = (activityType: string) => {
    setActiveSession(activityType);
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowFinishForm(false);
    setDistanceKm('');
    setCaloriesBurned('');
    setNotes('');
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const stopSession = () => {
    setIsPaused(true);
    setShowFinishForm(true);
  };

  const cancelSession = () => {
    setActiveSession(null);
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowFinishForm(false);
  };

  const calculateXP = (duration: number, distance: number | null) => {
    let xp = duration * CARDIO_XP_PER_MINUTE;
    if (distance) {
      xp += distance * CARDIO_XP_PER_KM;
    }
    return Math.round(xp);
  };

  const saveSession = async () => {
    if (!activeSession) return;

    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const distance = distanceKm ? parseFloat(distanceKm) : null;
    const calories = caloriesBurned ? parseInt(caloriesBurned) : null;

    setIsSaving(true);
    try {
      // Save cardio log
      const { error } = await supabase.from('cardio_logs').insert({
        user_id: userId,
        activity_type: activeSession,
        duration_minutes: durationMinutes,
        distance_km: distance,
        calories_burned: calories,
        notes: notes || null,
      });

      if (error) throw error;

      // Update user stats
      const xpEarned = calculateXP(durationMinutes, distance);
      
      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('total_xp, total_cardio_sessions, total_cardio_minutes, total_cardio_distance_km')
        .eq('user_id', userId)
        .maybeSingle();

      if (currentStats) {
        await supabase
          .from('user_stats')
          .update({
            total_xp: currentStats.total_xp + xpEarned,
            total_cardio_sessions: currentStats.total_cardio_sessions + 1,
            total_cardio_minutes: currentStats.total_cardio_minutes + durationMinutes,
            total_cardio_distance_km: Number(currentStats.total_cardio_distance_km) + (distance || 0)
          })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('user_stats')
          .insert({
            user_id: userId,
            total_xp: xpEarned,
            total_cardio_sessions: 1,
            total_cardio_minutes: durationMinutes,
            total_cardio_distance_km: distance || 0
          });
      }

      const activityLabel = activityTypes.find(a => a.value === activeSession)?.label || activeSession;
      toast.success(`${activityLabel} loggat! +${xpEarned} XP`);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });

      // Reset state
      setActiveSession(null);
      setElapsedSeconds(0);
      setShowFinishForm(false);
      onSessionComplete();
    } catch (error) {
      console.error('Error saving cardio session:', error);
      toast.error('Kunde inte spara passet');
    } finally {
      setIsSaving(false);
    }
  };

  const activeActivity = activityTypes.find(a => a.value === activeSession);

  if (activeSession && activeActivity) {
    const ActivityIcon = activeActivity.icon;
    const durationMinutes = Math.round(elapsedSeconds / 60);
    const estimatedXP = calculateXP(durationMinutes, distanceKm ? parseFloat(distanceKm) : null);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8"
      >
        <Card className={`border-2 border-primary overflow-hidden`}>
          <div className={`h-2 bg-gradient-to-r ${activeActivity.color}`} />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${activeActivity.color}`}>
                <ActivityIcon className="w-6 h-6 text-white" />
              </div>
              <span>{activeActivity.label}</span>
              {!isPaused && (
                <span className="ml-auto text-sm font-normal text-muted-foreground animate-pulse">
                  ● Pågår
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timer */}
            <div className="text-center py-6">
              <motion.div
                key={elapsedSeconds}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className="text-6xl font-mono font-bold tracking-wider"
              >
                {formatTime(elapsedSeconds)}
              </motion.div>
              <p className="text-muted-foreground mt-2">
                ~{durationMinutes} min • ~{estimatedXP} XP
              </p>
            </div>

            {/* Controls */}
            {!showFinishForm ? (
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={togglePause}
                  className="w-24"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Fortsätt
                    </>
                  ) : (
                    <>
                      <Pause className="w-5 h-5 mr-2" />
                      Paus
                    </>
                  )}
                </Button>
                <Button
                  variant="hero"
                  size="lg"
                  onClick={stopSession}
                  className="w-24"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Avsluta
                </Button>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Distans (km)
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="5.0"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Flame className="w-4 h-4" />
                      Kalorier
                    </Label>
                    <Input
                      type="number"
                      placeholder="300"
                      value={caloriesBurned}
                      onChange={(e) => setCaloriesBurned(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Anteckningar</Label>
                  <Textarea
                    placeholder="Hur kändes passet?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                {distanceKm && (
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Förväntad XP: +{estimatedXP}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="hero" onClick={saveSession} disabled={isSaving} className="flex-1">
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sparar...
                      </>
                    ) : (
                      'Spara pass'
                    )}
                  </Button>
                  <Button variant="ghost" onClick={cancelSession}>
                    Avbryt
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" />
          Starta spontant pass
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {activityTypes.map((activity) => {
            const Icon = activity.icon;
            return (
              <motion.button
                key={activity.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => startSession(activity.value)}
                className={`p-4 rounded-xl bg-gradient-to-br ${activity.color} text-white flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transition-shadow`}
              >
                <Icon className="w-8 h-8" />
                <span className="text-sm font-medium">{activity.label}</span>
              </motion.button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Tryck på en aktivitet för att starta timern
        </p>
      </CardContent>
    </Card>
  );
}
