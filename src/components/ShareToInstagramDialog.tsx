import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Instagram, Copy, Download, Share2, Timer, Trophy, Loader2, Flame, Target } from 'lucide-react';
import { toast } from 'sonner';

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

export default function ShareToInstagramDialog({ 
  open, 
  onOpenChange, 
  workoutData,
  cardioData 
}: ShareToInstagramDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  
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

      canvas.width = 1080;
      canvas.height = 1920;

      // Premium dark background
      const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      bgGradient.addColorStop(0, '#0a0a0a');
      bgGradient.addColorStop(0.4, '#171717');
      bgGradient.addColorStop(0.6, '#0f0f0f');
      bgGradient.addColorStop(1, '#050505');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Noise texture
      for (let i = 0; i < 6000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.025})`;
        ctx.fillRect(x, y, 1, 1);
      }

      // Determine accent color based on content type
      const isCardio = !!cardioData;
      const accentColor = isCardio ? { r: 249, g: 115, b: 22 } : { r: 249, g: 115, b: 22 }; // Orange for both
      const accentRgba = (alpha: number) => `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, ${alpha})`;

      // Large radial glow at top
      const topGlow = ctx.createRadialGradient(
        canvas.width / 2, 350, 0,
        canvas.width / 2, 350, 500
      );
      topGlow.addColorStop(0, accentRgba(0.3));
      topGlow.addColorStop(0.4, accentRgba(0.1));
      topGlow.addColorStop(1, accentRgba(0));
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Secondary ambient glow
      const ambientGlow = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, 700
      );
      ambientGlow.addColorStop(0, accentRgba(0.08));
      ambientGlow.addColorStop(1, accentRgba(0));
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Geometric accent lines
      ctx.strokeStyle = accentRgba(0.08);
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 100 + i * 250);
        ctx.lineTo(canvas.width, 150 + i * 250);
        ctx.stroke();
      }

      // Corner decorations
      ctx.strokeStyle = accentRgba(0.25);
      ctx.lineWidth = 3;
      
      const corners = [
        { x1: 60, y1: 150, x2: 60, y2: 60, x3: 150, y3: 60 },
        { x1: canvas.width - 60, y1: 150, x2: canvas.width - 60, y2: 60, x3: canvas.width - 150, y3: 60 },
        { x1: 60, y1: canvas.height - 150, x2: 60, y2: canvas.height - 60, x3: 150, y3: canvas.height - 60 },
        { x1: canvas.width - 60, y1: canvas.height - 150, x2: canvas.width - 60, y2: canvas.height - 60, x3: canvas.width - 150, y3: canvas.height - 60 }
      ];
      
      corners.forEach(c => {
        ctx.beginPath();
        ctx.moveTo(c.x1, c.y1);
        ctx.lineTo(c.x2, c.y2);
        ctx.lineTo(c.x3, c.y3);
        ctx.stroke();
      });

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Top label
      ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = accentRgba(0.7);
      ctx.fillText('★ WORKOUT COMPLETE ★', canvas.width / 2, 200);

      if (workoutData) {
        // Main emoji with glow
        const emojiY = 420;
        const emojiGlow = ctx.createRadialGradient(
          canvas.width / 2, emojiY, 0,
          canvas.width / 2, emojiY, 180
        );
        emojiGlow.addColorStop(0, accentRgba(0.35));
        emojiGlow.addColorStop(0.5, accentRgba(0.1));
        emojiGlow.addColorStop(1, accentRgba(0));
        ctx.fillStyle = emojiGlow;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, emojiY, 180, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '180px Arial, sans-serif';
        ctx.fillText('💪', canvas.width / 2, emojiY);

        // "AVKLARAT" header with gradient
        const headerY = 620;
        ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillText('AVKLARAT!', canvas.width / 2 + 4, headerY + 4);
        
        const textGrad = ctx.createLinearGradient(200, headerY - 50, canvas.width - 200, headerY + 50);
        textGrad.addColorStop(0, '#f97316');
        textGrad.addColorStop(0.3, '#fed7aa');
        textGrad.addColorStop(0.5, '#f97316');
        textGrad.addColorStop(0.7, '#fed7aa');
        textGrad.addColorStop(1, '#ea580c');
        ctx.fillStyle = textGrad;
        ctx.fillText('AVKLARAT!', canvas.width / 2, headerY);

        // Day name
        const dayName = workoutData.dayName.length > 22 
          ? workoutData.dayName.substring(0, 20) + '...' 
          : workoutData.dayName;
        ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(dayName.toUpperCase(), canvas.width / 2, 720);

        // Stats card
        const cardY = 800;
        const hasPBs = workoutData.newPBs && workoutData.newPBs.length > 0;
        const cardHeight = hasPBs ? 480 : 380;
        
        // Card background
        const cardGrad = ctx.createLinearGradient(100, cardY, canvas.width - 100, cardY + cardHeight);
        cardGrad.addColorStop(0, accentRgba(0.12));
        cardGrad.addColorStop(0.5, accentRgba(0.06));
        cardGrad.addColorStop(1, accentRgba(0.1));
        
        ctx.fillStyle = cardGrad;
        ctx.beginPath();
        ctx.roundRect(100, cardY, canvas.width - 200, cardHeight, 30);
        ctx.fill();
        
        ctx.strokeStyle = accentRgba(0.3);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Stats
        let yPos = cardY + 90;
        ctx.font = '42px system-ui, -apple-system, sans-serif';
        
        if (workoutData.duration) {
          ctx.fillStyle = accentRgba(0.9);
          ctx.fillText('⏱', canvas.width / 2 - 140, yPos);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${workoutData.duration} minuter`, canvas.width / 2 + 30, yPos);
          yPos += 85;
        }

        ctx.fillStyle = accentRgba(0.9);
        ctx.fillText('🎯', canvas.width / 2 - 140, yPos);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${workoutData.exerciseCount} övningar`, canvas.width / 2 + 30, yPos);
        yPos += 85;

        ctx.fillStyle = accentRgba(0.9);
        ctx.fillText('📊', canvas.width / 2 - 140, yPos);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${workoutData.totalSets} set totalt`, canvas.width / 2 + 30, yPos);

        // PB Badge
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
        // Cardio version
        const emoji = {
          'Löpning': '🏃',
          'Cykling': '🚴',
          'Simning': '🏊',
          'Promenad': '🚶',
          'Golf': '⛳',
          'Övrigt': '🔥'
        }[cardioData.activityType] || '🔥';

        const emojiY = 420;
        const emojiGlow = ctx.createRadialGradient(
          canvas.width / 2, emojiY, 0,
          canvas.width / 2, emojiY, 180
        );
        emojiGlow.addColorStop(0, accentRgba(0.35));
        emojiGlow.addColorStop(0.5, accentRgba(0.1));
        emojiGlow.addColorStop(1, accentRgba(0));
        ctx.fillStyle = emojiGlow;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, emojiY, 180, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '180px Arial, sans-serif';
        ctx.fillText(emoji, canvas.width / 2, emojiY);

        // Header
        const headerY = 620;
        ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillText('AVKLARAT!', canvas.width / 2 + 4, headerY + 4);
        
        const textGrad = ctx.createLinearGradient(200, headerY - 50, canvas.width - 200, headerY + 50);
        textGrad.addColorStop(0, '#f97316');
        textGrad.addColorStop(0.3, '#fed7aa');
        textGrad.addColorStop(0.5, '#f97316');
        textGrad.addColorStop(0.7, '#fed7aa');
        textGrad.addColorStop(1, '#ea580c');
        ctx.fillStyle = textGrad;
        ctx.fillText('AVKLARAT!', canvas.width / 2, headerY);

        // Activity name
        ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(cardioData.activityType.toUpperCase(), canvas.width / 2, 720);

        // Stats card
        const cardY = 800;
        let statCount = 1;
        if (cardioData.distance) statCount++;
        if (cardioData.calories) statCount++;
        const cardHeight = 100 + statCount * 85;
        
        const cardGrad = ctx.createLinearGradient(100, cardY, canvas.width - 100, cardY + cardHeight);
        cardGrad.addColorStop(0, accentRgba(0.12));
        cardGrad.addColorStop(0.5, accentRgba(0.06));
        cardGrad.addColorStop(1, accentRgba(0.1));
        
        ctx.fillStyle = cardGrad;
        ctx.beginPath();
        ctx.roundRect(100, cardY, canvas.width - 200, cardHeight, 30);
        ctx.fill();
        
        ctx.strokeStyle = accentRgba(0.3);
        ctx.lineWidth = 2;
        ctx.stroke();

        // Stats
        let yPos = cardY + 80;
        ctx.font = '42px system-ui, -apple-system, sans-serif';
        
        ctx.fillStyle = accentRgba(0.9);
        ctx.fillText('⏱', canvas.width / 2 - 120, yPos);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${cardioData.duration} minuter`, canvas.width / 2 + 40, yPos);
        
        if (cardioData.distance) {
          yPos += 85;
          ctx.fillStyle = accentRgba(0.9);
          ctx.fillText('📍', canvas.width / 2 - 120, yPos);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${cardioData.distance} km`, canvas.width / 2 + 40, yPos);
        }
        
        if (cardioData.calories) {
          yPos += 85;
          ctx.fillStyle = accentRgba(0.9);
          ctx.fillText('🔥', canvas.width / 2 - 120, yPos);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${cardioData.calories} kcal`, canvas.width / 2 + 40, yPos);
        }
      }

      // Branding
      ctx.fillStyle = accentRgba(0.7);
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillText('POWERED BY', canvas.width / 2, canvas.height - 200);
      
      ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('GYMDAGBOKEN', canvas.width / 2, canvas.height - 140);

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
      const blob = await generateShareImage();
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
      if (error.name !== 'AbortError') {
        toast.error('Kunde inte dela');
      }
    } finally {
      setIsSharing(false);
    }
  };

  useEffect(() => {
    if (open && (workoutData || cardioData)) {
      const timer = setTimeout(() => {
        shareNative();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Dela på Instagram
          </DialogTitle>
          <DialogDescription>
            Dela ditt träningsresultat med dina följare!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview card - Premium dark design */}
          <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-xl p-6 text-center border border-orange-500/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 via-transparent to-orange-500/5" />
            
            {workoutData && (
              <div className="relative space-y-3">
                <p className="text-orange-400/70 text-xs font-medium tracking-widest">★ WORKOUT COMPLETE ★</p>
                <div className="text-4xl py-1">💪</div>
                <p className="font-bold text-orange-400 tracking-wide">AVKLARAT!</p>
                <p className="font-bold text-white text-lg">{workoutData.dayName}</p>
                
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 space-y-2 text-sm">
                  {workoutData.duration && (
                    <p className="flex items-center justify-center gap-2 text-white/80">
                      <Timer className="h-4 w-4 text-orange-400" />
                      {workoutData.duration} minuter
                    </p>
                  )}
                  <p className="flex items-center justify-center gap-2 text-white/80">
                    <Target className="h-4 w-4 text-orange-400" />
                    {workoutData.exerciseCount} övningar
                  </p>
                  <p className="text-white/80">📊 {workoutData.totalSets} set totalt</p>
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
                <p className="text-orange-400/70 text-xs font-medium tracking-widest">★ WORKOUT COMPLETE ★</p>
                <div className="text-4xl py-1">
                  {cardioData.activityType === 'Löpning' ? '🏃' :
                   cardioData.activityType === 'Cykling' ? '🚴' :
                   cardioData.activityType === 'Simning' ? '🏊' :
                   cardioData.activityType === 'Promenad' ? '🚶' :
                   cardioData.activityType === 'Golf' ? '⛳' : '🔥'}
                </div>
                <p className="font-bold text-orange-400 tracking-wide">AVKLARAT!</p>
                <p className="font-bold text-white text-lg">{cardioData.activityType}</p>
                
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 space-y-2 text-sm">
                  <p className="flex items-center justify-center gap-2 text-white/80">
                    <Timer className="h-4 w-4 text-orange-400" />
                    {cardioData.duration} minuter
                  </p>
                  {cardioData.distance && (
                    <p className="text-white/80">📍 {cardioData.distance} km</p>
                  )}
                  {cardioData.calories && (
                    <p className="flex items-center justify-center gap-2 text-white/80">
                      <Flame className="h-4 w-4 text-orange-400" />
                      {cardioData.calories} kcal
                    </p>
                  )}
                </div>
              </div>
            )}
            
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
            <Button onClick={shareNative} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white font-semibold" disabled={isSharing}>
              {isSharing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Dela
            </Button>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
