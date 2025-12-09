import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Download, Share2, Trophy, Loader2, Dumbbell, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

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

export default function SharePRToInstagramDialog({ 
  open, 
  onOpenChange, 
  prData
}: SharePRToInstagramDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  
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

  const generateShareImage = (): Promise<Blob> => {
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

      // Set canvas size for Instagram story (9:16 aspect ratio)
      canvas.width = 1080;
      canvas.height = 1920;

      // Premium dark background with golden accents
      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGradient.addColorStop(0, '#0a0a0a');
      bgGradient.addColorStop(0.3, '#1a1a1a');
      bgGradient.addColorStop(0.7, '#0f0f0f');
      bgGradient.addColorStop(1, '#050505');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle noise texture
      for (let i = 0; i < 8000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const opacity = Math.random() * 0.03;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fillRect(x, y, 1, 1);
      }

      // Large golden radial glow at top
      const topGlow = ctx.createRadialGradient(
        canvas.width / 2, 300, 0,
        canvas.width / 2, 300, 500
      );
      topGlow.addColorStop(0, 'rgba(251, 191, 36, 0.25)');
      topGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
      topGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Secondary glow at center
      const centerGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2 - 100, 0,
        canvas.width / 2, canvas.height / 2 - 100, 600
      );
      centerGlow.addColorStop(0, 'rgba(251, 191, 36, 0.12)');
      centerGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = centerGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Geometric accent lines
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.1)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 200 + i * 400);
        ctx.lineTo(canvas.width, 250 + i * 400);
        ctx.stroke();
      }

      // Decorative corner elements
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 3;
      
      // Top left corner
      ctx.beginPath();
      ctx.moveTo(60, 150);
      ctx.lineTo(60, 60);
      ctx.lineTo(150, 60);
      ctx.stroke();
      
      // Top right corner
      ctx.beginPath();
      ctx.moveTo(canvas.width - 60, 150);
      ctx.lineTo(canvas.width - 60, 60);
      ctx.lineTo(canvas.width - 150, 60);
      ctx.stroke();
      
      // Bottom corners
      ctx.beginPath();
      ctx.moveTo(60, canvas.height - 150);
      ctx.lineTo(60, canvas.height - 60);
      ctx.lineTo(150, canvas.height - 60);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(canvas.width - 60, canvas.height - 150);
      ctx.lineTo(canvas.width - 60, canvas.height - 60);
      ctx.lineTo(canvas.width - 150, canvas.height - 60);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Small label at top
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.letterSpacing = '8px';
      ctx.fillText('★ ACHIEVEMENT UNLOCKED ★', canvas.width / 2, 200);
      
      // Trophy with glow effect
      const trophyY = 420;
      
      // Trophy glow
      const trophyGlow = ctx.createRadialGradient(
        canvas.width / 2, trophyY, 0,
        canvas.width / 2, trophyY, 200
      );
      trophyGlow.addColorStop(0, 'rgba(251, 191, 36, 0.4)');
      trophyGlow.addColorStop(0.5, 'rgba(251, 191, 36, 0.1)');
      trophyGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = trophyGlow;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, trophyY, 200, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '200px Arial, sans-serif';
      ctx.fillText('🏆', canvas.width / 2, trophyY);

      // "NYTT PERSONBÄSTA" with gradient text effect
      const headerY = 620;
      ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
      
      // Text shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillText('NYTT PERSONBÄSTA', canvas.width / 2 + 4, headerY + 4);
      
      // Main text with golden gradient
      const textGradient = ctx.createLinearGradient(200, headerY - 40, canvas.width - 200, headerY + 40);
      textGradient.addColorStop(0, '#fbbf24');
      textGradient.addColorStop(0.3, '#fef3c7');
      textGradient.addColorStop(0.5, '#fbbf24');
      textGradient.addColorStop(0.7, '#fef3c7');
      textGradient.addColorStop(1, '#f59e0b');
      ctx.fillStyle = textGradient;
      ctx.fillText('NYTT PERSONBÄSTA', canvas.width / 2, headerY);

      // Main content card with glassmorphism effect
      const cardY = 720;
      const cardHeight = prData.previousWeight ? 550 : 450;
      
      // Card background
      const cardGradient = ctx.createLinearGradient(100, cardY, canvas.width - 100, cardY + cardHeight);
      cardGradient.addColorStop(0, 'rgba(251, 191, 36, 0.15)');
      cardGradient.addColorStop(0.5, 'rgba(251, 191, 36, 0.08)');
      cardGradient.addColorStop(1, 'rgba(251, 191, 36, 0.12)');
      
      ctx.fillStyle = cardGradient;
      ctx.beginPath();
      ctx.roundRect(100, cardY, canvas.width - 200, cardHeight, 30);
      ctx.fill();
      
      // Card border
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Exercise name
      const exerciseName = prData.exerciseName.length > 20 
        ? prData.exerciseName.substring(0, 18) + '...' 
        : prData.exerciseName;
      ctx.font = 'bold 52px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillText(exerciseName.toUpperCase(), canvas.width / 2, cardY + 80);

      // Divider line
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(200, cardY + 130);
      ctx.lineTo(canvas.width - 200, cardY + 130);
      ctx.stroke();

      // Weight - super prominent
      ctx.font = 'bold 140px system-ui, -apple-system, sans-serif';
      const weightGradient = ctx.createLinearGradient(300, cardY + 180, canvas.width - 300, cardY + 300);
      weightGradient.addColorStop(0, '#ffffff');
      weightGradient.addColorStop(0.5, '#fef3c7');
      weightGradient.addColorStop(1, '#ffffff');
      ctx.fillStyle = weightGradient;
      ctx.fillText(`${prData.newWeight}`, canvas.width / 2, cardY + 250);
      
      // "KG" label
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.fillText('KG', canvas.width / 2, cardY + 330);

      // Reps if available
      let nextY = cardY + 400;
      if (prData.reps) {
        ctx.font = '40px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(`${prData.reps} repetitioner`, canvas.width / 2, nextY);
        nextY += 70;
      }

      // Improvement badge
      if (prData.previousWeight) {
        const improvement = prData.newWeight - prData.previousWeight;
        
        // Badge background
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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('Nya mål krossas varje dag', canvas.width / 2, canvas.height - 300);

      // Sparkle decorations
      ctx.font = '40px Arial, sans-serif';
      ctx.fillText('✨', 180, canvas.height - 300);
      ctx.fillText('✨', canvas.width - 180, canvas.height - 300);

      // Branding with premium styling
      ctx.fillStyle = 'rgba(251, 191, 36, 0.8)';
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillText('POWERED BY', canvas.width / 2, canvas.height - 200);
      
      ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('GYMDAGBOKEN', canvas.width / 2, canvas.height - 140);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png', 1.0);
    });
  };

  const downloadImage = async () => {
    try {
      const blob = await generateShareImage();
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
      const blob = await generateShareImage();
      const file = new File([blob], 'gymdagboken-pr.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Nytt PB: ${prData.exerciseName}`,
          text: caption
        });
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
      if (error.name !== 'AbortError') {
        toast.error('Kunde inte dela');
      }
    } finally {
      setIsSharing(false);
    }
  };

  const improvement = prData.previousWeight 
    ? prData.newWeight - prData.previousWeight 
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Dela ditt personbästa!
          </DialogTitle>
          <DialogDescription>
            Grattis till ditt nya PB! Dela det med dina följare på Instagram.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview card - Premium dark design */}
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-xl p-6 text-center border border-amber-500/20 relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-amber-500/5" />
            
            <div className="relative space-y-3">
              <div className="flex items-center justify-center gap-2 text-amber-400/80 text-xs font-medium tracking-widest">
                <Sparkles className="h-3 w-3" />
                ACHIEVEMENT UNLOCKED
                <Sparkles className="h-3 w-3" />
              </div>
              
              <div className="text-5xl py-2">🏆</div>
              
              <p className="font-bold text-amber-400 text-sm tracking-wide">NYTT PERSONBÄSTA</p>
              
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
                <p className="font-bold text-white/90 flex items-center justify-center gap-2">
                  <Dumbbell className="h-4 w-4 text-amber-400" />
                  {prData.exerciseName}
                </p>
                <p className="text-4xl font-bold text-white">{prData.newWeight} <span className="text-amber-400 text-xl">KG</span></p>
                {prData.reps && (
                  <p className="text-sm text-white/60">{prData.reps} reps</p>
                )}
              </div>
              
              {improvement !== null && improvement > 0 && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-full px-4 py-1.5 inline-flex items-center gap-2">
                  <span className="text-green-400 font-medium text-sm">
                    ↑ +{improvement.toFixed(1)} kg
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-xs text-white/40 mt-4 font-bold tracking-wider">GYMDAGBOKEN</p>
          </div>

          {/* Caption editor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bildtext</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              className="resize-none text-sm"
            />
            <Button variant="outline" size="sm" onClick={copyCaption} className="w-full">
              <Copy className="h-4 w-4 mr-2" />
              Kopiera text
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadImage} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Ladda ner
            </Button>
            <Button onClick={shareNative} className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90 text-black font-semibold" disabled={isSharing}>
              {isSharing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Dela
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground"
          >
            Hoppa över
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
