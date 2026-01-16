import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Watch, 
  Heart, 
  Mountain, 
  Timer, 
  Flame, 
  MapPin, 
  Activity,
  TrendingUp,
  Zap,
  Loader2,
  Map
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import GarminRouteMapDialog from './GarminRouteMapDialog';

interface GarminActivity {
  id: string;
  garmin_activity_id: string;
  activity_type: string;
  activity_name: string | null;
  start_time: string;
  duration_seconds: number | null;
  distance_meters: number | null;
  calories: number | null;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  elevation_gain: number | null;
  average_speed: number | null;
}

const activityTypeLabels: Record<string, string> = {
  running: 'Löpning',
  cycling: 'Cykling',
  swimming: 'Simning',
  walking: 'Promenad',
  hiking: 'Vandring',
  strength_training: 'Styrketräning',
  cardio: 'Kondition',
  yoga: 'Yoga',
  other: 'Övrigt'
};

const activityTypeIcons: Record<string, React.ReactNode> = {
  running: <Activity className="w-4 h-4" />,
  cycling: <Activity className="w-4 h-4" />,
  swimming: <Activity className="w-4 h-4" />,
  walking: <Activity className="w-4 h-4" />,
  hiking: <Mountain className="w-4 h-4" />,
  strength_training: <Zap className="w-4 h-4" />,
  cardio: <Heart className="w-4 h-4" />,
  yoga: <Activity className="w-4 h-4" />,
  other: <Activity className="w-4 h-4" />
};

// Check if activity type typically has GPS
const hasGpsSupport = (activityType: string): boolean => {
  const gpsActivities = ['running', 'cycling', 'walking', 'hiking', 'swimming', 'trail_running', 'open_water_swimming'];
  return gpsActivities.includes(activityType.toLowerCase());
};

export default function GarminActivitiesSection() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<GarminActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasGarminConnection, setHasGarminConnection] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<GarminActivity | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  useEffect(() => {
    if (user) {
      fetchGarminData();
    }
  }, [user]);

  const fetchGarminData = async () => {
    setIsLoading(true);
    
    // Check if user has Garmin connection
    const { data: connection } = await supabase
      .from('garmin_connections')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();
    
    setHasGarminConnection(!!connection);

    if (connection) {
      // Fetch Garmin activities
      const { data: garminActivities } = await supabase
        .from('garmin_activities')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(50);
      
      if (garminActivities) {
        setActivities(garminActivities);
      }
    }
    
    setIsLoading(false);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const formatDistance = (meters: number | null) => {
    if (!meters) return null;
    const km = meters / 1000;
    return km >= 1 ? `${km.toFixed(2)} km` : `${meters.toFixed(0)} m`;
  };

  const formatSpeed = (metersPerSecond: number | null) => {
    if (!metersPerSecond) return null;
    const kmh = metersPerSecond * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  };

  // Calculate summary stats
  const totalActivities = activities.length;
  const avgHeartRate = activities.filter(a => a.average_heart_rate).length > 0
    ? Math.round(activities.reduce((sum, a) => sum + (a.average_heart_rate || 0), 0) / activities.filter(a => a.average_heart_rate).length)
    : null;
  const totalElevation = activities.reduce((sum, a) => sum + (a.elevation_gain || 0), 0);
  const totalCalories = activities.reduce((sum, a) => sum + (a.calories || 0), 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!hasGarminConnection) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Watch className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">
            Anslut din Garmin-klocka i kontoinställningarna för att se aktiviteter här.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Watch className="w-5 h-5" />
            Garmin-aktiviteter
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Inga aktiviteter synkade från Garmin ännu. Synka i kontoinställningarna.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Watch className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{totalActivities}</p>
                <p className="text-xs text-muted-foreground">Garmin-aktiviteter</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {avgHeartRate && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <Heart className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{avgHeartRate}</p>
                  <p className="text-xs text-muted-foreground">Snitt puls (bpm)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {totalElevation > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Mountain className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{totalElevation.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Total höjdmeter</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {totalCalories > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gym-orange/10 rounded-lg">
                  <Flame className="w-5 h-5 text-gym-orange" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{totalCalories.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total kalorier</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Watch className="w-5 h-5" />
            Garmin-aktiviteter
          </CardTitle>
          <CardDescription>Detaljerad data från din Garmin-klocka</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                >
                  <Card className="bg-muted/30 hover:bg-muted/50 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-primary/10 rounded">
                              {activityTypeIcons[activity.activity_type] || <Activity className="w-4 h-4" />}
                            </div>
                            <h4 className="font-medium">
                              {activity.activity_name || activityTypeLabels[activity.activity_type] || activity.activity_type}
                            </h4>
                            <Badge variant="secondary" className="text-xs">
                              {activityTypeLabels[activity.activity_type] || activity.activity_type}
                            </Badge>
                          </div>
                          
                          {/* Date & Duration */}
                          <p className="text-sm text-muted-foreground mb-3">
                            {format(parseISO(activity.start_time), "d MMMM yyyy 'kl' HH:mm", { locale: sv })}
                            {activity.duration_seconds && ` · ${formatDuration(activity.duration_seconds)}`}
                          </p>
                          
                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {activity.distance_meters && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{formatDistance(activity.distance_meters)}</span>
                              </div>
                            )}
                            
                            {activity.average_heart_rate && (
                              <div className="flex items-center gap-2 text-sm">
                                <Heart className="w-4 h-4 text-red-500" />
                                <span>
                                  {activity.average_heart_rate} bpm
                                  {activity.max_heart_rate && (
                                    <span className="text-muted-foreground"> (max {activity.max_heart_rate})</span>
                                  )}
                                </span>
                              </div>
                            )}
                            
                            {activity.elevation_gain && activity.elevation_gain > 0 && (
                              <div className="flex items-center gap-2 text-sm">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                <span>{activity.elevation_gain.toFixed(0)} m höjd</span>
                              </div>
                            )}
                            
                            {activity.average_speed && (
                              <div className="flex items-center gap-2 text-sm">
                                <Timer className="w-4 h-4 text-muted-foreground" />
                                <span>{formatSpeed(activity.average_speed)}</span>
                              </div>
                            )}
                            
                            {activity.calories && (
                              <div className="flex items-center gap-2 text-sm">
                                <Flame className="w-4 h-4 text-gym-orange" />
                                <span>{activity.calories} kcal</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Map button for GPS activities */}
                        {hasGpsSupport(activity.activity_type) && activity.distance_meters && activity.distance_meters > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => {
                              setSelectedActivity(activity);
                              setMapDialogOpen(true);
                            }}
                          >
                            <Map className="w-4 h-4 mr-1" />
                            Karta
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Map Dialog */}
      {selectedActivity && (
        <GarminRouteMapDialog
          open={mapDialogOpen}
          onOpenChange={setMapDialogOpen}
          activity={selectedActivity}
        />
      )}
    </motion.div>
  );
}
