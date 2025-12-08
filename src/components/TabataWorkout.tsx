import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Play, Pause, RotateCcw, Plus, Trash2, Edit2, Timer, Zap, Check, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const DEFAULT_EXERCISES = [
  'Armhävningar',
  'Burpees',
  'Mountain Climbers',
  'Jumping Jacks',
  'Squats',
  'Lunges',
  'Planka',
  'High Knees',
];

const ALL_EXERCISES = [
  'Armhävningar',
  'Burpees',
  'Mountain Climbers',
  'Jumping Jacks',
  'Squats',
  'Lunges',
  'Planka',
  'High Knees',
  'Sit-ups',
  'Russian Twists',
  'Bicycle Crunches',
  'Jump Squats',
  'Tricep Dips',
  'Pike Push-ups',
  'Skaters',
  'Box Jumps',
  'Calf Raises',
  'Wall Sit',
  'Flutter Kicks',
  'Leg Raises',
];

interface TabataConfig {
  rounds: number;
  workTime: number;
  restTime: number;
  exercises: string[];
}

type Phase = 'idle' | 'work' | 'rest' | 'done';

export default function TabataWorkout() {
  const { user } = useAuth();
  const [config, setConfig] = useState<TabataConfig>({
    rounds: 8,
    workTime: 20,
    restTime: 10,
    exercises: DEFAULT_EXERCISES.slice(0, 4),
  });

  const [isRunning, setIsRunning] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentRound, setCurrentRound] = useState(1);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.workTime);
  const [totalElapsed, setTotalElapsed] = useState(0);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editExercises, setEditExercises] = useState<string[]>([]);
  const [newExercise, setNewExercise] = useState('');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const playBeep = useCallback((frequency: number = 800, duration: number = 200) => {
    try {
      if (!audioRef.current) {
        audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const oscillator = audioRef.current.createOscillator();
      const gainNode = audioRef.current.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioRef.current.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioRef.current.currentTime);
      oscillator.start();
      oscillator.stop(audioRef.current.currentTime + duration / 1000);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  const saveToCardioLog = async () => {
    if (!user) return;
    
    const totalMinutes = Math.ceil(totalElapsed / 60);
    
    try {
      await supabase.from('cardio_logs').insert({
        user_id: user.id,
        activity_type: 'other',
        duration_minutes: totalMinutes,
        notes: `Tabata: ${config.exercises.join(', ')}`,
      });

      // Update user stats
      const { data: stats } = await supabase
        .from('user_stats')
        .select('total_xp, total_cardio_sessions, total_cardio_minutes')
        .eq('user_id', user.id)
        .maybeSingle();

      const xpEarned = totalMinutes * 2;

      if (stats) {
        await supabase
          .from('user_stats')
          .update({
            total_xp: stats.total_xp + xpEarned,
            total_cardio_sessions: stats.total_cardio_sessions + 1,
            total_cardio_minutes: stats.total_cardio_minutes + totalMinutes,
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            total_xp: xpEarned,
            total_cardio_sessions: 1,
            total_cardio_minutes: totalMinutes,
          });
      }

      toast.success(`Tabata-pass sparat! +${xpEarned} XP`);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (error) {
      console.error('Error saving tabata:', error);
      toast.error('Kunde inte spara passet');
    }
  };

  const startWorkout = () => {
    if (config.exercises.length === 0) {
      toast.error('Lägg till minst en övning');
      return;
    }
    setIsRunning(true);
    setPhase('work');
    setCurrentRound(1);
    setCurrentExerciseIndex(0);
    setTimeLeft(config.workTime);
    setTotalElapsed(0);
    playBeep(1000, 500);
  };

  const pauseWorkout = () => {
    setIsRunning(false);
  };

  const resumeWorkout = () => {
    setIsRunning(true);
  };

  const resetWorkout = () => {
    setIsRunning(false);
    setPhase('idle');
    setCurrentRound(1);
    setCurrentExerciseIndex(0);
    setTimeLeft(config.workTime);
    setTotalElapsed(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const randomizeExercises = () => {
    const shuffled = [...ALL_EXERCISES].sort(() => Math.random() - 0.5);
    setConfig(prev => ({ ...prev, exercises: shuffled.slice(0, 4) }));
    toast.success('Slumpade nya övningar!');
  };

  useEffect(() => {
    if (isRunning && phase !== 'idle' && phase !== 'done') {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up for this phase
            if (phase === 'work') {
              if (currentRound >= config.rounds) {
                // Workout complete
                setPhase('done');
                setIsRunning(false);
                playBeep(600, 1000);
                saveToCardioLog();
                return 0;
              } else {
                // Switch to rest
                setPhase('rest');
                playBeep(400, 300);
                return config.restTime;
              }
            } else {
              // Rest phase done, next round
              setCurrentRound(r => r + 1);
              setCurrentExerciseIndex(i => (i + 1) % config.exercises.length);
              setPhase('work');
              playBeep(1000, 300);
              return config.workTime;
            }
          }
          return prev - 1;
        });
        setTotalElapsed(t => t + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, phase, currentRound, config, playBeep]);

  const openEditDialog = () => {
    setEditExercises([...config.exercises]);
    setShowEditDialog(true);
  };

  const addExercise = () => {
    if (newExercise.trim()) {
      setEditExercises([...editExercises, newExercise.trim()]);
      setNewExercise('');
    }
  };

  const removeExercise = (index: number) => {
    setEditExercises(editExercises.filter((_, i) => i !== index));
  };

  const saveExercises = () => {
    if (editExercises.length === 0) {
      toast.error('Lägg till minst en övning');
      return;
    }
    setConfig(prev => ({ ...prev, exercises: editExercises }));
    setShowEditDialog(false);
    toast.success('Övningar uppdaterade!');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = config.rounds * (config.workTime + config.restTime) - config.restTime;
  const progress = phase === 'done' ? 100 : (totalElapsed / totalDuration) * 100;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            Tabata Kroppsövningar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {phase === 'idle' ? (
            <>
              {/* Config Section */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs">Rundor</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={config.rounds}
                    onChange={(e) => setConfig(prev => ({ ...prev, rounds: parseInt(e.target.value) || 8 }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Arbete (sek)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={60}
                    value={config.workTime}
                    onChange={(e) => setConfig(prev => ({ ...prev, workTime: parseInt(e.target.value) || 20 }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Vila (sek)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={60}
                    value={config.restTime}
                    onChange={(e) => setConfig(prev => ({ ...prev, restTime: parseInt(e.target.value) || 10 }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Antal övningar</Label>
                  <Input
                    type="number"
                    min={1}
                    max={ALL_EXERCISES.length}
                    value={config.exercises.length}
                    onChange={(e) => {
                      const count = Math.max(1, Math.min(ALL_EXERCISES.length, parseInt(e.target.value) || 4));
                      const currentCount = config.exercises.length;
                      if (count > currentCount) {
                        const available = ALL_EXERCISES.filter(ex => !config.exercises.includes(ex));
                        const toAdd = available.slice(0, count - currentCount);
                        setConfig(prev => ({ ...prev, exercises: [...prev.exercises, ...toAdd] }));
                      } else if (count < currentCount) {
                        setConfig(prev => ({ ...prev, exercises: prev.exercises.slice(0, count) }));
                      }
                    }}
                  />
                </div>
              </div>

              {/* Exercises */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Övningar ({config.exercises.length})</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={randomizeExercises}>
                      <Shuffle className="w-4 h-4 mr-1" />
                      Slumpa
                    </Button>
                    <Button variant="outline" size="sm" onClick={openEditDialog}>
                      <Edit2 className="w-4 h-4 mr-1" />
                      Redigera
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.exercises.map((exercise, index) => (
                    <div
                      key={index}
                      className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
                    >
                      {index + 1}. {exercise}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total time */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total tid:</span>
                <span className="font-medium">{formatTime(totalDuration)}</span>
              </div>

              <Button onClick={startWorkout} className="w-full gap-2" size="lg">
                <Play className="w-5 h-5" />
                Starta Tabata
              </Button>
            </>
          ) : (
            <>
              {/* Active Workout Display */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${phase}-${currentRound}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className={`text-center p-8 rounded-2xl ${
                    phase === 'work' 
                      ? 'bg-green-500/20 border-2 border-green-500' 
                      : phase === 'rest' 
                      ? 'bg-blue-500/20 border-2 border-blue-500'
                      : 'bg-primary/20 border-2 border-primary'
                  }`}
                >
                  {phase === 'done' ? (
                    <>
                      <Check className="w-16 h-16 mx-auto mb-4 text-primary" />
                      <h2 className="text-2xl font-bold mb-2">Klart! 🎉</h2>
                      <p className="text-muted-foreground">
                        Du körde {config.rounds} rundor på {formatTime(totalElapsed)}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-medium text-muted-foreground mb-2">
                        Runda {currentRound}/{config.rounds}
                      </div>
                      <h2 className={`text-3xl font-bold mb-4 ${
                        phase === 'work' ? 'text-green-500' : 'text-blue-500'
                      }`}>
                        {phase === 'work' ? config.exercises[currentExerciseIndex] : 'Vila'}
                      </h2>
                      <div className={`text-7xl font-mono font-bold ${
                        phase === 'work' ? 'text-green-500' : 'text-blue-500'
                      }`}>
                        {timeLeft}
                      </div>
                      <div className="text-sm text-muted-foreground mt-4">
                        {phase === 'work' ? 'KÖR!' : 'Andas...'}
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Controls */}
              <div className="flex gap-3 justify-center">
                {phase !== 'done' && (
                  <>
                    {isRunning ? (
                      <Button onClick={pauseWorkout} variant="outline" size="lg">
                        <Pause className="w-5 h-5 mr-2" />
                        Paus
                      </Button>
                    ) : (
                      <Button onClick={resumeWorkout} size="lg">
                        <Play className="w-5 h-5 mr-2" />
                        Fortsätt
                      </Button>
                    )}
                  </>
                )}
                <Button onClick={resetWorkout} variant="outline" size="lg">
                  <RotateCcw className="w-5 h-5 mr-2" />
                  {phase === 'done' ? 'Kör igen' : 'Avbryt'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Exercises Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redigera övningar</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newExercise}
                onChange={(e) => setNewExercise(e.target.value)}
                placeholder="Lägg till övning..."
                onKeyDown={(e) => e.key === 'Enter' && addExercise()}
              />
              <Button onClick={addExercise} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {editExercises.map((exercise, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted"
                >
                  <span>{index + 1}. {exercise}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExercise(index)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <Label className="text-xs text-muted-foreground mb-2 block">Förslag:</Label>
              <div className="flex flex-wrap gap-1">
                {ALL_EXERCISES.filter(e => !editExercises.includes(e)).slice(0, 8).map((exercise) => (
                  <button
                    key={exercise}
                    onClick={() => setEditExercises([...editExercises, exercise])}
                    className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    + {exercise}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={saveExercises}>
              Spara
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
