import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Dumbbell, Plus, Trash2, Loader2, ArrowLeft, 
  Bike, Footprints, Waves, Flag, Timer, Flame, MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface CardioLog {
  id: string;
  activity_type: string;
  duration_minutes: number;
  distance_km: number | null;
  calories_burned: number | null;
  notes: string | null;
  completed_at: string;
}

const activityTypes = [
  { value: 'running', label: 'Löpning', icon: Footprints },
  { value: 'walking', label: 'Promenad', icon: Footprints },
  { value: 'cycling', label: 'Cykling', icon: Bike },
  { value: 'swimming', label: 'Simning', icon: Waves },
  { value: 'golf', label: 'Golf', icon: Flag },
  { value: 'other', label: 'Annat', icon: Timer },
];

const getActivityIcon = (type: string) => {
  const activity = activityTypes.find(a => a.value === type);
  return activity?.icon || Timer;
};

const getActivityLabel = (type: string) => {
  const activity = activityTypes.find(a => a.value === type);
  return activity?.label || type;
};

export default function CardioLog() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<CardioLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [activityType, setActivityType] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('cardio_logs')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching cardio logs:', error);
      toast.error('Kunde inte hämta konditionspass');
    } else {
      setLogs(data || []);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!activityType || !durationMinutes) {
      toast.error('Fyll i aktivitetstyp och tid');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('cardio_logs').insert({
        user_id: user!.id,
        activity_type: activityType,
        duration_minutes: parseInt(durationMinutes),
        distance_km: distanceKm ? parseFloat(distanceKm) : null,
        calories_burned: caloriesBurned ? parseInt(caloriesBurned) : null,
        notes: notes || null,
      });

      if (error) throw error;

      toast.success('Konditionspass loggat!');
      resetForm();
      fetchLogs();
    } catch (error) {
      console.error('Error saving cardio log:', error);
      toast.error('Kunde inte spara passet');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('cardio_logs')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Kunde inte ta bort passet');
    } else {
      toast.success('Pass borttaget');
      fetchLogs();
    }
  };

  const resetForm = () => {
    setActivityType('');
    setDurationMinutes('');
    setDistanceKm('');
    setCaloriesBurned('');
    setNotes('');
    setShowForm(false);
  };

  // Calculate stats
  const totalMinutes = logs.reduce((sum, log) => sum + log.duration_minutes, 0);
  const totalDistance = logs.reduce((sum, log) => sum + (log.distance_km || 0), 0);
  const totalCalories = logs.reduce((sum, log) => sum + (log.calories_burned || 0), 0);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">Konditionspass</span>
          </div>
          <Button variant="hero" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Logga pass
          </Button>
        </div>
      </header>

      <main className="container px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Timer className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalMinutes}</p>
                  <p className="text-sm text-muted-foreground">Minuter totalt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDistance.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Kilometer totalt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Flame className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCalories}</p>
                  <p className="text-sm text-muted-foreground">Kalorier brända</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-primary/50 bg-gradient-to-b from-primary/5 to-card">
              <CardHeader>
                <CardTitle>Logga konditionspass</CardTitle>
                <CardDescription>Registrera din träning</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Aktivitetstyp *</Label>
                    <Select value={activityType} onValueChange={setActivityType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj aktivitet" />
                      </SelectTrigger>
                      <SelectContent>
                        {activityTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="w-4 h-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tid (minuter) *</Label>
                    <Input
                      type="number"
                      placeholder="45"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Distans (km)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="5.0"
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Kalorier brända</Label>
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
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="hero" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sparar...
                      </>
                    ) : (
                      'Spara pass'
                    )}
                  </Button>
                  <Button variant="ghost" onClick={resetForm}>
                    Avbryt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Logs list */}
        <div>
          <h2 className="text-xl font-display font-bold mb-4">Senaste pass</h2>
          {logs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Footprints className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Du har inte loggat några konditionspass än
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const ActivityIcon = getActivityIcon(log.activity_type);
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                              <ActivityIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">
                                {getActivityLabel(log.activity_type)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(log.completed_at), 'd MMMM yyyy, HH:mm', { locale: sv })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="font-semibold">{log.duration_minutes} min</p>
                              {log.distance_km && (
                                <p className="text-sm text-muted-foreground">{log.distance_km} km</p>
                              )}
                            </div>
                            {log.calories_burned && (
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">
                                  <Flame className="w-4 h-4 inline mr-1" />
                                  {log.calories_burned} kcal
                                </p>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(log.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {log.notes && (
                          <p className="mt-2 text-sm text-muted-foreground pl-16">
                            {log.notes}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
