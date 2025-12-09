import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Instagram, Copy, Download, Share2, Trophy, Loader2, Dumbbell } from 'lucide-react';
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

      // Gold/trophy gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#f59e0b'); // amber
      gradient.addColorStop(0.3, '#fbbf24'); // yellow
      gradient.addColorStop(0.7, '#f59e0b'); // amber
      gradient.addColorStop(1, '#d97706'); // darker amber
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle pattern overlay for depth
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      for (let i = 0; i < canvas.height; i += 8) {
        ctx.fillRect(0, i, canvas.width, 4);
      }

      // Add radial glow effect
      const radialGradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2 - 200, 0,
        canvas.width / 2, canvas.height / 2 - 200, 600
      );
      radialGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      radialGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = radialGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Trophy emoji - large
      ctx.font = '180px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🏆', canvas.width / 2, 380);
      
      // "NYTT PERSONBÄSTA!" header with shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.font = 'bold 68px Arial, sans-serif';
      ctx.fillText('NYTT PERSONBÄSTA!', canvas.width / 2 + 4, 564);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('NYTT PERSONBÄSTA!', canvas.width / 2, 560);
      
      // Stats container with dark overlay
      const boxY = 680;
      const boxHeight = prData.previousWeight ? 500 : 380;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.roundRect(100, boxY, canvas.width - 200, boxHeight, 50);
      ctx.fill();
      
      // Exercise name
      const exerciseName = prData.exerciseName.length > 18 
        ? prData.exerciseName.substring(0, 16) + '...' 
        : prData.exerciseName;
      ctx.font = 'bold 56px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(exerciseName, canvas.width / 2, boxY + 80);
      
      // Dumbbell icon line
      ctx.font = '48px Arial, sans-serif';
      ctx.fillText('💪', canvas.width / 2, boxY + 160);
      
      // NEW WEIGHT - Big and prominent
      ctx.font = 'bold 120px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${prData.newWeight} kg`, canvas.width / 2, boxY + 280);
      
      // Reps if available
      if (prData.reps) {
        ctx.font = '44px Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`${prData.reps} reps`, canvas.width / 2, boxY + 360);
      }
      
      // Improvement badge
      if (prData.previousWeight) {
        const improvement = prData.newWeight - prData.previousWeight;
        const improvementY = boxY + (prData.reps ? 440 : 380);
        
        ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
        ctx.beginPath();
        ctx.roundRect(280, improvementY - 35, canvas.width - 560, 70, 35);
        ctx.fill();
        
        ctx.fillStyle = '#86efac';
        ctx.font = 'bold 40px Arial, sans-serif';
        ctx.fillText(`📈 +${improvement.toFixed(1)} kg från förra`, canvas.width / 2, improvementY);
      }
      
      // Motivational text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '36px Arial, sans-serif';
      ctx.fillText('Nya mål krossas varje dag! 💥', canvas.width / 2, canvas.height - 280);

      // Branding at bottom
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = 'bold 52px Arial, sans-serif';
      ctx.fillText('GYMDAGBOKEN.SE', canvas.width / 2, canvas.height - 160);

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

      // Check if native sharing with files is supported
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Nytt PB: ${prData.exerciseName}`,
          text: caption
        });
        toast.success('Delat!');
        onOpenChange(false);
      } else {
        // Fallback: download image and copy caption
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
          {/* Preview card */}
          <div className="bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 rounded-lg p-6 text-center text-white">
            <div className="space-y-3">
              <div className="text-5xl">🏆</div>
              <p className="font-bold text-lg opacity-90">NYTT PERSONBÄSTA!</p>
              
              <div className="bg-black/20 rounded-lg p-4 space-y-2">
                <p className="font-bold text-xl flex items-center justify-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  {prData.exerciseName}
                </p>
                <p className="text-4xl font-bold">{prData.newWeight} kg</p>
                {prData.reps && (
                  <p className="text-sm opacity-90">{prData.reps} reps</p>
                )}
              </div>
              
              {improvement !== null && improvement > 0 && (
                <div className="bg-green-500/30 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                  <span className="text-green-100 font-medium text-sm">
                    📈 +{improvement.toFixed(1)} kg från förra
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs opacity-80 mt-4 font-bold">GYMDAGBOKEN.SE</p>
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
            <Button onClick={shareNative} className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-90" disabled={isSharing}>
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

        {/* Hidden canvas for image generation */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
