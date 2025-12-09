import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Instagram, Copy, Download, Share2, Dumbbell, Timer, Flame, Trophy } from 'lucide-react';
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
  const previewRef = useRef<HTMLDivElement>(null);
  
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

  // Update caption when dialog opens
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

  const generateShareImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size for Instagram story (9:16 aspect ratio)
    canvas.width = 1080;
    canvas.height = 1920;

    // Get CSS custom property colors from the document
    const computedStyle = getComputedStyle(document.documentElement);
    
    // Parse HSL from CSS variables and convert to usable colors
    const primaryHsl = computedStyle.getPropertyValue('--primary').trim() || '25 95% 53%';
    const gymAmberHsl = computedStyle.getPropertyValue('--gym-amber').trim() || '38 92% 50%';
    
    // Background gradient matching the app's orange theme
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, `hsl(${primaryHsl})`);
    gradient.addColorStop(1, `hsl(${gymAmberHsl})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle overlay pattern for depth
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < canvas.height; i += 8) {
      ctx.fillRect(0, i, canvas.width, 4);
    }

    ctx.textAlign = 'center';
    
    if (workoutData) {
      // Dumbbell emoji
      ctx.font = '140px system-ui';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('💪', canvas.width / 2, 520);
      
      // Day name - bold and prominent
      ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(workoutData.dayName, canvas.width / 2, 680);
      
      // Stats container with dark overlay
      const boxY = 780;
      const boxHeight = workoutData.newPBs && workoutData.newPBs.length > 0 ? 520 : 380;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.roundRect(100, boxY, canvas.width - 200, boxHeight, 32);
      ctx.fill();
      
      // Stats
      ctx.font = '48px system-ui';
      ctx.fillStyle = '#ffffff';
      
      let yPos = boxY + 100;
      
      if (workoutData.duration) {
        ctx.fillText(`⏱️  ${workoutData.duration} min`, canvas.width / 2, yPos);
        yPos += 100;
      }
      
      ctx.fillText(`🎯  ${workoutData.exerciseCount} övningar`, canvas.width / 2, yPos);
      yPos += 100;
      
      ctx.fillText(`📊  ${workoutData.totalSets} set`, canvas.width / 2, yPos);
      
      // PB badge
      if (workoutData.newPBs && workoutData.newPBs.length > 0) {
        yPos += 120;
        ctx.fillStyle = 'rgba(234, 179, 8, 0.4)';
        ctx.beginPath();
        ctx.roundRect(200, yPos - 50, canvas.width - 400, 80, 16);
        ctx.fill();
        
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 44px system-ui';
        ctx.fillText('🏆 Nytt PB!', canvas.width / 2, yPos + 15);
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
      
      ctx.font = '140px system-ui';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(emoji, canvas.width / 2, 520);
      
      // Activity name
      ctx.font = 'bold 80px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(cardioData.activityType, canvas.width / 2, 680);
      
      // Stats container
      const boxY = 780;
      let statCount = 1; // duration always shown
      if (cardioData.distance) statCount++;
      if (cardioData.calories) statCount++;
      const boxHeight = 100 + statCount * 100;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.beginPath();
      ctx.roundRect(100, boxY, canvas.width - 200, boxHeight, 32);
      ctx.fill();
      
      ctx.font = '48px system-ui';
      ctx.fillStyle = '#ffffff';
      
      let yPos = boxY + 100;
      ctx.fillText(`⏱️  ${cardioData.duration} min`, canvas.width / 2, yPos);
      
      if (cardioData.distance) {
        yPos += 100;
        ctx.fillText(`📍  ${cardioData.distance} km`, canvas.width / 2, yPos);
      }
      
      if (cardioData.calories) {
        yPos += 100;
        ctx.fillText(`🔥  ${cardioData.calories} kcal`, canvas.width / 2, yPos);
      }
    }

    // Branding at bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 40px system-ui';
    ctx.fillText('Gymdagboken.se', canvas.width / 2, canvas.height - 140);

    return canvas.toDataURL('image/png');
  };

  const downloadImage = () => {
    const dataUrl = generateShareImage();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = 'workout-share.png';
    link.href = dataUrl;
    link.click();
    toast.success('Bild nedladdad! Dela den på Instagram.');
  };

  const shareToInstagram = async () => {
    // Copy caption first
    await navigator.clipboard.writeText(caption);
    
    // Generate and download image
    const dataUrl = generateShareImage();
    if (!dataUrl) {
      toast.error('Kunde inte skapa bilden');
      return;
    }

    // Convert to blob for sharing
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], 'workout.png', { type: 'image/png' });

    // Try native share if available (mobile)
    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          text: caption
        });
        toast.success('Delat!');
        onOpenChange(false);
        return;
      } catch (err) {
        // User cancelled or share failed, fall through to download
      }
    }

    // Fallback: download image and copy text
    downloadImage();
    toast.success('Bild nedladdad och text kopierad! Öppna Instagram och dela.', {
      duration: 5000
    });
  };

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
          {/* Preview card - matches the generated image */}
          <div 
            ref={previewRef}
            className="bg-gradient-to-br from-primary to-[hsl(var(--gym-amber))] rounded-lg p-6 text-center text-white"
          >
            {workoutData && (
              <div className="space-y-3">
                <div className="text-4xl">💪</div>
                <p className="font-bold text-xl">{workoutData.dayName}</p>
                <div className="bg-black/20 rounded-lg p-4 space-y-2">
                  {workoutData.duration && (
                    <p className="flex items-center justify-center gap-2">
                      <Timer className="h-4 w-4" />
                      {workoutData.duration} min
                    </p>
                  )}
                  <p>🎯 {workoutData.exerciseCount} övningar</p>
                  <p>📊 {workoutData.totalSets} set</p>
                </div>
                {workoutData.newPBs && workoutData.newPBs.length > 0 && (
                  <div className="bg-yellow-500/30 rounded-lg px-4 py-2 inline-flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-300" />
                    <span className="text-yellow-100 font-medium">Nytt PB!</span>
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
                <p className="font-bold text-xl">{cardioData.activityType}</p>
                <div className="bg-black/20 rounded-lg p-4 space-y-2">
                  <p className="flex items-center justify-center gap-2">
                    <Timer className="h-4 w-4" />
                    {cardioData.duration} min
                  </p>
                  {cardioData.distance && <p>📍 {cardioData.distance} km</p>}
                  {cardioData.calories && <p>🔥 {cardioData.calories} kcal</p>}
                </div>
              </div>
            )}
            <p className="text-sm opacity-80 mt-4">Gymdagboken.se</p>
          </div>

          {/* Caption editor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Bildtext</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              className="resize-none"
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
              Ladda ner bild
            </Button>
            <Button onClick={shareToInstagram} className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              Dela
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Bilden och texten kopieras. Öppna Instagram och klistra in!
          </p>
        </div>

        {/* Hidden canvas for image generation */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
