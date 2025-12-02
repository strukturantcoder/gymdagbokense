import { Achievement, UserAchievement } from '@/hooks/useSocial';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';

interface AchievementsListProps {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
}

export default function AchievementsList({ achievements, userAchievements }: AchievementsListProps) {
  const earnedIds = new Set(userAchievements.map(ua => ua.achievement_id));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {achievements.map((achievement) => {
        const isEarned = earnedIds.has(achievement.id);
        
        return (
          <Card 
            key={achievement.id} 
            className={`transition-all ${isEarned ? 'border-gym-orange/50 bg-gym-orange/5' : 'opacity-60'}`}
          >
            <CardContent className="p-4 text-center">
              <div className={`text-4xl mb-2 ${!isEarned && 'grayscale'}`}>
                {isEarned ? achievement.icon : <Lock className="w-8 h-8 mx-auto text-muted-foreground" />}
              </div>
              <p className="font-medium text-sm">{achievement.name}</p>
              <p className="text-xs text-muted-foreground mb-2">{achievement.description}</p>
              <Badge variant={isEarned ? 'default' : 'secondary'} className="text-xs">
                +{achievement.xp_reward} XP
              </Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}