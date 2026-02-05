import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Trophy, Users, Calendar, Target, Check, UserPlus, LogOut, TrendingDown, Gift, PartyPopper } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { sv } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface CommunityChallenge {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  goal_description: string;
  goal_unit: string;
  target_value: number | null;
  winner_type: string;
  start_date: string;
  end_date: string;
  is_lottery: boolean;
  lottery_winner_id: string | null;
  lottery_drawn_at: string | null;
}

interface LotteryWinnerInfo {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Participant {
  user_id: string;
  current_value: number;
  display_name: string | null;
}

export function CommunityChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [participantData, setParticipantData] = useState<Record<string, Participant[]>>({});
  const [myParticipations, setMyParticipations] = useState<Set<string>>(new Set());
  const [lotteryWinners, setLotteryWinners] = useState<Record<string, LotteryWinnerInfo>>({});
  const [loading, setLoading] = useState(true);
  const [expandedLeaderboards, setExpandedLeaderboards] = useState<Set<string>>(new Set());
  const [rankChangedChallenges, setRankChangedChallenges] = useState<Set<string>>(new Set());
  const previousRanksRef = useRef<Record<string, number>>({});

  const toggleLeaderboard = (challengeId: string) => {
    setExpandedLeaderboards(prev => {
      const next = new Set(prev);
      if (next.has(challengeId)) {
        next.delete(challengeId);
      } else {
        next.add(challengeId);
      }
      return next;
    });
  };

  useEffect(() => {
    fetchChallenges();
  }, [user]);

  // Subscribe to realtime updates for participants
  useEffect(() => {
    const channel = supabase
      .channel('community-challenge-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_challenge_participants'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchChallenges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchChallenges = async () => {
    try {
      // Fetch active challenges
      // Select only necessary fields, excluding created_by for security
      const { data: challengesData, error: challengesError } = await supabase
        .from("community_challenges")
        .select("id, title, description, theme, goal_description, goal_unit, target_value, winner_type, start_date, end_date, is_active, is_lottery, lottery_winner_id, lottery_drawn_at")
        .eq("is_active", true)
        .order("start_date", { ascending: true });

      if (challengesError) throw challengesError;
      setChallenges(challengesData || []);

      // Fetch lottery winner profiles
      const lotteryWinnerIds = (challengesData || [])
        .filter(c => c.lottery_winner_id)
        .map(c => c.lottery_winner_id as string);

      if (lotteryWinnerIds.length > 0) {
        const { data: winnerProfiles, error: winnerProfilesError } = await supabase
          .rpc("get_public_profile_first_names", { user_ids: lotteryWinnerIds });

        if (winnerProfilesError) throw winnerProfilesError;

        const winnersMap: Record<string, LotteryWinnerInfo> = {};
        (winnerProfiles || []).forEach(p => {
          winnersMap[p.user_id] = {
            user_id: p.user_id,
            display_name: p.display_name,
            avatar_url: p.avatar_url
          };
        });
        setLotteryWinners(winnersMap);
      }

      if (challengesData && challengesData.length > 0) {
        // Fetch participants for all challenges
        const { data: participantsData, error: participantsError } = await supabase
          .from("community_challenge_participants")
          .select(`
            challenge_id,
            user_id,
            current_value
          `)
          .in("challenge_id", challengesData.map(c => c.id));

        if (participantsError) throw participantsError;

        // Fetch display names for participants via a SECURITY DEFINER RPC (avoids profile RLS issues)
        const userIds = [...new Set(participantsData?.map(p => p.user_id) || [])];
        let profilesMap: Record<string, string | null> = {};
        
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .rpc("get_public_profile_first_names", { user_ids: userIds });
          if (profilesError) throw profilesError;
          
          profilesMap = (profilesData || []).reduce((acc, p) => {
            acc[p.user_id] = p.display_name;
            return acc;
          }, {} as Record<string, string | null>);
        }

        // Group participants by challenge
        const grouped: Record<string, Participant[]> = {};
        const myJoined = new Set<string>();

        participantsData?.forEach(p => {
          if (!grouped[p.challenge_id]) {
            grouped[p.challenge_id] = [];
          }
          grouped[p.challenge_id].push({
            user_id: p.user_id,
            current_value: p.current_value,
            // RPC already returns full name for me, first name for others
            display_name: profilesMap[p.user_id] || "Anonym",
          });
          
          if (p.user_id === user?.id) {
            myJoined.add(p.challenge_id);
          }
        });

        // Sort participants by current_value descending
        Object.keys(grouped).forEach(key => {
          grouped[key].sort((a, b) => b.current_value - a.current_value);
        });

        // Check for rank changes and notify user
        if (user?.id) {
          const newRanks: Record<string, number> = {};
          const changedChallenges = new Set<string>();
          
          Object.keys(grouped).forEach(challengeId => {
            const participants = grouped[challengeId];
            const myIndex = participants.findIndex(p => p.user_id === user.id);
            
            if (myIndex !== -1) {
              const myRank = myIndex + 1;
              newRanks[challengeId] = myRank;
              
              const previousRank = previousRanksRef.current[challengeId];
              
              // If rank changed at all, trigger animation
              if (previousRank !== undefined && myRank !== previousRank) {
                changedChallenges.add(challengeId);
              }
              
              // If we had a previous rank and it's now worse (higher number)
              if (previousRank !== undefined && myRank > previousRank) {
                const challenge = challengesData.find(c => c.id === challengeId);
                const whoPassedMe = participants[myRank - 2]; // The person now above us
                
                if (challenge && whoPassedMe) {
                  toast.warning(
                    `${whoPassedMe.display_name} gick om dig i "${challenge.title}"!`,
                    {
                      description: `Du är nu på plats ${myRank}`,
                      icon: <TrendingDown className="h-4 w-4" />,
                      duration: 5000,
                    }
                  );
                }
              }
            }
          });
          
          // Trigger animation for changed ranks
          if (changedChallenges.size > 0) {
            setRankChangedChallenges(changedChallenges);
            // Clear animation after 2 seconds
            setTimeout(() => setRankChangedChallenges(new Set()), 2000);
          }
          
          previousRanksRef.current = newRanks;
        }

        setParticipantData(grouped);
        setMyParticipations(myJoined);
      }
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast.error("Kunde inte hämta tävlingar");
    } finally {
      setLoading(false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    if (!user) {
      toast.error("Du måste vara inloggad för att delta");
      return;
    }

    try {
      const { error } = await supabase
        .from("community_challenge_participants")
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
        });

      if (error) throw error;

      setMyParticipations(prev => new Set([...prev, challengeId]));
      toast.success("Du är nu anmäld till tävlingen!");
      fetchChallenges();
    } catch (error) {
      console.error("Error joining challenge:", error);
      toast.error("Kunde inte anmäla dig till tävlingen");
    }
  };

  const leaveChallenge = async (challengeId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("community_challenge_participants")
        .delete()
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id);

      if (error) throw error;

      setMyParticipations(prev => {
        const next = new Set(prev);
        next.delete(challengeId);
        return next;
      });
      toast.success("Du har lämnat tävlingen");
      fetchChallenges();
    } catch (error) {
      console.error("Error leaving challenge:", error);
      toast.error("Kunde inte lämna tävlingen");
    }
  };

  const getChallengeStatus = (challenge: CommunityChallenge) => {
    const now = new Date();
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);

    if (isFuture(start)) return "upcoming";
    if (isPast(end)) return "ended";
    return "active";
  };

  if (loading) {
    return (
      <div className="animate-pulse text-muted-foreground text-center py-8">
        Laddar community-tävlingar...
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Inga aktiva community-tävlingar just nu</p>
          <p className="text-sm mt-2">Kom tillbaka senare för nya utmaningar!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {challenges.map((challenge) => {
        const status = getChallengeStatus(challenge);
        const participants = participantData[challenge.id] || [];
        const isJoined = myParticipations.has(challenge.id);
        const myProgress = participants.find(p => p.user_id === user?.id);
        const leader = participants[0];

        return (
          <Card key={challenge.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                    {challenge.theme && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {challenge.theme}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      status === "active" 
                        ? "bg-green-500/10 text-green-500" 
                        : status === "upcoming"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {status === "active" ? "Pågår" : status === "upcoming" ? "Kommer snart" : "Avslutad"}
                    </span>
                  </div>
                  {challenge.description && (
                    <CardDescription className="mt-1">{challenge.description}</CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Challenge info */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(challenge.start_date), "d MMM", { locale: sv })} - {format(new Date(challenge.end_date), "d MMM", { locale: sv })}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  {challenge.goal_description} ({challenge.goal_unit})
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {participants.length} deltagare
                </span>
                {challenge.is_lottery && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <Gift className="h-4 w-4" />
                    Utlottning
                  </span>
                )}
              </div>

              {/* Lottery Winner Banner */}
              {challenge.is_lottery && challenge.lottery_winner_id && challenge.lottery_drawn_at && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/30 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500/20 rounded-full p-2">
                      <PartyPopper className="h-6 w-6 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                        🎉 Vinnare av utlottningen!
                      </p>
                      <p className="text-lg font-bold text-foreground">
                        {lotteryWinners[challenge.lottery_winner_id]?.display_name || "Okänd"}
                        {challenge.lottery_winner_id === user?.id && (
                          <span className="ml-2 text-amber-500">(Det är du! 🎊)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Draget {format(new Date(challenge.lottery_drawn_at), "d MMMM yyyy 'kl.' HH:mm", { locale: sv })}
                      </p>
                    </div>
                    <Trophy className="h-8 w-8 text-amber-500" />
                  </div>
                </motion.div>
              )}

              {/* Progress for joined users */}
              {isJoined && myProgress && challenge.target_value && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Din progress</span>
                    <span>{myProgress.current_value} / {challenge.target_value} {challenge.goal_unit}</span>
                  </div>
                  <Progress value={(myProgress.current_value / challenge.target_value) * 100} />
                </div>
              )}

              {/* Leaderboard */}
              {participants.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">Topplista</h4>
                    {participants.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() => toggleLeaderboard(challenge.id)}
                      >
                        {expandedLeaderboards.has(challenge.id) 
                          ? "Visa mindre" 
                          : `Visa alla (${participants.length})`}
                      </Button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                      {(expandedLeaderboards.has(challenge.id) ? participants : participants.slice(0, 5)).map((p, index) => {
                        const isMe = p.user_id === user?.id;
                        const hasRankChanged = isMe && rankChangedChallenges.has(challenge.id);
                        
                        return (
                          <motion.div 
                            key={p.user_id}
                            layout
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ 
                              opacity: 1, 
                              y: 0,
                              scale: hasRankChanged ? [1, 1.02, 1] : 1,
                              backgroundColor: hasRankChanged 
                                ? ["hsl(var(--primary) / 0.1)", "hsl(var(--primary) / 0.3)", "hsl(var(--primary) / 0.1)"]
                                : isMe ? "hsl(var(--primary) / 0.1)" : "transparent"
                            }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ 
                              duration: hasRankChanged ? 0.6 : 0.2,
                              repeat: hasRankChanged ? 2 : 0
                            }}
                            className={`flex items-center justify-between text-sm py-1 px-2 rounded`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-5 text-center ${
                                index === 0 ? "text-yellow-500 font-bold" : 
                                index === 1 ? "text-gray-400 font-medium" :
                                index === 2 ? "text-amber-600 font-medium" :
                                "text-muted-foreground"
                              }`}>
                                {index + 1}
                              </span>
                              <span className={isMe ? "font-medium" : ""}>
                                {p.display_name}
                                {isMe && " (du)"}
                              </span>
                            </div>
                            <span className="font-medium">
                              {p.current_value} {challenge.goal_unit}
                            </span>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {/* Show user's position if not in top 5 and not expanded */}
                    {!expandedLeaderboards.has(challenge.id) && user?.id && (() => {
                      const myIndex = participants.findIndex(p => p.user_id === user.id);
                      if (myIndex >= 5) {
                        const myData = participants[myIndex];
                        const hasRankChanged = rankChangedChallenges.has(challenge.id);
                        return (
                          <>
                            <div className="text-center text-muted-foreground text-xs py-1">···</div>
                            <motion.div 
                              animate={{ 
                                scale: hasRankChanged ? [1, 1.02, 1] : 1,
                                backgroundColor: hasRankChanged 
                                  ? ["hsl(var(--primary) / 0.1)", "hsl(var(--primary) / 0.3)", "hsl(var(--primary) / 0.1)"]
                                  : "hsl(var(--primary) / 0.1)"
                              }}
                              transition={{ 
                                duration: hasRankChanged ? 0.6 : 0.2,
                                repeat: hasRankChanged ? 2 : 0
                              }}
                              className="flex items-center justify-between text-sm py-1 px-2 rounded"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 text-center text-muted-foreground">
                                  {myIndex + 1}
                                </span>
                                <span className="font-medium">
                                  {myData.display_name} (du)
                                </span>
                              </div>
                              <span className="font-medium">
                                {myData.current_value} {challenge.goal_unit}
                              </span>
                            </motion.div>
                          </>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}

              {/* Join/Leave buttons */}
              <div className="pt-2">
                {!user ? (
                  <p className="text-sm text-muted-foreground">Logga in för att delta</p>
                ) : isJoined ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => leaveChallenge(challenge.id)}
                    disabled={status === "ended"}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Lämna tävling
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    onClick={() => joinChallenge(challenge.id)}
                    disabled={status === "ended"}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Delta i tävlingen
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
