import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, Medal, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

interface StreakUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  current_streak: number;
  longest_streak: number;
}

const StreakLeaderboardComponent = () => {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<StreakUser[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;
      
      const { data, error } = await supabase.rpc('get_streak_leaderboard', { limit_count: 10 });
      
      if (!error && data) {
        setLeaders(data as StreakUser[]);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = useCallback((index: number) => {
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
  }, []);

  const getStreakColor = useCallback((streak: number) => {
    if (streak >= 30) return 'text-red-500';
    if (streak >= 14) return 'text-orange-500';
    if (streak >= 7) return 'text-yellow-500';
    return 'text-muted-foreground';
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Streak-topplista
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (leaders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Streak-topplista
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Inga aktiva streaks ännu. Börja träna för att starta din streak!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <Flame className="h-5 w-5 text-orange-500" />
          </motion.div>
          Streak-topplista
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence mode="popLayout">
          {leaders.map((leader, index) => {
            const isCurrentUser = leader.user_id === user?.id;
            
            return (
              <motion.div 
                key={leader.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 100
                }}
                layout
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  isCurrentUser ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'
                }`}
              >
                <motion.div 
                  className="flex items-center justify-center w-6"
                  whileHover={{ scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  {getRankIcon(index)}
                </motion.div>
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={leader.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {leader.display_name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isCurrentUser ? 'text-primary' : ''}`}>
                    {leader.display_name || 'Anonym'}
                    {isCurrentUser && <span className="text-xs ml-1">(du)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Längsta: {leader.longest_streak} dagar
                  </p>
                </div>
                
                <motion.div
                  key={`streak-${leader.user_id}-${leader.current_streak}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Badge 
                    variant="secondary" 
                    className={`flex items-center gap-1 ${getStreakColor(leader.current_streak)}`}
                  >
                    <motion.div
                      animate={leader.current_streak >= 7 ? { 
                        scale: [1, 1.3, 1],
                        rotate: [0, 5, -5, 0]
                      } : {}}
                      transition={{ 
                        duration: 0.6, 
                        repeat: Infinity, 
                        repeatDelay: 1.5 
                      }}
                    >
                      <Flame className="h-3 w-3" />
                    </motion.div>
                    {leader.current_streak}
                  </Badge>
                </motion.div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

// Memoized export for better performance
export const StreakLeaderboard = memo(StreakLeaderboardComponent);
