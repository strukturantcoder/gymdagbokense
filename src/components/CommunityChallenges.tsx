import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Trophy, Users, Calendar, Target, Check, UserPlus, LogOut } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { sv } from "date-fns/locale";

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
  const [loading, setLoading] = useState(true);

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
      const { data: challengesData, error: challengesError } = await supabase
        .from("community_challenges")
        .select("*")
        .eq("is_active", true)
        .order("start_date", { ascending: true });

      if (challengesError) throw challengesError;
      setChallenges(challengesData || []);

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

        // Fetch profiles for participants
        const userIds = [...new Set(participantsData?.map(p => p.user_id) || [])];
        let profilesMap: Record<string, string | null> = {};
        
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", userIds);
          
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
              </div>

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

              {/* Leaderboard preview */}
              {participants.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Topplista</h4>
                  <div className="space-y-1">
                    {participants.slice(0, 5).map((p, index) => (
                      <div 
                        key={p.user_id} 
                        className={`flex items-center justify-between text-sm py-1 px-2 rounded ${
                          p.user_id === user?.id ? "bg-primary/10" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-5 text-center ${index === 0 ? "text-yellow-500 font-bold" : "text-muted-foreground"}`}>
                            {index + 1}
                          </span>
                          <span className={p.user_id === user?.id ? "font-medium" : ""}>
                            {p.display_name}
                            {p.user_id === user?.id && " (du)"}
                          </span>
                        </div>
                        <span className="font-medium">
                          {p.current_value} {challenge.goal_unit}
                        </span>
                      </div>
                    ))}
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
