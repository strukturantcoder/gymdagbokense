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
import { MapPin, Gauge, TrendingUp, Timer, Navigation, Loader2 } from 'lucide-react';
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

interface RouteMapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardioLogId?: string;
  routeData?: RouteData;
  activityLabel?: string;
  durationMinutes?: number;
}

export default function RouteMapDialog({
  open,
  onOpenChange,
  cardioLogId,
  routeData: initialRouteData,
  activityLabel = 'Konditionspass',
  durationMinutes = 0,
}: RouteMapDialogProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(initialRouteData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // Fetch Mapbox token from edge function
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

  // Fetch route data if cardioLogId is provided
  useEffect(() => {
    const fetchRoute = async () => {
      if (!cardioLogId || initialRouteData) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('cardio_routes')
          .select('*')
          .eq('cardio_log_id', cardioLogId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const routeDataParsed = data.route_data as unknown as { positions: RoutePosition[] };
          setRouteData({
            positions: routeDataParsed?.positions || [],
            totalDistanceKm: Number(data.total_distance_km),
            averageSpeedKmh: Number(data.average_speed_kmh),
            maxSpeedKmh: Number(data.max_speed_kmh),
          });
        }
      } catch (err) {
        console.error('Error fetching route:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchRoute();
    }
  }, [open, cardioLogId, initialRouteData]);

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

  const formatPace = (speedKmh: number) => {
    if (speedKmh <= 0) return '--:--';
    const paceMinPerKm = 60 / speedKmh;
    const mins = Math.floor(paceMinPerKm);
    const secs = Math.round((paceMinPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            {activityLabel} - GPS-rutt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !routeData || routeData.positions.length < 2 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Ingen GPS-data tillgänglig</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <MapPin className="w-3 h-3" />
                    Distans
                  </div>
                  <p className="text-lg font-bold">
                    {routeData.totalDistanceKm.toFixed(2)} km
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <Timer className="w-3 h-3" />
                    Tid
                  </div>
                  <p className="text-lg font-bold">
                    {durationMinutes} min
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <Gauge className="w-3 h-3" />
                    Snitt
                  </div>
                  <p className="text-lg font-bold">
                    {routeData.averageSpeedKmh.toFixed(1)} km/h
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <TrendingUp className="w-3 h-3" />
                    Tempo
                  </div>
                  <p className="text-lg font-bold">
                    {formatPace(routeData.averageSpeedKmh)} /km
                  </p>
                </div>
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
