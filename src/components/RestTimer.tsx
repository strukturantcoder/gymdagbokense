import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Timer, Play, Pause, RotateCcw, X, Volume2, VolumeX } from "lucide-react";

interface RestTimerProps {
  onClose?: () => void;
  compact?: boolean;
}

const PRESET_TIMES = [
  { label: "30s", seconds: 30 },
  { label: "60s", seconds: 60 },
  { label: "90s", seconds: 90 },
  { label: "2min", seconds: 120 },
  { label: "3min", seconds: 180 },
];

const RestTimer = ({ onClose, compact = false }: RestTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [initialTime, setInitialTime] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const playAlarm = useCallback(() => {
    if (!soundEnabled) return;
    
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    
    // Beep pattern: beep-beep-beep
    setTimeout(() => oscillator.stop(), 200);
    
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      osc2.connect(gainNode);
      osc2.frequency.value = 800;
      osc2.type = "sine";
      osc2.start();
      setTimeout(() => osc2.stop(), 200);
    }, 300);
    
    setTimeout(() => {
      const osc3 = audioContext.createOscillator();
      osc3.connect(gainNode);
      osc3.frequency.value = 1000;
      osc3.type = "sine";
      osc3.start();
      setTimeout(() => osc3.stop(), 400);
    }, 600);
  }, [soundEnabled]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playAlarm();
    }
    
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, playAlarm]);

  const handlePresetSelect = (seconds: number) => {
    setTimeLeft(seconds);
    setInitialTime(seconds);
    setIsRunning(false);
  };

  const handleStartPause = () => {
    if (timeLeft === 0) {
      setTimeLeft(initialTime);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setTimeLeft(initialTime);
    setIsRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = initialTime > 0 ? (timeLeft / initialTime) * 100 : 0;
  const isFinished = timeLeft === 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`font-mono text-lg font-bold ${isFinished ? "text-green-500 animate-pulse" : "text-foreground"}`}>
          {formatTime(timeLeft)}
        </div>
        <Button size="sm" variant="ghost" onClick={handleStartPause}>
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-gym-orange" />
            <span className="font-display font-bold">Vila Timer</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Timer Display */}
        <div className="relative flex items-center justify-center mb-4">
          <div className="relative w-40 h-40">
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/30"
              />
              {/* Progress circle */}
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className={isFinished ? "text-green-500" : "text-gym-orange"}
                strokeDasharray={`${2 * Math.PI * 45}`}
                strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            {/* Time display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={timeLeft}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className={`font-mono text-4xl font-bold ${
                    isFinished ? "text-green-500" : timeLeft <= 5 && isRunning ? "text-red-500" : "text-foreground"
                  }`}
                >
                  {formatTime(timeLeft)}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {PRESET_TIMES.map((preset) => (
            <Button
              key={preset.seconds}
              variant={initialTime === preset.seconds ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetSelect(preset.seconds)}
              className={initialTime === preset.seconds ? "bg-gym-orange hover:bg-gym-orange/90" : ""}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Control buttons */}
        <div className="flex gap-2 justify-center">
          <Button
            onClick={handleStartPause}
            className={`flex-1 ${
              isRunning
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-gym-orange hover:bg-gym-orange/90"
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pausa
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                {isFinished ? "Starta om" : "Starta"}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {isFinished && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-4 text-green-500 font-semibold"
          >
            ✓ Vilan är klar! Dags för nästa set!
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestTimer;
