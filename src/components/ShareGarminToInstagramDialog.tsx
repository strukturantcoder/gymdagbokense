import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Instagram, Copy, Download, Share2, Loader2, Moon, Sun, Coins, Zap, MapPin, Heart, Mountain, Timer, Flame, Watch } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type ThemeType = 'dark' | 'light' | 'gold' | 'neon';

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
  start_time?: string;
}

interface RoutePosition {
  latitude: number;
  longitude: number;
}

interface RouteData {
  positions: RoutePosition[];
  totalDistanceKm: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
}

interface ShareGarminToInstagramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: GarminActivity;
  routeData?: RouteData | null;
}

const activityTypeLabels: Record<string, string> = {
  running: 'Löpning',
  cycling: 'Cykling',
  swimming: 'Simning',
  walking: 'Promenad',
  hiking: 'Vandring',
  other: 'Aktivitet'
};

const activityEmojis: Record<string, string> = {
  running: '🏃',
  cycling: '🚴',
  swimming: '🏊',
  walking: '🚶',
  hiking: '🥾',
  other: '💪'
};

const themes: Record<ThemeType, { label: string; icon: typeof Moon; preview: string }> = {
  dark: { label: 'Mörkt', icon: Moon, preview: 'from-zinc-900 to-zinc-800 border-orange-500/30' },
  light: { label: 'Ljust', icon: Sun, preview: 'from-orange-50 to-amber-100 border-orange-400' },
  gold: { label: 'Guld', icon: Coins, preview: 'from-amber-500 to-orange-500 border-yellow-300' },
  neon: { label: 'Neon', icon: Zap, preview: 'from-violet-950 to-cyan-950 border-cyan-400' },
};

export default function ShareGarminToInstagramDialog({ 
  open, 
  onOpenChange, 
  activity,
  routeData
}: ShareGarminToInstagramDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('dark');
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [localRouteData, setLocalRouteData] = useState<RouteData | null>(routeData || null);
  
  const activityLabel = activity.activity_name || activityTypeLabels[activity.activity_type] || activity.activity_type;
  const emoji = activityEmojis[activity.activity_type] || '💪';

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes} min`;
  };

  const formatDistance = (meters: number | null) => {
    if (!meters) return null;
    return (meters / 1000).toFixed(2);
  };

  const formatPace = (speedKmh: number) => {
    if (speedKmh <= 0) return '--:--';
    const paceMinPerKm = 60 / speedKmh;
    const mins = Math.floor(paceMinPerKm);
    const secs = Math.round((paceMinPerKm - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const generateCaption = () => {
    const lines = [
      `${emoji} ${activityLabel} avklarat!`,
      '',
      activity.duration_seconds ? `⏱️ ${formatDuration(activity.duration_seconds)}` : '',
      activity.distance_meters ? `📍 ${formatDistance(activity.distance_meters)} km` : '',
      activity.average_heart_rate ? `❤️ ${activity.average_heart_rate} bpm snitt` : '',
      activity.elevation_gain && activity.elevation_gain > 0 ? `⛰️ ${activity.elevation_gain.toFixed(0)} m höjdmeter` : '',
      activity.calories ? `🔥 ${activity.calories} kcal` : '',
      '',
      '⌚ Trackat med Garmin',
      '#garmin #träning #kondition #gymdagboken #fitness'
    ].filter(Boolean);
    return lines.join('\n');
  };

  const [caption, setCaption] = useState(() => generateCaption());

  useEffect(() => {
    if (open) {
      setCaption(generateCaption());
      // Try to fetch route data if not provided
      if (!routeData && !localRouteData) {
        fetchRouteData();
      }
    }
  }, [open, activity]);

  const fetchRouteData = async () => {
    setIsLoadingRoute(true);
    try {
      const { data, error } = await supabase.functions.invoke('garmin-fetch-route', {
        body: { garminActivityId: activity.garmin_activity_id }
      });
      if (!error && data?.route) {
        setLocalRouteData(data.route);
      }
    } catch (err) {
      console.log('Could not fetch route data');
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Text kopierad till urklipp!');
    } catch {
      toast.error('Kunde inte kopiera texten');
    }
  };

  const generateShareImage = (theme: ThemeType): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error('Canvas not found'));
        return;
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not found'));
        return;
      }

      canvas.width = 1080;
      canvas.height = 1920;

      const themeColors = {
        dark: {
          bg1: '#0a0a0a', bg2: '#171717', bg3: '#0f0f0f',
          accent: { r: 249, g: 115, b: 22 },
          text: '#ffffff', textSecondary: 'rgba(255,255,255,0.7)',
          cardBg: 'rgba(249, 115, 22, 0.12)', cardBorder: 'rgba(249, 115, 22, 0.3)',
          routeLine: '#f97316', routeGlow: 'rgba(249, 115, 22, 0.3)'
        },
        light: {
          bg1: '#fff7ed', bg2: '#ffedd5', bg3: '#fed7aa',
          accent: { r: 234, g: 88, b: 12 },
          text: '#1c1917', textSecondary: 'rgba(28,25,23,0.7)',
          cardBg: 'rgba(234, 88, 12, 0.12)', cardBorder: 'rgba(234, 88, 12, 0.3)',
          routeLine: '#ea580c', routeGlow: 'rgba(234, 88, 12, 0.3)'
        },
        gold: {
          bg1: '#78350f', bg2: '#92400e', bg3: '#b45309',
          accent: { r: 253, g: 230, b: 138 },
          text: '#fef3c7', textSecondary: 'rgba(254,243,199,0.8)',
          cardBg: 'rgba(253, 230, 138, 0.2)', cardBorder: 'rgba(253, 230, 138, 0.5)',
          routeLine: '#fde047', routeGlow: 'rgba(253, 230, 138, 0.4)'
        },
        neon: {
          bg1: '#020617', bg2: '#0f172a', bg3: '#1e293b',
          accent: { r: 34, g: 211, b: 238 },
          text: '#ffffff', textSecondary: 'rgba(255,255,255,0.7)',
          cardBg: 'rgba(34, 211, 238, 0.15)', cardBorder: 'rgba(34, 211, 238, 0.4)',
          routeLine: '#22d3ee', routeGlow: 'rgba(34, 211, 238, 0.4)'
        }
      };

      const colors = themeColors[theme];
      const accentRgba = (alpha: number) => `rgba(${colors.accent.r}, ${colors.accent.g}, ${colors.accent.b}, ${alpha})`;

      // Background
      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGradient.addColorStop(0, colors.bg1);
      bgGradient.addColorStop(0.4, colors.bg2);
      bgGradient.addColorStop(0.6, colors.bg3);
      bgGradient.addColorStop(1, colors.bg1);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Noise texture
      for (let i = 0; i < 6000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const baseColor = theme === 'light' ? '0,0,0' : '255,255,255';
        ctx.fillStyle = `rgba(${baseColor}, ${Math.random() * 0.025})`;
        ctx.fillRect(x, y, 1, 1);
      }

      // Glows
      const topGlow = ctx.createRadialGradient(canvas.width / 2, 350, 0, canvas.width / 2, 350, 500);
      topGlow.addColorStop(0, accentRgba(0.3));
      topGlow.addColorStop(0.4, accentRgba(0.1));
      topGlow.addColorStop(1, accentRgba(0));
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Corners
      ctx.strokeStyle = accentRgba(0.25);
      ctx.lineWidth = 3;
      [[60, 150, 60, 60, 150, 60], [canvas.width - 60, 150, canvas.width - 60, 60, canvas.width - 150, 60],
       [60, canvas.height - 150, 60, canvas.height - 60, 150, canvas.height - 60],
       [canvas.width - 60, canvas.height - 150, canvas.width - 60, canvas.height - 60, canvas.width - 150, canvas.height - 60]
      ].forEach(([x1, y1, x2, y2, x3, y3]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.stroke();
      });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Top label with Garmin branding
      ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = accentRgba(0.7);
      ctx.fillText('⌚ GARMIN ACTIVITY', canvas.width / 2, 200);

      // Emoji
      const emojiY = 380;
      const emojiGlow = ctx.createRadialGradient(canvas.width / 2, emojiY, 0, canvas.width / 2, emojiY, 150);
      emojiGlow.addColorStop(0, accentRgba(0.35));
      emojiGlow.addColorStop(0.5, accentRgba(0.1));
      emojiGlow.addColorStop(1, accentRgba(0));
      ctx.fillStyle = emojiGlow;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, emojiY, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '150px Arial, sans-serif';
      ctx.fillText(emoji, canvas.width / 2, emojiY);

      // Activity name
      const headerY = 560;
      ctx.font = 'bold 70px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = theme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)';
      ctx.fillText('AVKLARAT!', canvas.width / 2 + 4, headerY + 4);

      const textGrad = ctx.createLinearGradient(200, headerY - 50, canvas.width - 200, headerY + 50);
      if (theme === 'neon') {
        textGrad.addColorStop(0, '#22d3ee');
        textGrad.addColorStop(0.5, '#a5f3fc');
        textGrad.addColorStop(1, '#06b6d4');
      } else {
        textGrad.addColorStop(0, '#f97316');
        textGrad.addColorStop(0.5, '#fed7aa');
        textGrad.addColorStop(1, '#ea580c');
      }
      ctx.fillStyle = textGrad;
      ctx.fillText('AVKLARAT!', canvas.width / 2, headerY);

      // Activity type label
      const activityTypeName = activityTypeLabels[activity.activity_type] || activity.activity_type;
      ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = colors.textSecondary;
      ctx.fillText(activityTypeName.toUpperCase(), canvas.width / 2, 650);

      // Draw route if available
      const route = localRouteData || routeData;
      let mapEndY = 650;
      
      if (route && route.positions.length >= 2) {
        const mapX = 100;
        const mapY = 720;
        const mapWidth = canvas.width - 200;
        const mapHeight = 450;
        
        // Map background
        ctx.fillStyle = colors.cardBg;
        ctx.beginPath();
        ctx.roundRect(mapX, mapY, mapWidth, mapHeight, 20);
        ctx.fill();
        ctx.strokeStyle = colors.cardBorder;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Calculate bounds
        const lats = route.positions.map(p => p.latitude);
        const lons = route.positions.map(p => p.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLon = Math.min(...lons);
        const maxLon = Math.max(...lons);
        
        const padding = 40;
        const scaleX = (mapWidth - padding * 2) / (maxLon - minLon || 1);
        const scaleY = (mapHeight - padding * 2) / (maxLat - minLat || 1);
        const scale = Math.min(scaleX, scaleY);

        const offsetX = mapX + padding + ((mapWidth - padding * 2) - (maxLon - minLon) * scale) / 2;
        const offsetY = mapY + padding + ((mapHeight - padding * 2) - (maxLat - minLat) * scale) / 2;

        // Draw route line with glow
        ctx.shadowColor = colors.routeGlow;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = colors.routeLine;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        route.positions.forEach((pos, i) => {
          const x = offsetX + (pos.longitude - minLon) * scale;
          const y = offsetY + (maxLat - pos.latitude) * scale;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Start/End markers
        const startPos = route.positions[0];
        const endPos = route.positions[route.positions.length - 1];
        const startX = offsetX + (startPos.longitude - minLon) * scale;
        const startY = offsetY + (maxLat - startPos.latitude) * scale;
        const endX = offsetX + (endPos.longitude - minLon) * scale;
        const endY = offsetY + (maxLat - endPos.latitude) * scale;

        // Start marker (green)
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(startX, startY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px system-ui';
        ctx.fillText('S', startX, startY + 1);

        // End marker (red)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(endX, endY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText('M', endX, endY + 1);

        mapEndY = mapY + mapHeight + 30;
      }

      // Stats card
      const cardY = route && route.positions.length >= 2 ? mapEndY : 720;
      let statCount = 0;
      if (activity.duration_seconds) statCount++;
      if (activity.distance_meters) statCount++;
      if (activity.average_heart_rate) statCount++;
      if (activity.elevation_gain && activity.elevation_gain > 0) statCount++;
      if (activity.calories) statCount++;
      
      const cardHeight = Math.max(150, 60 + statCount * 70);

      ctx.fillStyle = colors.cardBg;
      ctx.beginPath();
      ctx.roundRect(100, cardY, canvas.width - 200, cardHeight, 30);
      ctx.fill();
      ctx.strokeStyle = colors.cardBorder;
      ctx.lineWidth = 2;
      ctx.stroke();

      let yPos = cardY + 60;
      ctx.font = '38px system-ui, -apple-system, sans-serif';

      if (activity.duration_seconds) {
        ctx.fillStyle = accentRgba(0.9);
        ctx.fillText('⏱', canvas.width / 2 - 130, yPos);
        ctx.fillStyle = colors.text;
        ctx.fillText(formatDuration(activity.duration_seconds) || '', canvas.width / 2 + 30, yPos);
        yPos += 70;
      }

      if (activity.distance_meters) {
        ctx.fillStyle = accentRgba(0.9);
        ctx.fillText('📍', canvas.width / 2 - 130, yPos);
        ctx.fillStyle = colors.text;
        ctx.fillText(`${formatDistance(activity.distance_meters)} km`, canvas.width / 2 + 30, yPos);
        yPos += 70;
      }

      if (activity.average_heart_rate) {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('❤️', canvas.width / 2 - 130, yPos);
        ctx.fillStyle = colors.text;
        ctx.fillText(`${activity.average_heart_rate} bpm snitt`, canvas.width / 2 + 30, yPos);
        yPos += 70;
      }

      if (activity.elevation_gain && activity.elevation_gain > 0) {
        ctx.fillStyle = '#22c55e';
        ctx.fillText('⛰️', canvas.width / 2 - 130, yPos);
        ctx.fillStyle = colors.text;
        ctx.fillText(`${activity.elevation_gain.toFixed(0)} m höjd`, canvas.width / 2 + 30, yPos);
        yPos += 70;
      }

      if (activity.calories) {
        ctx.fillStyle = '#f97316';
        ctx.fillText('🔥', canvas.width / 2 - 130, yPos);
        ctx.fillStyle = colors.text;
        ctx.fillText(`${activity.calories} kcal`, canvas.width / 2 + 30, yPos);
      }

      // Branding
      ctx.fillStyle = accentRgba(0.7);
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillText('POWERED BY', canvas.width / 2, canvas.height - 200);
      ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = colors.text;
      ctx.fillText('GYMDAGBOKEN', canvas.width / 2, canvas.height - 140);

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create blob'));
      }, 'image/png', 1.0);
    });
  };

  const downloadImage = async () => {
    try {
      const blob = await generateShareImage(selectedTheme);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'garmin-activity-share.png';
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Bild nedladdad!');
    } catch (error) {
      toast.error('Kunde inte skapa bilden');
    }
  };

  const shareNative = async () => {
    setIsSharing(true);
    try {
      const blob = await generateShareImage(selectedTheme);
      const file = new File([blob], 'garmin-activity-share.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: activityLabel,
          text: caption
        });
        toast.success('Delat!');
        onOpenChange(false);
      } else {
        await navigator.clipboard.writeText(caption);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'garmin-activity-share.png';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Bild nedladdad och text kopierad!', { duration: 4000 });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') toast.error('Kunde inte dela');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            Dela till Instagram
          </DialogTitle>
          <DialogDescription>
            Skapa en snygg bild av din Garmin-aktivitet{routeData || localRouteData ? ' med rutt' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Theme selector */}
          <div>
            <label className="text-sm font-medium mb-2 block">Välj tema</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(themes) as [ThemeType, typeof themes.dark][]).map(([key, { label, icon: Icon, preview }]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTheme(key)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedTheme === key 
                      ? 'border-primary ring-2 ring-primary/20' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`h-8 rounded bg-gradient-to-br ${preview} mb-2`} />
                  <div className="flex items-center justify-center gap-1 text-xs">
                    <Icon className="w-3 h-3" />
                    {label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Route loading indicator */}
          {isLoadingRoute && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Hämtar ruttdata...
            </div>
          )}

          {/* Route indicator */}
          {(routeData || localRouteData) && !isLoadingRoute && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <MapPin className="w-4 h-4" />
              GPS-rutt inkluderas i bilden
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="text-sm font-medium mb-2 block">Bildtext</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[120px] text-sm"
              placeholder="Skriv din bildtext här..."
            />
            <Button variant="ghost" size="sm" onClick={copyCaption} className="mt-2">
              <Copy className="w-4 h-4 mr-2" />
              Kopiera text
            </Button>
          </div>

          {/* Preview info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Watch className="w-4 h-4" />
              Aktivitetsdata
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              {activity.duration_seconds && (
                <div className="flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  {formatDuration(activity.duration_seconds)}
                </div>
              )}
              {activity.distance_meters && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {formatDistance(activity.distance_meters)} km
                </div>
              )}
              {activity.average_heart_rate && (
                <div className="flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  {activity.average_heart_rate} bpm
                </div>
              )}
              {activity.elevation_gain && activity.elevation_gain > 0 && (
                <div className="flex items-center gap-1">
                  <Mountain className="w-3 h-3" />
                  {activity.elevation_gain.toFixed(0)} m
                </div>
              )}
              {activity.calories && (
                <div className="flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  {activity.calories} kcal
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button onClick={shareNative} disabled={isSharing} className="w-full">
              {isSharing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Skapar bild...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Dela
                </>
              )}
            </Button>
            <Button variant="outline" onClick={downloadImage} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Ladda ner bild
            </Button>
          </div>
        </div>

        {/* Hidden canvas for image generation */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
