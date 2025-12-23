import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Users, UserPlus } from 'lucide-react';
import { TeamLeaderboardEntry } from '@/hooks/useTeams';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface TeamLeaderboardProps {
  leaderboard: TeamLeaderboardEntry[];
  loading: boolean;
}

export const TeamLeaderboard = ({ leaderboard, loading }: TeamLeaderboardProps) => {
  const { user } = useAuth();

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center text-sm font-medium text-muted-foreground">{index + 1}</span>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gym-orange" />
            Lagtopplista
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gym-orange" />
            Lagtopplista
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Inga lag har skapats ännu. Bli först med att skapa ett lag!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-gym-orange" />
          Lagtopplista
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {leaderboard.map((entry, index) => {
          const isMyTeam = entry.leader_id === user?.id;
          
          return (
            <motion.div
              key={entry.team_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                isMyTeam 
                  ? 'bg-primary/10 border border-primary/20' 
                  : 'bg-secondary/30 hover:bg-secondary/50'
              }`}
            >
              <div className="flex items-center justify-center w-6">
                {getRankIcon(index)}
              </div>
              
              <Avatar className="h-10 w-10">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {entry.team_name[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${isMyTeam ? 'text-primary' : ''}`}>
                  {entry.team_name}
                  {isMyTeam && <span className="text-xs ml-1">(ditt lag)</span>}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {entry.member_count}/10
                  </span>
                  <span>{entry.total_xp.toLocaleString()} XP</span>
                </div>
              </div>
              
              <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <UserPlus className="h-3 w-3" />
                {entry.invited_joined_count}
              </Badge>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
};
