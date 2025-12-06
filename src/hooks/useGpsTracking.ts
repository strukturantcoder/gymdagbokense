import { useState, useEffect, useRef, useCallback } from 'react';

interface GpsPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed: number | null;
}

interface GpsStats {
  totalDistanceKm: number;
  currentSpeedKmh: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  positions: GpsPosition[];
}

// Haversine formula to calculate distance between two GPS points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function recalculateStats(positions: GpsPosition[], startTime: number | null): Omit<GpsStats, 'positions'> {
  if (positions.length < 2) {
    return { totalDistanceKm: 0, currentSpeedKmh: 0, averageSpeedKmh: 0, maxSpeedKmh: 0 };
  }

  let totalDistance = 0;
  let maxSpeed = 0;

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    
    if (curr.accuracy < 50 && prev.accuracy < 50) {
      const segmentDistance = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000;
      const segmentSpeed = timeDiff > 0 ? (segmentDistance / timeDiff) * 3600 : 0;
      
      if (segmentSpeed < 50) {
        totalDistance += segmentDistance;
      }
    }

    if (curr.speed !== null) {
      const speedKmh = curr.speed * 3.6;
      if (speedKmh > maxSpeed && speedKmh < 50) {
        maxSpeed = speedKmh;
      }
    }
  }

  const lastPos = positions[positions.length - 1];
  let currentSpeed = 0;
  if (lastPos.speed !== null) {
    currentSpeed = Math.min(lastPos.speed * 3.6, 50);
  }

  const elapsedHours = startTime ? (Date.now() - startTime) / 3600000 : 0;
  const avgSpeed = elapsedHours > 0 ? Math.min(totalDistance / elapsedHours, 50) : 0;

  return { totalDistanceKm: totalDistance, currentSpeedKmh: currentSpeed, averageSpeedKmh: avgSpeed, maxSpeedKmh: maxSpeed };
}

export function useGpsTracking(isActive: boolean, sessionId?: string) {
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<GpsStats>({
    totalDistanceKm: 0,
    currentSpeedKmh: 0,
    averageSpeedKmh: 0,
    maxSpeedKmh: 0,
    positions: [],
  });
  
  const watchIdRef = useRef<number | null>(null);
  const positionsRef = useRef<GpsPosition[]>([]);
  const startTimeRef = useRef<number | null>(null);

  // Load persisted positions on mount
  useEffect(() => {
    if (sessionId) {
      const stored = localStorage.getItem(`gps_positions_${sessionId}`);
      const storedStartTime = localStorage.getItem(`gps_start_${sessionId}`);
      if (stored) {
        try {
          const positions = JSON.parse(stored) as GpsPosition[];
          positionsRef.current = positions;
          startTimeRef.current = storedStartTime ? parseInt(storedStartTime) : Date.now();
          const recalc = recalculateStats(positions, startTimeRef.current);
          setStats({ ...recalc, positions });
        } catch (e) {
          console.error('Failed to parse stored GPS positions:', e);
        }
      }
    }
  }, [sessionId]);

  // Persist positions when they change
  const persistPositions = useCallback(() => {
    if (sessionId && positionsRef.current.length > 0) {
      localStorage.setItem(`gps_positions_${sessionId}`, JSON.stringify(positionsRef.current));
      if (startTimeRef.current) {
        localStorage.setItem(`gps_start_${sessionId}`, startTimeRef.current.toString());
      }
    }
  }, [sessionId]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS stöds inte av din enhet');
      return;
    }

    setError(null);
    
    // Only reset if no existing positions
    if (positionsRef.current.length === 0) {
      startTimeRef.current = Date.now();
      if (sessionId) {
        localStorage.setItem(`gps_start_${sessionId}`, startTimeRef.current.toString());
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setHasPermission(true);
        setIsTracking(true);
        
        const newPosition: GpsPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          speed: position.coords.speed,
        };

        positionsRef.current.push(newPosition);
        const recalc = recalculateStats(positionsRef.current, startTimeRef.current);
        
        setStats({
          ...recalc,
          positions: [...positionsRef.current],
        });

        // Persist after each position update
        persistPositions();
      },
      (err) => {
        console.error('GPS error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setHasPermission(false);
          setError('GPS-åtkomst nekad. Aktivera platsåtkomst i inställningarna.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Kan inte hämta position. Kontrollera GPS-signalen.');
        } else if (err.code === err.TIMEOUT) {
          setError('GPS-förfrågan tog för lång tid.');
        }
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, [sessionId, persistPositions]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const resetStats = useCallback(() => {
    positionsRef.current = [];
    startTimeRef.current = null;
    setStats({
      totalDistanceKm: 0,
      currentSpeedKmh: 0,
      averageSpeedKmh: 0,
      maxSpeedKmh: 0,
      positions: [],
    });
    // Clear persisted data
    if (sessionId) {
      localStorage.removeItem(`gps_positions_${sessionId}`);
      localStorage.removeItem(`gps_start_${sessionId}`);
    }
  }, [sessionId]);

  const clearPersistedData = useCallback(() => {
    if (sessionId) {
      localStorage.removeItem(`gps_positions_${sessionId}`);
      localStorage.removeItem(`gps_start_${sessionId}`);
    }
  }, [sessionId]);

  // Auto start/stop based on isActive prop
  useEffect(() => {
    if (isActive) {
      startTracking();
    } else {
      stopTracking();
    }
    
    return () => {
      stopTracking();
    };
  }, [isActive, startTracking, stopTracking]);

  return {
    isTracking,
    hasPermission,
    error,
    stats,
    startTracking,
    stopTracking,
    resetStats,
    clearPersistedData,
  };
}
