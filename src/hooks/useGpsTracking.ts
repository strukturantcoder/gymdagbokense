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

export function useGpsTracking(isActive: boolean) {
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

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS stöds inte av din enhet');
      return;
    }

    setError(null);
    positionsRef.current = [];
    startTimeRef.current = Date.now();
    
    setStats({
      totalDistanceKm: 0,
      currentSpeedKmh: 0,
      averageSpeedKmh: 0,
      maxSpeedKmh: 0,
      positions: [],
    });

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

        const positions = positionsRef.current;
        let totalDistance = 0;
        let currentSpeed = 0;
        let maxSpeed = 0;

        // Calculate distance from previous point
        if (positions.length > 0) {
          const lastPos = positions[positions.length - 1];
          
          // Only add distance if accuracy is reasonable (< 50m)
          if (newPosition.accuracy < 50 && lastPos.accuracy < 50) {
            const segmentDistance = calculateDistance(
              lastPos.latitude, lastPos.longitude,
              newPosition.latitude, newPosition.longitude
            );
            
            // Filter out GPS jumps (unrealistic distances)
            const timeDiff = (newPosition.timestamp - lastPos.timestamp) / 1000; // seconds
            const segmentSpeedKmh = (segmentDistance / timeDiff) * 3600;
            
            // Only count if speed is realistic (< 50 km/h for running/cycling)
            if (segmentSpeedKmh < 50) {
              totalDistance = positions.reduce((sum, pos, i) => {
                if (i === 0) return 0;
                const prev = positions[i - 1];
                return sum + calculateDistance(prev.latitude, prev.longitude, pos.latitude, pos.longitude);
              }, 0) + segmentDistance;
            }
          }

          // Calculate current speed
          if (newPosition.speed !== null && newPosition.speed >= 0) {
            currentSpeed = newPosition.speed * 3.6; // m/s to km/h
          } else if (positions.length >= 2) {
            // Calculate from last few positions
            const recentPositions = positions.slice(-3);
            const firstRecent = recentPositions[0];
            const recentDistance = calculateDistance(
              firstRecent.latitude, firstRecent.longitude,
              newPosition.latitude, newPosition.longitude
            );
            const recentTime = (newPosition.timestamp - firstRecent.timestamp) / 1000;
            if (recentTime > 0) {
              currentSpeed = (recentDistance / recentTime) * 3600;
            }
          }
        }

        // Update max speed
        for (const pos of positions) {
          if (pos.speed !== null) {
            const speedKmh = pos.speed * 3.6;
            if (speedKmh > maxSpeed && speedKmh < 50) {
              maxSpeed = speedKmh;
            }
          }
        }
        if (currentSpeed > maxSpeed && currentSpeed < 50) {
          maxSpeed = currentSpeed;
        }

        positionsRef.current.push(newPosition);

        // Calculate average speed
        const elapsedHours = startTimeRef.current 
          ? (Date.now() - startTimeRef.current) / 3600000 
          : 0;
        const avgSpeed = elapsedHours > 0 ? totalDistance / elapsedHours : 0;

        setStats({
          totalDistanceKm: totalDistance,
          currentSpeedKmh: Math.min(currentSpeed, 50),
          averageSpeedKmh: Math.min(avgSpeed, 50),
          maxSpeedKmh: maxSpeed,
          positions: [...positionsRef.current],
        });
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
  }, []);

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
  }, []);

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
  };
}
