import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Play, Pause, Square, Timer, Footprints, Bike, Waves, Flag, 
  MapPin, Flame, Sparkles, Loader2, Navigation, Gauge, TrendingUp, AlertCircle, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { useGpsTracking } from '@/hooks/useGpsTracking';
import RouteMapDialog from '@/components/RouteMapDialog';
import AdBanner from '@/components/AdBanner';

const activityTypes = [
  { value: 'running', label: 'Löpning', icon: Footprints, color: 'from-orange-500 to-red-500', gpsRecommended: true },
  { value: 'intervals', label: 'Intervaller', icon: Zap, color: 'from-yellow-500 to-orange-500', gpsRecommended: true },
  { value: 'walking', label: 'Promenad', icon: Footprints, color: 'from-green-500 to-emerald-500', gpsRecommended: true },
  { value: 'cycling', label: 'Cykling', icon: Bike, color: 'from-blue-500 to-cyan-500', gpsRecommended: true },
  { value: 'swimming', label: 'Simning', icon: Waves, color: 'from-cyan-500 to-blue-500', gpsRecommended: false },
  { value: 'golf', label: 'Golf', icon: Flag, color: 'from-green-600 to-lime-500', gpsRecommended: true },
  { value: 'other', label: 'Annat', icon: Timer, color: 'from-purple-500 to-pink-500', gpsRecommended: false },
];

const CARDIO_XP_PER_MINUTE = 2;
const CARDIO_XP_PER_KM = 10;
const SESSION_STORAGE_KEY = 'active_cardio_session';

interface StoredSession {
  activityType: string;
  startTime: number;
  gpsEnabled: boolean;
  sessionId: string;
}

interface QuickStartCardioProps {
  userId: string;
  onSessionComplete: () => void;
}

export default function QuickStartCardio({ userId, onSessionComplete }: QuickStartCardioProps) {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showFinishForm, setShowFinishForm] = useState(false);
  const [distanceKm, setDistanceKm] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [savedRouteData, setSavedRouteData] = useState<{
    positions: Array<{ latitude: number; longitude: number; timestamp: number; speed: number | null }>;
    totalDistanceKm: number;
    averageSpeedKmh: number;
    maxSpeedKmh: number;
  } | null>(null);
  const [savedDuration, setSavedDuration] = useState(0);
  const [savedActivityLabel, setSavedActivityLabel] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { isTracking, hasPermission, error: gpsError, stats: gpsStats, resetStats, clearPersistedData } = useGpsTracking(
    activeSession !== null && !isPaused && gpsEnabled,
    sessionId
  );

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      try {
        const session: StoredSession = JSON.parse(stored);
        setActiveSession(session.activityType);
        setStartTime(session.startTime);
        setGpsEnabled(session.gpsEnabled);
        setSessionId(session.sessionId);
        // Calculate elapsed time from stored start time
        const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
        setElapsedSeconds(elapsed);
      } catch (e) {
        console.error('Failed to restore session:', e);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }, []);

  // Persist session state
  const persistSession = useCallback(() => {
    if (activeSession && startTime && sessionId) {
      const session: StoredSession = {
        activityType: activeSession,
        startTime,
        gpsEnabled,
        sessionId,
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, [activeSession, startTime, gpsEnabled, sessionId]);

  useEffect(() => {
    if (activeSession && startTime) {
      persistSession();
    }
  }, [activeSession, startTime, gpsEnabled, persistSession]);

  // Timer that calculates from start time (survives page refresh)
  useEffect(() => {
    if (activeSession && startTime && !isPaused) {
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeSession, startTime, isPaused]);

  // Sync GPS distance to form
  useEffect(() => {
    if (gpsStats.totalDistanceKm > 0 && !showFinishForm) {
      setDistanceKm(gpsStats.totalDistanceKm.toFixed(2));
    }
  }, [gpsStats.totalDistanceKm, showFinishForm]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (speedKmh: number) => {
    if (speedKmh <= 0) return '--:--';
    const paceMinPerKm = 60 / speedKmh;
    const mins = Math.floor(paceMinPerKm);
    const secs = Math.round((paceMinPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = (activityType: string) => {
    const activity = activityTypes.find(a => a.value === activityType);
    const newSessionId = `session_${Date.now()}`;
    const now = Date.now();
    
    setActiveSession(activityType);
    setSessionId(newSessionId);
    setStartTime(now);
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowFinishForm(false);
    setDistanceKm('');
    setCaloriesBurned('');
    setNotes('');
    setGpsEnabled(activity?.gpsRecommended ?? true);
    resetStats();

    // Persist immediately
    const session: StoredSession = {
      activityType,
      startTime: now,
      gpsEnabled: activity?.gpsRecommended ?? true,
      sessionId: newSessionId,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const stopSession = () => {
    setIsPaused(true);
    setShowFinishForm(true);
    if (gpsStats.totalDistanceKm > 0) {
      setDistanceKm(gpsStats.totalDistanceKm.toFixed(2));
    }
  };

  const cancelSession = () => {
    setActiveSession(null);
    setStartTime(null);
    setElapsedSeconds(0);
    setIsPaused(false);
    setShowFinishForm(false);
    resetStats();
    clearPersistedData();
    localStorage.removeItem(SESSION_STORAGE_KEY);
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
    const activityLabel = activityTypes.find(a => a.value === activeSession)?.label || activeSession;

    setIsSaving(true);
    try {
      const { data: cardioLog, error } = await supabase.from('cardio_logs').insert({
        user_id: userId,
        activity_type: activeSession,
        duration_minutes: durationMinutes,
        distance_km: distance,
        calories_burned: calories,
        notes: notes || null,
      }).select().single();

      if (error) throw error;

      const hasGpsRoute = gpsEnabled && gpsStats.positions.length >= 2;
      if (hasGpsRoute && cardioLog) {
        const routeDataToSave = {
          positions: gpsStats.positions.map(p => ({
            latitude: p.latitude,
            longitude: p.longitude,
            timestamp: p.timestamp,
            speed: p.speed,
          })),
        };

        await supabase.from('cardio_routes').insert({
          cardio_log_id: cardioLog.id,
          user_id: userId,
          route_data: routeDataToSave,
          total_distance_km: gpsStats.totalDistanceKm,
          average_speed_kmh: gpsStats.averageSpeedKmh,
          max_speed_kmh: gpsStats.maxSpeedKmh,
        });

        setSavedRouteData({
          positions: routeDataToSave.positions,
          totalDistanceKm: gpsStats.totalDistanceKm,
          averageSpeedKmh: gpsStats.averageSpeedKmh,
          maxSpeedKmh: gpsStats.maxSpeedKmh,
        });
        setSavedDuration(durationMinutes);
        setSavedActivityLabel(activityLabel);
      }

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

      toast.success(`${activityLabel} loggat! +${xpEarned} XP`);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });

      // Clear all persisted data
      setActiveSession(null);
      setStartTime(null);
      setElapsedSeconds(0);
      setShowFinishForm(false);
      resetStats();
      clearPersistedData();
      localStorage.removeItem(SESSION_STORAGE_KEY);
      onSessionComplete();

      if (hasGpsRoute) {
        setTimeout(() => setShowRouteMap(true), 500);
      }
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
    const currentDistance = gpsEnabled && gpsStats.totalDistanceKm > 0 
      ? gpsStats.totalDistanceKm 
      : (distanceKm ? parseFloat(distanceKm) : null);
    const estimatedXP = calculateXP(durationMinutes, currentDistance);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8 space-y-4"
      >
        {/* Ad at start of cardio session */}
        <AdBanner size="horizontal" />
        
        <Card className="border-2 border-primary overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${activeActivity.color}`} />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${activeActivity.color}`}>
                <ActivityIcon className="w-6 h-6 text-white" />
              </div>
              <span>{activeActivity.label}</span>
              <div className="ml-auto flex items-center gap-2">
                {gpsEnabled && isTracking && (
                  <span className="text-xs font-normal text-green-500 flex items-center gap-1">
                    <Navigation className="w-3 h-3 animate-pulse" />
                    GPS
                  </span>
                )}
                {!isPaused && (
                  <span className="text-sm font-normal text-muted-foreground animate-pulse">
                    ● Pågår
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timer */}
            <div className="text-center py-4">
              <motion.div
                key={elapsedSeconds}
                initial={{ scale: 1.02 }}
                animate={{ scale: 1 }}
                className="text-6xl font-mono font-bold tracking-wider"
              >
                {formatTime(elapsedSeconds)}
              </motion.div>
            </div>

            {/* GPS Stats */}
            {gpsEnabled && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <MapPin className="w-3 h-3" />
                    Distans
                  </div>
                  <p className="text-xl font-bold">
                    {gpsStats.totalDistanceKm.toFixed(2)} <span className="text-sm font-normal">km</span>
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <Gauge className="w-3 h-3" />
                    Hastighet
                  </div>
                  <p className="text-xl font-bold">
                    {gpsStats.currentSpeedKmh.toFixed(1)} <span className="text-sm font-normal">km/h</span>
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Tempo
                  </div>
                  <p className="text-xl font-bold">
                    {formatPace(gpsStats.currentSpeedKmh)} <span className="text-sm font-normal">/km</span>
                  </p>
                </div>
              </div>
            )}

            {/* GPS Error */}
            {gpsEnabled && gpsError && (
              <div className="flex items-center gap-2 text-amber-500 text-sm bg-amber-500/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{gpsError}</span>
              </div>
            )}

            {/* GPS Toggle */}
            {!showFinishForm && (
              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">GPS-spårning</span>
                </div>
                <Switch
                  checked={gpsEnabled}
                  onCheckedChange={(checked) => {
                    setGpsEnabled(checked);
                    persistSession();
                  }}
                />
              </div>
            )}

            {/* XP Preview */}
            <div className="text-center text-sm text-muted-foreground">
              ~{durationMinutes} min • ~{estimatedXP} XP
            </div>

            {/* Controls */}
            {!showFinishForm ? (
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={togglePause}
                  className="w-28"
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
                  className="w-28"
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
                {/* Summary */}
                {gpsEnabled && gpsStats.totalDistanceKm > 0 && (
                  <div className="bg-primary/10 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-sm">GPS-sammanfattning</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Distans: <span className="font-bold">{gpsStats.totalDistanceKm.toFixed(2)} km</span></div>
                      <div>Snitt: <span className="font-bold">{gpsStats.averageSpeedKmh.toFixed(1)} km/h</span></div>
                      <div>Max: <span className="font-bold">{gpsStats.maxSpeedKmh.toFixed(1)} km/h</span></div>
                      <div>Tempo: <span className="font-bold">{formatPace(gpsStats.averageSpeedKmh)} /km</span></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Distans (km)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="5.00"
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

                {/* Ad in finish form */}
                <AdBanner size="horizontal" />

                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Förväntad XP: +{estimatedXP}
                  </p>
                </div>

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
    <>
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
                  className={`p-4 rounded-xl bg-gradient-to-br ${activity.color} text-white flex flex-col items-center gap-2 shadow-lg hover:shadow-xl transition-shadow relative`}
                >
                  <Icon className="w-8 h-8" />
                  <span className="text-sm font-medium">{activity.label}</span>
                  {activity.gpsRecommended && (
                    <Navigation className="w-3 h-3 absolute top-2 right-2 opacity-70" />
                  )}
                </motion.button>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Tryck på en aktivitet för att starta med GPS-spårning
          </p>
        </CardContent>
      </Card>

      {/* Route Map Dialog */}
      <RouteMapDialog
        open={showRouteMap}
        onOpenChange={setShowRouteMap}
        routeData={savedRouteData || undefined}
        activityLabel={savedActivityLabel}
        durationMinutes={savedDuration}
      />
    </>
  );
}
