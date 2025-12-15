import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Swords, Clock, X, Trophy, Users, ChevronDown, ChevronUp, History } from 'lucide-react';
import { usePoolChallenges } from '@/hooks/usePoolChallenges';
import { CreatePoolChallengeDialog } from './CreatePoolChallengeDialog';
import { PoolChallengeCard } from './PoolChallengeCard';
import { format, formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100 }
  }
};

const typeLabels: Record<string, string> = {
  workouts: 'Träningspass',
  sets: 'Set',
  minutes: 'Minuter',
  distance_km: 'Kilometer'
};

export function PoolChallenges() {
  const { myEntries, myChallenges, loading, cancelPoolEntry, refreshChallenges } = usePoolChallenges();
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  const waitingEntries = myEntries.filter(e => e.status === 'waiting');
  const activeChallenges = myChallenges.filter(c => c.status === 'active');
  const completedChallenges = myChallenges.filter(c => c.status === 'completed');

  // Check for expired challenges and trigger completion
  useEffect(() => {
    const checkExpiredChallenges = async () => {
      const hasExpired = activeChallenges.some(c => new Date(c.end_date) < new Date());
      if (hasExpired) {
        try {
          await supabase.functions.invoke('complete-pool-challenges');
          refreshChallenges();
        } catch (error) {
          console.error('Error completing challenges:', error);
        }
      }
    };

    if (activeChallenges.length > 0) {
      checkExpiredChallenges();
    }
  }, [activeChallenges, refreshChallenges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const displayedCompleted = showAllCompleted ? completedChallenges : completedChallenges.slice(0, 4);

  // Calculate stats
  const totalWins = completedChallenges.filter(c => c.winner_id === myChallenges[0]?.participants?.find(p => p.user_id)?.user_id).length;
  const totalXpWon = completedChallenges
    .filter(c => c.winner_id && c.participants?.some(p => p.user_id === c.winner_id))
    .reduce((acc, c) => {
      const meParticipant = c.participants?.find(p => p.user_id);
      if (meParticipant && c.winner_id === meParticipant.user_id) {
        return acc + c.xp_reward;
      }
      return acc;
    }, 0);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Create Challenge Button */}
      <motion.div variants={itemVariants}>
        <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              Hitta utmanare
            </CardTitle>
            <CardDescription>
              Tävla mot okända motståndare och vinn XP!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreatePoolChallengeDialog />
          </CardContent>
        </Card>
      </motion.div>

      {/* Waiting Entries */}
      <AnimatePresence>
        {waitingEntries.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Väntar på matchning
                  <Badge variant="secondary">{waitingEntries.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {waitingEntries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={entry.challenge_category === 'strength' ? 'default' : 'destructive'}>
                          {entry.challenge_category === 'strength' ? 'Styrka' : 'Kondition'}
                        </Badge>
                        <span className="font-medium">
                          {typeLabels[entry.challenge_type]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Mål: {entry.target_value} • {entry.duration_days} dagar
                        {entry.allow_multiple && ` • Max ${entry.max_participants} deltagare`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Senast start: {formatDistanceToNow(new Date(entry.latest_start_date), { 
                          addSuffix: true, 
                          locale: sv 
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => cancelPoolEntry(entry.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Challenges */}
      {activeChallenges.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Aktiva utmaningar
            <Badge>{activeChallenges.length}</Badge>
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {activeChallenges.map((challenge) => (
              <PoolChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Completed Challenges */}
      {completedChallenges.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              Avslutade utmaningar
              <Badge variant="secondary">{completedChallenges.length}</Badge>
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {displayedCompleted.map((challenge) => (
              <PoolChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>

          {completedChallenges.length > 4 && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowAllCompleted(!showAllCompleted)}
            >
              {showAllCompleted ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Visa färre
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Visa alla ({completedChallenges.length})
                </>
              )}
            </Button>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {waitingEntries.length === 0 && myChallenges.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="text-center py-12"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          </motion.div>
          <h3 className="text-lg font-medium mb-2">Inga utmaningar än</h3>
          <p className="text-muted-foreground mb-6">
            Skapa en utmaningsförfrågan för att hitta en motståndare!
          </p>
          <CreatePoolChallengeDialog />
        </motion.div>
      )}
    </motion.div>
  );
}
