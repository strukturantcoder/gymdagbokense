import { useState, useRef } from 'react';
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
  useState(() => {
    if (open) {
      setCaption(workoutData ? generateWorkoutCaption() : generateCardioCaption());
    }
  });

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

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle pattern overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < canvas.height; i += 4) {
      ctx.fillRect(0, i, canvas.width, 2);
    }

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    
    if (workoutData) {
      ctx.fillText('💪 TRÄNINGSPASS', canvas.width / 2, 300);
      ctx.fillText('AVKLARAT', canvas.width / 2, 390);
      
      // Stats box
      const boxY = 500;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.roundRect(100, boxY, canvas.width - 200, 600, 30);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px system-ui';
      ctx.fillText(workoutData.dayName, canvas.width / 2, boxY + 80);
      
      ctx.font = '40px system-ui';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      
      let yPos = boxY + 180;
      if (workoutData.duration) {
        ctx.fillText(`⏱️ ${workoutData.duration} minuter`, canvas.width / 2, yPos);
        yPos += 70;
      }
      ctx.fillText(`🎯 ${workoutData.exerciseCount} övningar`, canvas.width / 2, yPos);
      yPos += 70;
      ctx.fillText(`📊 ${workoutData.totalSets} set`, canvas.width / 2, yPos);
      
      if (workoutData.newPBs && workoutData.newPBs.length > 0) {
        yPos += 100;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 44px system-ui';
        ctx.fillText('🏆 NYTT PB!', canvas.width / 2, yPos);
        ctx.font = '36px system-ui';
        ctx.fillText(workoutData.newPBs.join(', '), canvas.width / 2, yPos + 60);
      }
    } else if (cardioData) {
      const emoji = {
        'Löpning': '🏃',
        'Cykling': '🚴',
        'Simning': '🏊',
        'Promenad': '🚶',
        'Golf': '⛳',
        'Övrigt': '🏋️'
      }[cardioData.activityType] || '🏃';
      
      ctx.fillText(`${emoji} ${cardioData.activityType.toUpperCase()}`, canvas.width / 2, 300);
      ctx.fillText('AVKLARAT', canvas.width / 2, 390);
      
      // Stats box
      const boxY = 500;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.roundRect(100, boxY, canvas.width - 200, 500, 30);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '48px system-ui';
      
      let yPos = boxY + 100;
      ctx.fillText(`⏱️ ${cardioData.duration} minuter`, canvas.width / 2, yPos);
      
      if (cardioData.distance) {
        yPos += 100;
        ctx.fillText(`📍 ${cardioData.distance} km`, canvas.width / 2, yPos);
      }
      
      if (cardioData.calories) {
        yPos += 100;
        ctx.fillText(`🔥 ${cardioData.calories} kcal`, canvas.width / 2, yPos);
      }
    }

    // Branding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '32px system-ui';
    ctx.fillText('Gymdagboken.se', canvas.width / 2, canvas.height - 100);

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
          {/* Preview card */}
          <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg p-4 text-center">
            {workoutData && (
              <div className="space-y-2">
                <Dumbbell className="h-8 w-8 mx-auto text-primary" />
                <p className="font-bold text-lg">{workoutData.dayName}</p>
                <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                  {workoutData.duration && (
                    <span className="flex items-center gap-1">
                      <Timer className="h-4 w-4" />
                      {workoutData.duration} min
                    </span>
                  )}
                  <span>{workoutData.exerciseCount} övningar</span>
                  <span>{workoutData.totalSets} set</span>
                </div>
                {workoutData.newPBs && workoutData.newPBs.length > 0 && (
                  <div className="flex items-center justify-center gap-1 text-yellow-500">
                    <Trophy className="h-4 w-4" />
                    <span className="text-sm font-medium">Nytt PB!</span>
                  </div>
                )}
              </div>
            )}
            {cardioData && (
              <div className="space-y-2">
                <Flame className="h-8 w-8 mx-auto text-orange-500" />
                <p className="font-bold text-lg">{cardioData.activityType}</p>
                <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Timer className="h-4 w-4" />
                    {cardioData.duration} min
                  </span>
                  {cardioData.distance && <span>{cardioData.distance} km</span>}
                  {cardioData.calories && <span>{cardioData.calories} kcal</span>}
                </div>
              </div>
            )}
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
