import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, Heart, MessageCircle, Trophy, Clock, Target, Timer, Medal, Star, TrendingUp } from 'lucide-react';
import { PoolChallenge } from '@/hooks/usePoolChallenges';
import { PoolChallengeChat } from './PoolChallengeChat';
import { useAuth } from '@/hooks/useAuth';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { sv } from 'date-fns/locale';

interface PoolChallengeCardProps {
  challenge: PoolChallenge;
}

const typeLabels: Record<string, string> = {
  workouts: 'Träningspass',
  sets: 'Set',
  minutes: 'Minuter',
  distance_km: 'Kilometer'
};

const typeIcons: Record<string, typeof Dumbbell> = {
  workouts: Dumbbell,
  sets: Target,
  minutes: Clock,
  distance_km: Target
};

export function PoolChallengeCard({ challenge }: PoolChallengeCardProps) {
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);

  const TypeIcon = typeIcons[challenge.challenge_type] || Dumbbell;
  const daysLeft = differenceInDays(new Date(challenge.end_date), new Date());
  const hoursLeft = differenceInHours(new Date(challenge.end_date), new Date());
  const isActive = challenge.status === 'active' && daysLeft >= 0;
  const isCompleted = challenge.status === 'completed' || daysLeft < 0;

  // Sort participants by current_value descending
  const sortedParticipants = [...(challenge.participants || [])].sort(
    (a, b) => b.current_value - a.current_value
  );

  const leader = sortedParticipants[0];
  const myParticipation = challenge.participants?.find(p => p.user_id === user?.id);
  const myPosition = sortedParticipants.findIndex(p => p.user_id === user?.id) + 1;
  const didIWin = challenge.winner_id === user?.id;
  const winner = sortedParticipants.find(p => p.user_id === challenge.winner_id);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <Card className={`overflow-hidden ${isCompleted ? 'border-muted' : ''} ${didIWin ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-transparent' : ''}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${
                  challenge.challenge_category === 'strength' 
                    ? 'bg-primary/10 text-primary' 
                    : 'bg-red-500/10 text-red-500'
                }`}>
                  {challenge.challenge_category === 'strength' ? (
                    <Dumbbell className="w-5 h-5" />
                  ) : (
                    <Heart className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-base">
                    {challenge.challenge_category === 'strength' ? 'Styrka' : 'Kondition'}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <TypeIcon className="w-3 h-3" />
                    {typeLabels[challenge.challenge_type]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isActive && (
                  <Badge variant="default" className="bg-green-500">
                    <Timer className="w-3 h-3 mr-1" />
                    {daysLeft > 0 ? `${daysLeft}d kvar` : `${hoursLeft}h kvar`}
                  </Badge>
                )}
                {isCompleted && didIWin && (
                  <Badge className="bg-yellow-500 text-black">
                    <Trophy className="w-3 h-3 mr-1" />
                    Vinnare!
                  </Badge>
                )}
                {isCompleted && !didIWin && (
                  <Badge variant="secondary">
                    <Medal className="w-3 h-3 mr-1" />
                    #{myPosition}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Completed Challenge Summary */}
            {isCompleted && (
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Period</span>
                  <span className="text-sm font-medium">
                    {format(new Date(challenge.start_date), 'd MMM', { locale: sv })} - {format(new Date(challenge.end_date), 'd MMM yyyy', { locale: sv })}
                  </span>
                </div>
                
                {winner && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Vinnare</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 ring-2 ring-yellow-500">
                        <AvatarImage src={winner.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {winner.profile?.display_name?.slice(0, 2).toUpperCase() || '??'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">
                        {winner.profile?.display_name || 'Anonym'}
                        {winner.user_id === user?.id && ' (du)'}
                      </span>
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                  </div>
                )}

                {!winner && (
                  <div className="text-center py-2 text-sm text-muted-foreground">
                    Ingen vinnare - ingen aktivitet
                  </div>
                )}

                {myParticipation && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-sm text-muted-foreground">Ditt resultat</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{myParticipation.current_value}</span>
                      <span className="text-xs text-muted-foreground">
                        {typeLabels[challenge.challenge_type].toLowerCase()}
                      </span>
                      {didIWin && (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                          <Star className="w-3 h-3 mr-1" />
                          +{challenge.xp_reward} XP
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Target - only show for active */}
            {isActive && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mål</span>
                <span className="font-bold">{challenge.target_value} {typeLabels[challenge.challenge_type].toLowerCase()}</span>
              </div>
            )}

            {/* Participants & Progress */}
            <div className="space-y-3">
              {sortedParticipants.map((participant, index) => {
                const isMe = participant.user_id === user?.id;
                const progress = (participant.current_value / challenge.target_value) * 100;
                const isLeading = index === 0;
                const isWinner = isCompleted && participant.user_id === challenge.winner_id;

                return (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg ${
                      isWinner 
                        ? 'bg-yellow-500/10 border border-yellow-500/30' 
                        : isMe 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${isWinner ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                          #{index + 1}
                        </span>
                        <Avatar className={`h-8 w-8 ${isWinner ? 'ring-2 ring-yellow-500' : isLeading && isActive ? 'ring-2 ring-primary' : ''}`}>
                          <AvatarImage src={participant.profile?.avatar_url || undefined} />
                          <AvatarFallback className={isMe ? 'bg-primary text-primary-foreground' : ''}>
                            {participant.profile?.display_name?.slice(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`font-medium ${isMe ? 'text-primary' : ''}`}>
                          {participant.profile?.display_name || 'Anonym'}
                          {isMe && ' (du)'}
                        </span>
                        {isWinner && (
                          <Trophy className="w-4 h-4 text-yellow-500" />
                        )}
                        {isLeading && isActive && !isCompleted && (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <span className="font-bold">
                        {participant.current_value}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(progress, 100)} 
                      className={`h-2 ${isWinner ? '[&>div]:bg-yellow-500' : isMe ? '[&>div]:bg-primary' : ''}`}
                    />
                  </motion.div>
                );
              })}
            </div>

            {/* XP Reward */}
            <div className="flex items-center justify-between pt-2 border-t text-sm">
              <span className="text-muted-foreground">
                {isCompleted ? 'XP utdelat' : 'XP för vinnaren'}
              </span>
              <span className={`font-bold ${didIWin ? 'text-yellow-500' : 'text-primary'}`}>
                {didIWin ? `+${challenge.xp_reward} XP vunnet!` : `+${challenge.xp_reward} XP`}
              </span>
            </div>

            {/* Actions */}
            {isActive && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setChatOpen(true)}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chatt
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <PoolChallengeChat
        challenge={challenge}
        open={chatOpen}
        onOpenChange={setChatOpen}
      />
    </>
  );
}
