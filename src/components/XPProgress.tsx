import { UserStats, useSocial } from '@/hooks/useSocial';
import { Progress } from '@/components/ui/progress';
import { Star } from 'lucide-react';

interface XPProgressProps {
  stats: UserStats | null;
  compact?: boolean;
}

export default function XPProgress({ stats, compact = false }: XPProgressProps) {
  const { getLevelFromXP, getXPForNextLevel } = useSocial();
  
  if (!stats) return null;
  
  const currentLevel = getLevelFromXP(stats.total_xp);
  const currentLevelXP = getXPForNextLevel(currentLevel - 1);
  const nextLevelXP = getXPForNextLevel(currentLevel);
  const progressXP = stats.total_xp - currentLevelXP;
  const neededXP = nextLevelXP - currentLevelXP;
  const progressPercent = Math.min(100, (progressXP / neededXP) * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center">
          <span className="text-sm font-bold text-primary-foreground">{currentLevel}</span>
        </div>
        <div className="flex-1">
          <Progress value={progressPercent} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground">{stats.total_xp} XP</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold text-primary-foreground">{currentLevel}</span>
          </div>
          <div>
            <p className="font-display font-bold">Nivå {currentLevel}</p>
            <p className="text-sm text-muted-foreground">{stats.total_xp} XP totalt</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{progressXP} / {neededXP}</p>
          <p className="text-xs text-muted-foreground">till nästa nivå</p>
        </div>
      </div>
      <Progress value={progressPercent} className="h-3" />
      <div className="grid grid-cols-3 gap-4 pt-2">
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.total_workouts}</p>
          <p className="text-xs text-muted-foreground">Träningspass</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.total_sets}</p>
          <p className="text-xs text-muted-foreground">Sets</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.total_minutes}</p>
          <p className="text-xs text-muted-foreground">Minuter</p>
        </div>
      </div>
    </div>
  );
}