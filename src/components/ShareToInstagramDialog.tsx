import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Instagram, Copy, Download, Share2, Timer, Trophy, Loader2 } from 'lucide-react';
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

      // Set canvas size for Instagram story (9:16 aspect ratio)
      canvas.width = 1080;
      canvas.height = 1920;

      // Orange gradient background (hardcoded for reliability)
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#f97316'); // primary orange
      gradient.addColorStop(0.5, '#fb923c'); // lighter orange
      gradient.addColorStop(1, '#f59e0b'); // amber
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add subtle pattern overlay for depth
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      for (let i = 0; i < canvas.height; i += 6) {
        ctx.fillRect(0, i, canvas.width, 3);
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (workoutData) {
        // Emoji
        ctx.font = '120px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('💪', canvas.width / 2, 450);
        
        // "AVKLARAT!" header
        ctx.font = 'bold 52px Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText('AVKLARAT!', canvas.width / 2, 560);
        
        // Day name - truncate if too long
        const dayName = workoutData.dayName.length > 20 
          ? workoutData.dayName.substring(0, 18) + '...' 
          : workoutData.dayName;
        ctx.font = 'bold 72px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(dayName, canvas.width / 2, 680);
        
        // Stats container with dark overlay
        const boxY = 780;
        const boxHeight = workoutData.newPBs && workoutData.newPBs.length > 0 ? 480 : 360;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.roundRect(120, boxY, canvas.width - 240, boxHeight, 40);
        ctx.fill();
        
        // Stats
        ctx.font = '44px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        
        let yPos = boxY + 90;
        
        if (workoutData.duration) {
          ctx.fillText(`⏱️  ${workoutData.duration} minuter`, canvas.width / 2, yPos);
          yPos += 90;
        }
        
        ctx.fillText(`🎯  ${workoutData.exerciseCount} övningar`, canvas.width / 2, yPos);
        yPos += 90;
        
        ctx.fillText(`📊  ${workoutData.totalSets} set totalt`, canvas.width / 2, yPos);
        
        // PB badge
        if (workoutData.newPBs && workoutData.newPBs.length > 0) {
          yPos += 110;
          ctx.fillStyle = 'rgba(250, 204, 21, 0.3)';
          ctx.beginPath();
          ctx.roundRect(200, yPos - 40, canvas.width - 400, 80, 20);
          ctx.fill();
          
          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 40px Arial, sans-serif';
          ctx.fillText('🏆 NYTT PERSONBÄSTA!', canvas.width / 2, yPos + 5);
        }
        
      } else if (cardioData) {
        // Activity icon
        const emoji = {
          'Löpning': '🏃',
          'Cykling': '🚴',
          'Simning': '🏊',
          'Promenad': '🚶',
          'Golf': '⛳',
          'Övrigt': '🔥'
        }[cardioData.activityType] || '🔥';
        
        ctx.font = '120px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(emoji, canvas.width / 2, 450);
        
        // "AVKLARAT!" header
        ctx.font = 'bold 52px Arial, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText('AVKLARAT!', canvas.width / 2, 560);
        
        // Activity name
        ctx.font = 'bold 72px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(cardioData.activityType, canvas.width / 2, 680);
        
        // Stats container
        const boxY = 780;
        let statCount = 1;
        if (cardioData.distance) statCount++;
        if (cardioData.calories) statCount++;
        const boxHeight = 80 + statCount * 90;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.roundRect(120, boxY, canvas.width - 240, boxHeight, 40);
        ctx.fill();
        
        ctx.font = '44px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        
        let yPos = boxY + 80;
        ctx.fillText(`⏱️  ${cardioData.duration} minuter`, canvas.width / 2, yPos);
        
        if (cardioData.distance) {
          yPos += 90;
          ctx.fillText(`📍  ${cardioData.distance} km`, canvas.width / 2, yPos);
        }
        
        if (cardioData.calories) {
          yPos += 90;
          ctx.fillText(`🔥  ${cardioData.calories} kcal`, canvas.width / 2, yPos);
        }
      }

      // Branding at bottom
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 48px Arial, sans-serif';
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

      // Check if native sharing with files is supported
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: workoutData ? workoutData.dayName : cardioData?.activityType,
          text: caption
        });
        toast.success('Delat!');
        onOpenChange(false);
      } else {
        // Fallback: download image and copy caption
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

  // Auto-share when dialog opens on mobile
  useEffect(() => {
    if (open && (workoutData || cardioData)) {
      // Small delay to ensure canvas is ready
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
          {/* Preview card */}
          <div className="bg-gradient-to-br from-orange-500 via-orange-400 to-amber-500 rounded-lg p-6 text-center text-white">
            {workoutData && (
              <div className="space-y-3">
                <div className="text-4xl">💪</div>
                <p className="text-sm font-medium opacity-90">AVKLARAT!</p>
                <p className="font-bold text-xl">{workoutData.dayName}</p>
                <div className="bg-black/20 rounded-lg p-4 space-y-2 text-sm">
                  {workoutData.duration && (
                    <p className="flex items-center justify-center gap-2">
                      <Timer className="h-4 w-4" />
                      {workoutData.duration} minuter
                    </p>
                  )}
                  <p>🎯 {workoutData.exerciseCount} övningar</p>
                  <p>📊 {workoutData.totalSets} set totalt</p>
                </div>
                {workoutData.newPBs && workoutData.newPBs.length > 0 && (
                  <div className="bg-yellow-500/30 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-300" />
                    <span className="text-yellow-100 font-medium text-sm">Nytt personbästa!</span>
                  </div>
                )}
              </div>
            )}
            {cardioData && (
              <div className="space-y-3">
                <div className="text-4xl">
                  {cardioData.activityType === 'Löpning' ? '🏃' :
                   cardioData.activityType === 'Cykling' ? '🚴' :
                   cardioData.activityType === 'Simning' ? '🏊' :
                   cardioData.activityType === 'Promenad' ? '🚶' :
                   cardioData.activityType === 'Golf' ? '⛳' : '🔥'}
                </div>
                <p className="text-sm font-medium opacity-90">AVKLARAT!</p>
                <p className="font-bold text-xl">{cardioData.activityType}</p>
                <div className="bg-black/20 rounded-lg p-4 space-y-2 text-sm">
                  <p className="flex items-center justify-center gap-2">
                    <Timer className="h-4 w-4" />
                    {cardioData.duration} minuter
                  </p>
                  {cardioData.distance && <p>📍 {cardioData.distance} km</p>}
                  {cardioData.calories && <p>🔥 {cardioData.calories} kcal</p>}
                </div>
              </div>
            )}
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
            <Button onClick={shareNative} className="flex-1" disabled={isSharing}>
              {isSharing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4 mr-2" />
              )}
              Dela
            </Button>
          </div>
        </div>

        {/* Hidden canvas for image generation */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
