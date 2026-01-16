import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Gauge, Timer, Navigation, Loader2, AlertCircle, Heart, Mountain, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RoutePosition {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null;
}

interface RouteData {
  positions: RoutePosition[];
  totalDistanceKm: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
}

interface GarminActivity {
  garmin_activity_id: string;
  activity_name: string | null;
  activity_type: string;
  duration_seconds: number | null;
  distance_meters: number | null;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  elevation_gain: number | null;
  calories: number | null;
  average_speed: number | null;
}

interface GarminRouteMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: GarminActivity;
}

const activityTypeLabels: Record<string, string> = {
  running: 'Löpning',
  cycling: 'Cykling',
  swimming: 'Simning',
  walking: 'Promenad',
  hiking: 'Vandring',
  other: 'Aktivitet'
};

export default function GarminRouteMapDialog({
  open,
  onOpenChange,
  activity,
}: GarminRouteMapDialogProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (err) {
        console.error('Error fetching Mapbox token:', err);
      }
    };
    
    if (open && !mapboxToken) {
      fetchToken();
    }
  }, [open, mapboxToken]);

  // Fetch GPS route data from Garmin
  useEffect(() => {
    const fetchRoute = async () => {
      if (!open || !activity.garmin_activity_id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase.functions.invoke('garmin-fetch-route', {
          body: { garminActivityId: activity.garmin_activity_id }
        });

        if (error) throw error;
        
        if (data.route) {
          setRouteData(data.route);
        } else {
          setError('Ingen GPS-data tillgänglig för denna aktivitet');
        }
      } catch (err) {
        console.error('Error fetching GPS route:', err);
        setError('Kunde inte hämta GPS-data');
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchRoute();
    }
  }, [open, activity.garmin_activity_id]);

  // Initialize map
  useEffect(() => {
    if (!open || !mapContainer.current || !routeData || !mapboxToken) return;
    if (routeData.positions.length < 2) return;

    mapboxgl.accessToken = mapboxToken;

    const positions = routeData.positions;
    const coordinates: [number, number][] = positions.map(p => [p.longitude, p.latitude]);
    
    // Calculate bounds
    const bounds = coordinates.reduce(
      (bounds, coord) => bounds.extend(coord),
      new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
    );

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      bounds: bounds,
      fitBoundsOptions: { padding: 50 },
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      if (!map.current) return;

      // Add route line
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates,
          },
        },
      });

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#f97316',
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });

      // Add start marker
      new mapboxgl.Marker({ color: '#22c55e' })
        .setLngLat(coordinates[0])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>Start</strong>'))
        .addTo(map.current);

      // Add end marker
      new mapboxgl.Marker({ color: '#ef4444' })
        .setLngLat(coordinates[coordinates.length - 1])
        .setPopup(new mapboxgl.Popup().setHTML('<strong>Mål</strong>'))
        .addTo(map.current);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [open, routeData, mapboxToken]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setRouteData(null);
      setError(null);
    }
  }, [open]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const formatPace = (speedKmh: number) => {
    if (speedKmh <= 0) return '--:--';
    const paceMinPerKm = 60 / speedKmh;
    const mins = Math.floor(paceMinPerKm);
    const secs = Math.round((paceMinPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const activityLabel = activity.activity_name || activityTypeLabels[activity.activity_type] || activity.activity_type;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            {activityLabel} - GPS-rutt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Hämtar GPS-data från Garmin...</p>
            </div>
          ) : error ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <AlertCircle className="w-12 h-12 opacity-50" />
              <p>{error}</p>
              <p className="text-xs">GPS-data finns inte för alla aktivitetstyper</p>
            </div>
          ) : !routeData || routeData.positions.length < 2 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <MapPin className="w-12 h-12 opacity-50" />
              <p>Ingen GPS-rutt hittades</p>
            </div>
          ) : (
            <>
              {/* Activity Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <MapPin className="w-3 h-3" />
                    Distans
                  </div>
                  <p className="text-lg font-bold">
                    {routeData.totalDistanceKm > 0 
                      ? routeData.totalDistanceKm.toFixed(2) 
                      : activity.distance_meters 
                        ? (activity.distance_meters / 1000).toFixed(2)
                        : '0'} km
                  </p>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <Timer className="w-3 h-3" />
                    Tid
                  </div>
                  <p className="text-lg font-bold">
                    {formatDuration(activity.duration_seconds)}
                  </p>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <Gauge className="w-3 h-3" />
                    Snitt
                  </div>
                  <p className="text-lg font-bold">
                    {routeData.averageSpeedKmh > 0 
                      ? routeData.averageSpeedKmh.toFixed(1)
                      : activity.average_speed 
                        ? (activity.average_speed * 3.6).toFixed(1)
                        : '0'} km/h
                  </p>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <Navigation className="w-3 h-3" />
                    Tempo
                  </div>
                  <p className="text-lg font-bold">
                    {formatPace(routeData.averageSpeedKmh > 0 
                      ? routeData.averageSpeedKmh 
                      : (activity.average_speed || 0) * 3.6)} /km
                  </p>
                </div>
              </div>

              {/* Extra Garmin metrics */}
              <div className="grid grid-cols-3 gap-3">
                {activity.average_heart_rate && (
                  <div className="bg-red-500/10 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-red-500 text-xs mb-1">
                      <Heart className="w-3 h-3" />
                      Puls
                    </div>
                    <p className="text-sm font-bold">
                      {activity.average_heart_rate} bpm
                      {activity.max_heart_rate && (
                        <span className="text-xs text-muted-foreground ml-1">(max {activity.max_heart_rate})</span>
                      )}
                    </p>
                  </div>
                )}
                
                {activity.elevation_gain && activity.elevation_gain > 0 && (
                  <div className="bg-green-500/10 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-green-500 text-xs mb-1">
                      <Mountain className="w-3 h-3" />
                      Höjdmeter
                    </div>
                    <p className="text-sm font-bold">
                      {activity.elevation_gain.toFixed(0)} m
                    </p>
                  </div>
                )}
                
                {activity.calories && (
                  <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-orange-500 text-xs mb-1">
                      <Flame className="w-3 h-3" />
                      Kalorier
                    </div>
                    <p className="text-sm font-bold">
                      {activity.calories} kcal
                    </p>
                  </div>
                )}
              </div>

              {/* Map */}
              {!mapboxToken ? (
                <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div 
                  ref={mapContainer} 
                  className="h-64 md:h-80 rounded-lg overflow-hidden"
                />
              )}
            </>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Stäng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
