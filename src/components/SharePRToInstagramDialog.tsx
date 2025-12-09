import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, Share2, Trophy, Loader2, Dumbbell, Sparkles, Moon, Sun, Coins, Zap } from 'lucide-react';
import { toast } from 'sonner';

type ThemeType = 'dark' | 'light' | 'gold' | 'neon';

interface PRShareData {
  exerciseName: string;
  newWeight: number;
  previousWeight?: number;
  reps?: number;
}

interface SharePRToInstagramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prData: PRShareData;
}

const themes: Record<ThemeType, { label: string; icon: typeof Moon; preview: string }> = {
  dark: { label: 'Mörkt', icon: Moon, preview: 'from-zinc-900 to-zinc-800 border-amber-500/30' },
  light: { label: 'Ljust', icon: Sun, preview: 'from-amber-50 to-orange-100 border-amber-400' },
  gold: { label: 'Guld', icon: Coins, preview: 'from-amber-400 to-yellow-500 border-yellow-300' },
  neon: { label: 'Neon', icon: Zap, preview: 'from-purple-900 to-fuchsia-900 border-pink-500' },
};

export default function SharePRToInstagramDialog({ 
  open, 
  onOpenChange, 
  prData
}: SharePRToInstagramDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeType>('dark');
  
  const generateCaption = () => {
    const improvement = prData.previousWeight 
      ? ` (+${(prData.newWeight - prData.previousWeight).toFixed(1)} kg!)`
      : '';
    
    const lines = [
      `🏆 NYTT PERSONBÄSTA!`,
      '',
      `💪 ${prData.exerciseName}`,
      `⚖️ ${prData.newWeight} kg${improvement}`,
      prData.reps ? `🔄 ${prData.reps} reps` : '',
      '',
      `Nya mål krossas varje dag! 💥`,
      '',
      '#personbästa #pb #newpr #gym #styrketräning #gymdagboken #fitness #progress'
    ].filter(Boolean);
    return lines.join('\n');
  };

  const [caption, setCaption] = useState(generateCaption);

  useEffect(() => {
    if (open) {
      setCaption(generateCaption());
    }
  }, [open, prData]);

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

      // Theme-specific colors
      const themeColors = {
        dark: {
          bg1: '#0a0a0a', bg2: '#1a1a1a', bg3: '#0f0f0f',
          accent: { r: 251, g: 191, b: 36 },
          text: '#ffffff', textSecondary: 'rgba(255,255,255,0.7)',
          cardBg: 'rgba(251, 191, 36, 0.12)', cardBorder: 'rgba(251, 191, 36, 0.4)'
        },
        light: {
          bg1: '#fffbeb', bg2: '#fef3c7', bg3: '#fde68a',
          accent: { r: 217, g: 119, b: 6 },
          text: '#1c1917', textSecondary: 'rgba(28,25,23,0.7)',
          cardBg: 'rgba(217, 119, 6, 0.15)', cardBorder: 'rgba(217, 119, 6, 0.4)'
        },
        gold: {
          bg1: '#78350f', bg2: '#92400e', bg3: '#b45309',
          accent: { r: 253, g: 230, b: 138 },
          text: '#fef3c7', textSecondary: 'rgba(254,243,199,0.8)',
          cardBg: 'rgba(253, 230, 138, 0.2)', cardBorder: 'rgba(253, 230, 138, 0.5)'
        },
        neon: {
          bg1: '#0c0015', bg2: '#1a0030', bg3: '#2d004d',
          accent: { r: 236, g: 72, b: 153 },
          text: '#ffffff', textSecondary: 'rgba(255,255,255,0.7)',
          cardBg: 'rgba(236, 72, 153, 0.2)', cardBorder: 'rgba(236, 72, 153, 0.6)'
        }
      };

      const colors = themeColors[theme];
      const accentRgba = (alpha: number) => `rgba(${colors.accent.r}, ${colors.accent.g}, ${colors.accent.b}, ${alpha})`;

      // Background gradient
      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGradient.addColorStop(0, colors.bg1);
      bgGradient.addColorStop(0.4, colors.bg2);
      bgGradient.addColorStop(0.7, colors.bg3);
      bgGradient.addColorStop(1, colors.bg1);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Noise texture
      for (let i = 0; i < 6000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const baseColor = theme === 'light' ? '0,0,0' : '255,255,255';
        ctx.fillStyle = `rgba(${baseColor}, ${Math.random() * 0.03})`;
        ctx.fillRect(x, y, 1, 1);
      }

      // Radial glows
      const topGlow = ctx.createRadialGradient(canvas.width / 2, 300, 0, canvas.width / 2, 300, 500);
      topGlow.addColorStop(0, accentRgba(0.3));
      topGlow.addColorStop(0.5, accentRgba(0.1));
      topGlow.addColorStop(1, accentRgba(0));
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerGlow = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2 - 100, 0, canvas.width / 2, canvas.height / 2 - 100, 600);
      centerGlow.addColorStop(0, accentRgba(0.1));
      centerGlow.addColorStop(1, accentRgba(0));
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Neon theme: extra glow effects
      if (theme === 'neon') {
        const neonGlow1 = ctx.createRadialGradient(200, 600, 0, 200, 600, 400);
        neonGlow1.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
        neonGlow1.addColorStop(1, 'rgba(139, 92, 246, 0)');
        ctx.fillStyle = neonGlow1;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const neonGlow2 = ctx.createRadialGradient(canvas.width - 200, 1200, 0, canvas.width - 200, 1200, 400);
        neonGlow2.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
        neonGlow2.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = neonGlow2;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Geometric lines
      ctx.strokeStyle = accentRgba(0.08);
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 200 + i * 400);
        ctx.lineTo(canvas.width, 250 + i * 400);
        ctx.stroke();
      }

      // Corner decorations
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
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = accentRgba(0.8);
      ctx.fillText('★ ACHIEVEMENT UNLOCKED ★', canvas.width / 2, 200);

      // Trophy with glow
      const trophyY = 420;
      const trophyGlow = ctx.createRadialGradient(canvas.width / 2, trophyY, 0, canvas.width / 2, trophyY, 200);
      trophyGlow.addColorStop(0, accentRgba(0.4));
      trophyGlow.addColorStop(0.5, accentRgba(0.1));
      trophyGlow.addColorStop(1, accentRgba(0));
      ctx.fillStyle = trophyGlow;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, trophyY, 200, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '200px Arial, sans-serif';
      ctx.fillText('🏆', canvas.width / 2, trophyY);

      // Header with gradient
      const headerY = 620;
      ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = theme === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.5)';
      ctx.fillText('NYTT PERSONBÄSTA', canvas.width / 2 + 4, headerY + 4);

      const textGradient = ctx.createLinearGradient(200, headerY - 40, canvas.width - 200, headerY + 40);
      if (theme === 'neon') {
        textGradient.addColorStop(0, '#ec4899');
        textGradient.addColorStop(0.3, '#f0abfc');
        textGradient.addColorStop(0.5, '#ec4899');
        textGradient.addColorStop(0.7, '#f0abfc');
        textGradient.addColorStop(1, '#db2777');
      } else {
        textGradient.addColorStop(0, '#fbbf24');
        textGradient.addColorStop(0.3, '#fef3c7');
        textGradient.addColorStop(0.5, '#fbbf24');
        textGradient.addColorStop(0.7, '#fef3c7');
        textGradient.addColorStop(1, '#f59e0b');
      }
      ctx.fillStyle = textGradient;
      ctx.fillText('NYTT PERSONBÄSTA', canvas.width / 2, headerY);

      // Content card
      const cardY = 720;
      const cardHeight = prData.previousWeight ? 550 : 450;

      ctx.fillStyle = colors.cardBg;
      ctx.beginPath();
      ctx.roundRect(100, cardY, canvas.width - 200, cardHeight, 30);
      ctx.fill();
      ctx.strokeStyle = colors.cardBorder;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Exercise name
      const exerciseName = prData.exerciseName.length > 20 ? prData.exerciseName.substring(0, 18) + '...' : prData.exerciseName;
      ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = colors.textSecondary;
      ctx.fillText(exerciseName.toUpperCase(), canvas.width / 2, cardY + 80);

      // Divider
      ctx.strokeStyle = accentRgba(0.3);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(200, cardY + 130);
      ctx.lineTo(canvas.width - 200, cardY + 130);
      ctx.stroke();

      // Weight
      ctx.font = 'bold 140px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = colors.text;
      ctx.fillText(`${prData.newWeight}`, canvas.width / 2, cardY + 250);

      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = accentRgba(0.9);
      ctx.fillText('KG', canvas.width / 2, cardY + 330);

      let nextY = cardY + 400;
      if (prData.reps) {
        ctx.font = '40px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = colors.textSecondary;
        ctx.fillText(`${prData.reps} repetitioner`, canvas.width / 2, nextY);
        nextY += 70;
      }

      // Improvement badge
      if (prData.previousWeight) {
        const improvement = prData.newWeight - prData.previousWeight;
        ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.beginPath();
        ctx.roundRect(250, nextY - 35, canvas.width - 500, 70, 35);
        ctx.fill();
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#86efac';
        ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
        ctx.fillText(`↑ +${improvement.toFixed(1)} KG FÖRBÄTTRING`, canvas.width / 2, nextY);
      }

      // Motivational text
      ctx.font = '36px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = colors.textSecondary;
      ctx.fillText('Nya mål krossas varje dag', canvas.width / 2, canvas.height - 300);
      ctx.font = '40px Arial, sans-serif';
      ctx.fillText('✨', 180, canvas.height - 300);
      ctx.fillText('✨', canvas.width - 180, canvas.height - 300);

      // Branding
      ctx.fillStyle = accentRgba(0.8);
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
      link.download = `gymdagboken-pr-${prData.exerciseName.replace(/\s+/g, '-').toLowerCase()}.png`;
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
      const file = new File([blob], 'gymdagboken-pr.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `Nytt PB: ${prData.exerciseName}`, text: caption });
        toast.success('Delat!');
        onOpenChange(false);
      } else {
        await navigator.clipboard.writeText(caption);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'gymdagboken-pr.png';
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

  const improvement = prData.previousWeight ? prData.newWeight - prData.previousWeight : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Dela ditt personbästa!
          </DialogTitle>
          <DialogDescription>
            Välj ett tema och dela med dina följare på Instagram.
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
                    <Icon className={`h-5 w-5 ${key === 'light' ? 'text-amber-700' : 'text-white'}`} />
                    <span className={`text-xs font-medium ${key === 'light' ? 'text-amber-900' : 'text-white'}`}>
                      {theme.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview card */}
          <div className={`rounded-xl p-6 text-center border relative overflow-hidden ${
            selectedTheme === 'dark' ? 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border-amber-500/20' :
            selectedTheme === 'light' ? 'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border-amber-400' :
            selectedTheme === 'gold' ? 'bg-gradient-to-br from-amber-700 via-amber-600 to-yellow-600 border-yellow-300' :
            'bg-gradient-to-br from-purple-950 via-fuchsia-950 to-purple-900 border-pink-500/50'
          }`}>
            <div className={`absolute inset-0 ${
              selectedTheme === 'dark' ? 'bg-gradient-to-t from-amber-500/10 via-transparent to-amber-500/5' :
              selectedTheme === 'light' ? 'bg-gradient-to-t from-orange-200/30 via-transparent to-amber-200/20' :
              selectedTheme === 'gold' ? 'bg-gradient-to-t from-yellow-400/20 via-transparent to-amber-300/10' :
              'bg-gradient-to-t from-pink-500/20 via-transparent to-purple-500/10'
            }`} />
            
            <div className="relative space-y-3">
              <div className={`flex items-center justify-center gap-2 text-xs font-medium tracking-widest ${
                selectedTheme === 'light' ? 'text-amber-700/80' : 
                selectedTheme === 'neon' ? 'text-pink-400/80' : 'text-amber-400/80'
              }`}>
                <Sparkles className="h-3 w-3" />
                ACHIEVEMENT UNLOCKED
                <Sparkles className="h-3 w-3" />
              </div>
              
              <div className="text-5xl py-2">🏆</div>
              
              <p className={`font-bold text-sm tracking-wide ${
                selectedTheme === 'light' ? 'text-amber-700' :
                selectedTheme === 'neon' ? 'text-pink-400' : 'text-amber-400'
              }`}>NYTT PERSONBÄSTA</p>
              
              <div className={`rounded-lg p-4 space-y-2 ${
                selectedTheme === 'dark' ? 'bg-amber-500/10 border border-amber-500/20' :
                selectedTheme === 'light' ? 'bg-amber-500/15 border border-amber-400/30' :
                selectedTheme === 'gold' ? 'bg-yellow-400/20 border border-yellow-300/40' :
                'bg-pink-500/15 border border-pink-500/30'
              }`}>
                <p className={`font-bold flex items-center justify-center gap-2 ${
                  selectedTheme === 'light' ? 'text-amber-900' : 'text-white/90'
                }`}>
                  <Dumbbell className={`h-4 w-4 ${
                    selectedTheme === 'light' ? 'text-amber-700' :
                    selectedTheme === 'neon' ? 'text-pink-400' : 'text-amber-400'
                  }`} />
                  {prData.exerciseName}
                </p>
                <p className={`text-4xl font-bold ${selectedTheme === 'light' ? 'text-amber-900' : 'text-white'}`}>
                  {prData.newWeight} <span className={`text-xl ${
                    selectedTheme === 'light' ? 'text-amber-600' :
                    selectedTheme === 'neon' ? 'text-pink-400' : 'text-amber-400'
                  }`}>KG</span>
                </p>
                {prData.reps && (
                  <p className={`text-sm ${selectedTheme === 'light' ? 'text-amber-700/70' : 'text-white/60'}`}>
                    {prData.reps} reps
                  </p>
                )}
              </div>
              
              {improvement !== null && improvement > 0 && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-full px-4 py-1.5 inline-flex items-center gap-2">
                  <span className="text-green-400 font-medium text-sm">↑ +{improvement.toFixed(1)} kg</span>
                </div>
              )}
            </div>
            
            <p className={`text-xs mt-4 font-bold tracking-wider ${
              selectedTheme === 'light' ? 'text-amber-800/50' : 'text-white/40'
            }`}>GYMDAGBOKEN</p>
          </div>

          {/* Caption editor */}
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
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' 
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black'
            }`} disabled={isSharing}>
              {isSharing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
              Dela
            </Button>
          </div>
          
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="w-full text-muted-foreground">
            Hoppa över
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
