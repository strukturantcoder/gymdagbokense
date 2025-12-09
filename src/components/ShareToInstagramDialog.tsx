import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Instagram, Copy, Download, Share2, Timer, Trophy, Loader2, Flame, Target, Moon, Sun, Coins, Zap } from 'lucide-react';
import { toast } from 'sonner';

type ThemeType = 'dark' | 'light' | 'gold' | 'neon';

interface WorkoutShareData {
  dayName: string;
  duration?: number;
  exerciseCount: number;
  totalSets: number;
  newPBs?: string[];
  programName?: string;
}

interface CardioShareData {
  activityType: string;
  duration: number;
  distance?: number;
  calories?: number;
}

interface ShareToInstagramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutData?: WorkoutShareData;
  cardioData?: CardioShareData;
}

const themes: Record<ThemeType, { label: string; icon: typeof Moon; preview: string }> = {
  dark: { label: 'Mörkt', icon: Moon, preview: 'from-zinc-900 to-zinc-800 border-orange-500/30' },
  light: { label: 'Ljust', icon: Sun, preview: 'from-orange-50 to-amber-100 border-orange-400' },
  gold: { label: 'Guld', icon: Coins, preview: 'from-amber-500 to-orange-500 border-yellow-300' },
  neon: { label: 'Neon', icon: Zap, preview: 'from-violet-950 to-cyan-950 border-cyan-400' },
};

export default function ShareToInstagramDialog({ 
  open, 
  onOpenChange, 
  workoutData,
  cardioData 
}: ShareToInstagramDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('dark');
  
  const generateWorkoutCaption = () => {
    if (!workoutData) return '';
    const lines = [
      `💪 ${workoutData.dayName} avklarat!`,
      '',
      workoutData.duration ? `⏱️ ${workoutData.duration} minuter` : '',
      `🎯 ${workoutData.exerciseCount} övningar`,
      `📊 ${workoutData.totalSets} set totalt`,
      workoutData.newPBs && workoutData.newPBs.length > 0 
        ? `🏆 Nytt personbästa: ${workoutData.newPBs.join(', ')}` 
        : '',
      '',
      '#träning #gym #styrketräning #gymdagboken #fitness #workout'
    ].filter(Boolean);
    return lines.join('\n');
  };

  const generateCardioCaption = () => {
    if (!cardioData) return '';
    const activityEmoji = {
      'Löpning': '🏃',
      'Cykling': '🚴',
      'Simning': '🏊',
      'Promenad': '🚶',
      'Golf': '⛳',
      'Övrigt': '🏋️'
    }[cardioData.activityType] || '🏃';
    
    const lines = [
      `${activityEmoji} ${cardioData.activityType} avklarat!`,
      '',
      `⏱️ ${cardioData.duration} minuter`,
      cardioData.distance ? `📍 ${cardioData.distance} km` : '',
      cardioData.calories ? `🔥 ${cardioData.calories} kcal` : '',
      '',
      '#kondition #cardio #träning #gymdagboken #fitness'
    ].filter(Boolean);
    return lines.join('\n');
  };

  const [caption, setCaption] = useState(() => 
    workoutData ? generateWorkoutCaption() : generateCardioCaption()
  );

  useEffect(() => {
    if (open) {
      setCaption(workoutData ? generateWorkoutCaption() : generateCardioCaption());
    }
  }, [open, workoutData, cardioData]);

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
          cardBg: 'rgba(249, 115, 22, 0.12)', cardBorder: 'rgba(249, 115, 22, 0.3)'
        },
        light: {
          bg1: '#fff7ed', bg2: '#ffedd5', bg3: '#fed7aa',
          accent: { r: 234, g: 88, b: 12 },
          text: '#1c1917', textSecondary: 'rgba(28,25,23,0.7)',
          cardBg: 'rgba(234, 88, 12, 0.12)', cardBorder: 'rgba(234, 88, 12, 0.3)'
        },
        gold: {
          bg1: '#78350f', bg2: '#92400e', bg3: '#b45309',
          accent: { r: 253, g: 230, b: 138 },
          text: '#fef3c7', textSecondary: 'rgba(254,243,199,0.8)',
          cardBg: 'rgba(253, 230, 138, 0.2)', cardBorder: 'rgba(253, 230, 138, 0.5)'
        },
        neon: {
          bg1: '#020617', bg2: '#0f172a', bg3: '#1e293b',
          accent: { r: 34, g: 211, b: 238 },
          text: '#ffffff', textSecondary: 'rgba(255,255,255,0.7)',
          cardBg: 'rgba(34, 211, 238, 0.15)', cardBorder: 'rgba(34, 211, 238, 0.4)'
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

      // Noise
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

      const ambientGlow = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, 700);
      ambientGlow.addColorStop(0, accentRgba(0.08));
      ambientGlow.addColorStop(1, accentRgba(0));
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Neon extra glows
      if (theme === 'neon') {
        const neonGlow1 = ctx.createRadialGradient(150, 700, 0, 150, 700, 500);
        neonGlow1.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
        neonGlow1.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = neonGlow1;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const neonGlow2 = ctx.createRadialGradient(canvas.width - 150, 1300, 0, canvas.width - 150, 1300, 500);
        neonGlow2.addColorStop(0, 'rgba(236, 72, 153, 0.2)');
        neonGlow2.addColorStop(1, 'rgba(236, 72, 153, 0)');
        ctx.fillStyle = neonGlow2;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Geometric lines
      ctx.strokeStyle = accentRgba(0.08);
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 100 + i * 250);
        ctx.lineTo(canvas.width, 150 + i * 250);
        ctx.stroke();
      }

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

      // Top label
      ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = accentRgba(0.7);
      ctx.fillText('★ WORKOUT COMPLETE ★', canvas.width / 2, 200);

      if (workoutData) {
        const emojiY = 420;
        const emojiGlow = ctx.createRadialGradient(canvas.width / 2, emojiY, 0, canvas.width / 2, emojiY, 180);
        emojiGlow.addColorStop(0, accentRgba(0.35));
        emojiGlow.addColorStop(0.5, accentRgba(0.1));
        emojiGlow.addColorStop(1, accentRgba(0));
        ctx.fillStyle = emojiGlow;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, emojiY, 180, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '180px Arial, sans-serif';
        ctx.fillText('💪', canvas.width / 2, emojiY);

        const headerY = 620;
        ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = theme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)';
        ctx.fillText('AVKLARAT!', canvas.width / 2 + 4, headerY + 4);

        const textGrad = ctx.createLinearGradient(200, headerY - 50, canvas.width - 200, headerY + 50);
        if (theme === 'neon') {
          textGrad.addColorStop(0, '#22d3ee');
          textGrad.addColorStop(0.3, '#a5f3fc');
          textGrad.addColorStop(0.5, '#22d3ee');
          textGrad.addColorStop(0.7, '#a5f3fc');
          textGrad.addColorStop(1, '#06b6d4');
        } else {
          textGrad.addColorStop(0, '#f97316');
          textGrad.addColorStop(0.3, '#fed7aa');
          textGrad.addColorStop(0.5, '#f97316');
          textGrad.addColorStop(0.7, '#fed7aa');
          textGrad.addColorStop(1, '#ea580c');
        }
        ctx.fillStyle = textGrad;
        ctx.fillText('AVKLARAT!', canvas.width / 2, headerY);

        const dayName = workoutData.dayName.length > 22 ? workoutData.dayName.substring(0, 20) + '...' : workoutData.dayName;
        ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = colors.textSecondary;
        ctx.fillText(dayName.toUpperCase(), canvas.width / 2, 720);

        const cardY = 800;
        const hasPBs = workoutData.newPBs && workoutData.newPBs.length > 0;
        const cardHeight = hasPBs ? 480 : 380;

        ctx.fillStyle = colors.cardBg;
        ctx.beginPath();
        ctx.roundRect(100, cardY, canvas.width - 200, cardHeight, 30);
        ctx.fill();
        ctx.strokeStyle = colors.cardBorder;
        ctx.lineWidth = 2;
        ctx.stroke();

        let yPos = cardY + 90;
        ctx.font = '42px system-ui, -apple-system, sans-serif';

        if (workoutData.duration) {
          ctx.fillStyle = accentRgba(0.9);
          ctx.fillText('⏱', canvas.width / 2 - 140, yPos);
          ctx.fillStyle = colors.text;
          ctx.fillText(`${workoutData.duration} minuter`, canvas.width / 2 + 30, yPos);
          yPos += 85;
        }

        ctx.fillStyle = accentRgba(0.9);
        ctx.fillText('🎯', canvas.width / 2 - 140, yPos);
        ctx.fillStyle = colors.text;
        ctx.fillText(`${workoutData.exerciseCount} övningar`, canvas.width / 2 + 30, yPos);
        yPos += 85;

        ctx.fillStyle = accentRgba(0.9);
        ctx.fillText('📊', canvas.width / 2 - 140, yPos);
        ctx.fillStyle = colors.text;
        ctx.fillText(`${workoutData.totalSets} set totalt`, canvas.width / 2 + 30, yPos);

        if (hasPBs) {
          yPos += 100;
          ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
          ctx.beginPath();
          ctx.roundRect(180, yPos - 40, canvas.width - 360, 80, 40);
          ctx.fill();
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 38px system-ui, -apple-system, sans-serif';
          ctx.fillText('🏆 NYTT PERSONBÄSTA!', canvas.width / 2, yPos);
        }
      } else if (cardioData) {
        const emoji = {
          'Löpning': '🏃', 'Cykling': '🚴', 'Simning': '🏊',
          'Promenad': '🚶', 'Golf': '⛳', 'Övrigt': '🔥'
        }[cardioData.activityType] || '🔥';

        const emojiY = 420;
        const emojiGlow = ctx.createRadialGradient(canvas.width / 2, emojiY, 0, canvas.width / 2, emojiY, 180);
        emojiGlow.addColorStop(0, accentRgba(0.35));
        emojiGlow.addColorStop(0.5, accentRgba(0.1));
        emojiGlow.addColorStop(1, accentRgba(0));
        ctx.fillStyle = emojiGlow;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, emojiY, 180, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '180px Arial, sans-serif';
        ctx.fillText(emoji, canvas.width / 2, emojiY);

        const headerY = 620;
        ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = theme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.4)';
        ctx.fillText('AVKLARAT!', canvas.width / 2 + 4, headerY + 4);

        const textGrad = ctx.createLinearGradient(200, headerY - 50, canvas.width - 200, headerY + 50);
        if (theme === 'neon') {
          textGrad.addColorStop(0, '#22d3ee');
          textGrad.addColorStop(0.3, '#a5f3fc');
          textGrad.addColorStop(0.5, '#22d3ee');
          textGrad.addColorStop(0.7, '#a5f3fc');
          textGrad.addColorStop(1, '#06b6d4');
        } else {
          textGrad.addColorStop(0, '#f97316');
          textGrad.addColorStop(0.3, '#fed7aa');
          textGrad.addColorStop(0.5, '#f97316');
          textGrad.addColorStop(0.7, '#fed7aa');
          textGrad.addColorStop(1, '#ea580c');
        }
        ctx.fillStyle = textGrad;
        ctx.fillText('AVKLARAT!', canvas.width / 2, headerY);

        ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = colors.textSecondary;
        ctx.fillText(cardioData.activityType.toUpperCase(), canvas.width / 2, 720);

        const cardY = 800;
        let statCount = 1;
        if (cardioData.distance) statCount++;
        if (cardioData.calories) statCount++;
        const cardHeight = 100 + statCount * 85;

        ctx.fillStyle = colors.cardBg;
        ctx.beginPath();
        ctx.roundRect(100, cardY, canvas.width - 200, cardHeight, 30);
        ctx.fill();
        ctx.strokeStyle = colors.cardBorder;
        ctx.lineWidth = 2;
        ctx.stroke();

        let yPos = cardY + 80;
        ctx.font = '42px system-ui, -apple-system, sans-serif';

        ctx.fillStyle = accentRgba(0.9);
        ctx.fillText('⏱', canvas.width / 2 - 120, yPos);
        ctx.fillStyle = colors.text;
        ctx.fillText(`${cardioData.duration} minuter`, canvas.width / 2 + 40, yPos);

        if (cardioData.distance) {
          yPos += 85;
          ctx.fillStyle = accentRgba(0.9);
          ctx.fillText('📍', canvas.width / 2 - 120, yPos);
          ctx.fillStyle = colors.text;
          ctx.fillText(`${cardioData.distance} km`, canvas.width / 2 + 40, yPos);
        }

        if (cardioData.calories) {
          yPos += 85;
          ctx.fillStyle = accentRgba(0.9);
          ctx.fillText('🔥', canvas.width / 2 - 120, yPos);
          ctx.fillStyle = colors.text;
          ctx.fillText(`${cardioData.calories} kcal`, canvas.width / 2 + 40, yPos);
        }
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
      link.download = 'gymdagboken-share.png';
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
      const file = new File([blob], 'gymdagboken-share.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: workoutData ? workoutData.dayName : cardioData?.activityType,
          text: caption
        });
        toast.success('Delat!');
        onOpenChange(false);
      } else {
        await navigator.clipboard.writeText(caption);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'gymdagboken-share.png';
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Dela på Instagram
          </DialogTitle>
          <DialogDescription>
            Välj ett tema och dela ditt träningsresultat!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Theme selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Välj tema</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(themes) as [ThemeType, typeof themes.dark][]).map(([key, theme]) => {
                const Icon = theme.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedTheme(key)}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 bg-gradient-to-br ${theme.preview} ${
                      selectedTheme === key 
                        ? 'ring-2 ring-primary ring-offset-2 scale-105' 
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${key === 'light' ? 'text-orange-700' : 'text-white'}`} />
                    <span className={`text-xs font-medium ${key === 'light' ? 'text-orange-900' : 'text-white'}`}>
                      {theme.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview card */}
          <div className={`rounded-xl p-6 text-center border relative overflow-hidden ${
            selectedTheme === 'dark' ? 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border-orange-500/20' :
            selectedTheme === 'light' ? 'bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 border-orange-400' :
            selectedTheme === 'gold' ? 'bg-gradient-to-br from-amber-600 via-orange-500 to-amber-600 border-yellow-300' :
            'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-cyan-400/50'
          }`}>
            <div className={`absolute inset-0 ${
              selectedTheme === 'dark' ? 'bg-gradient-to-t from-orange-500/10 via-transparent to-orange-500/5' :
              selectedTheme === 'light' ? 'bg-gradient-to-t from-amber-200/30 via-transparent to-orange-200/20' :
              selectedTheme === 'gold' ? 'bg-gradient-to-t from-yellow-400/20 via-transparent to-amber-300/10' :
              'bg-gradient-to-t from-cyan-500/15 via-transparent to-purple-500/10'
            }`} />

            {workoutData && (
              <div className="relative space-y-3">
                <p className={`text-xs font-medium tracking-widest ${
                  selectedTheme === 'light' ? 'text-orange-600/70' :
                  selectedTheme === 'neon' ? 'text-cyan-400/70' : 'text-orange-400/70'
                }`}>★ WORKOUT COMPLETE ★</p>
                <div className="text-4xl py-1">💪</div>
                <p className={`font-bold tracking-wide ${
                  selectedTheme === 'light' ? 'text-orange-600' :
                  selectedTheme === 'neon' ? 'text-cyan-400' : 'text-orange-400'
                }`}>AVKLARAT!</p>
                <p className={`font-bold text-lg ${selectedTheme === 'light' ? 'text-orange-900' : 'text-white'}`}>
                  {workoutData.dayName}
                </p>

                <div className={`rounded-lg p-4 space-y-2 text-sm ${
                  selectedTheme === 'dark' ? 'bg-orange-500/10 border border-orange-500/20' :
                  selectedTheme === 'light' ? 'bg-orange-500/15 border border-orange-400/30' :
                  selectedTheme === 'gold' ? 'bg-yellow-400/20 border border-yellow-300/40' :
                  'bg-cyan-500/15 border border-cyan-500/30'
                }`}>
                  {workoutData.duration && (
                    <p className={`flex items-center justify-center gap-2 ${selectedTheme === 'light' ? 'text-orange-800' : 'text-white/80'}`}>
                      <Timer className={`h-4 w-4 ${
                        selectedTheme === 'light' ? 'text-orange-600' :
                        selectedTheme === 'neon' ? 'text-cyan-400' : 'text-orange-400'
                      }`} />
                      {workoutData.duration} minuter
                    </p>
                  )}
                  <p className={`flex items-center justify-center gap-2 ${selectedTheme === 'light' ? 'text-orange-800' : 'text-white/80'}`}>
                    <Target className={`h-4 w-4 ${
                      selectedTheme === 'light' ? 'text-orange-600' :
                      selectedTheme === 'neon' ? 'text-cyan-400' : 'text-orange-400'
                    }`} />
                    {workoutData.exerciseCount} övningar
                  </p>
                  <p className={selectedTheme === 'light' ? 'text-orange-800' : 'text-white/80'}>
                    📊 {workoutData.totalSets} set totalt
                  </p>
                </div>

                {workoutData.newPBs && workoutData.newPBs.length > 0 && (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-full px-4 py-1.5 inline-flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    <span className="text-yellow-300 font-medium text-sm">Nytt personbästa!</span>
                  </div>
                )}
              </div>
            )}

            {cardioData && (
              <div className="relative space-y-3">
                <p className={`text-xs font-medium tracking-widest ${
                  selectedTheme === 'light' ? 'text-orange-600/70' :
                  selectedTheme === 'neon' ? 'text-cyan-400/70' : 'text-orange-400/70'
                }`}>★ WORKOUT COMPLETE ★</p>
                <div className="text-4xl py-1">
                  {cardioData.activityType === 'Löpning' ? '🏃' :
                   cardioData.activityType === 'Cykling' ? '🚴' :
                   cardioData.activityType === 'Simning' ? '🏊' :
                   cardioData.activityType === 'Promenad' ? '🚶' :
                   cardioData.activityType === 'Golf' ? '⛳' : '🔥'}
                </div>
                <p className={`font-bold tracking-wide ${
                  selectedTheme === 'light' ? 'text-orange-600' :
                  selectedTheme === 'neon' ? 'text-cyan-400' : 'text-orange-400'
                }`}>AVKLARAT!</p>
                <p className={`font-bold text-lg ${selectedTheme === 'light' ? 'text-orange-900' : 'text-white'}`}>
                  {cardioData.activityType}
                </p>

                <div className={`rounded-lg p-4 space-y-2 text-sm ${
                  selectedTheme === 'dark' ? 'bg-orange-500/10 border border-orange-500/20' :
                  selectedTheme === 'light' ? 'bg-orange-500/15 border border-orange-400/30' :
                  selectedTheme === 'gold' ? 'bg-yellow-400/20 border border-yellow-300/40' :
                  'bg-cyan-500/15 border border-cyan-500/30'
                }`}>
                  <p className={`flex items-center justify-center gap-2 ${selectedTheme === 'light' ? 'text-orange-800' : 'text-white/80'}`}>
                    <Timer className={`h-4 w-4 ${
                      selectedTheme === 'light' ? 'text-orange-600' :
                      selectedTheme === 'neon' ? 'text-cyan-400' : 'text-orange-400'
                    }`} />
                    {cardioData.duration} minuter
                  </p>
                  {cardioData.distance && (
                    <p className={selectedTheme === 'light' ? 'text-orange-800' : 'text-white/80'}>
                      📍 {cardioData.distance} km
                    </p>
                  )}
                  {cardioData.calories && (
                    <p className={`flex items-center justify-center gap-2 ${selectedTheme === 'light' ? 'text-orange-800' : 'text-white/80'}`}>
                      <Flame className={`h-4 w-4 ${
                        selectedTheme === 'light' ? 'text-orange-600' :
                        selectedTheme === 'neon' ? 'text-cyan-400' : 'text-orange-400'
                      }`} />
                      {cardioData.calories} kcal
                    </p>
                  )}
                </div>
              </div>
            )}

            <p className={`text-xs mt-4 font-bold tracking-wider ${
              selectedTheme === 'light' ? 'text-orange-800/50' : 'text-white/40'
            }`}>GYMDAGBOKEN</p>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bildtext</label>
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} className="resize-none text-sm" />
            <Button variant="outline" size="sm" onClick={copyCaption} className="w-full">
              <Copy className="h-4 w-4 mr-2" />
              Kopiera text
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadImage} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Ladda ner
            </Button>
            <Button onClick={shareNative} className={`flex-1 font-semibold ${
              selectedTheme === 'neon' 
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' 
                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
            }`} disabled={isSharing}>
              {isSharing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
              Dela
            </Button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
