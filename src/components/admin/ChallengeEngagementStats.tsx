import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Users, Target, Calendar, TrendingUp, Gift, PartyPopper, CheckCircle, Clock, BarChart3 } from "lucide-react";
import { format, isPast, isFuture } from "date-fns";
import { sv } from "date-fns/locale";

interface ChallengeStats {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_lottery: boolean;
  lottery_winner_id: string | null;
  lottery_drawn_at: string | null;
  target_value: number | null;
  winner_type: string;
  goal_description: string;
  goal_unit: string;
  participant_count: number;
  avg_progress: number;
  max_progress: number;
  completed_count: number;
}

interface ParticipantDetail {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  current_value: number;
  joined_at: string;
}

interface PoolChallengeStats {
  id: string;
  challenge_type: string;
  challenge_category: string;
  target_value: number;
  start_date: string;
  end_date: string;
  status: string;
  participant_count: number;
  avg_progress: number;
  max_progress: number;
}

interface OverallStats {
  totalCommunityChallenges: number;
  activeChallenges: number;
  totalParticipants: number;
  uniqueParticipants: number;
  completionRate: number;
  lotteriesDrawn: number;
  poolChallenges: number;
  poolParticipants: number;
}

export function ChallengeEngagementStats() {
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [challenges, setChallenges] = useState<ChallengeStats[]>([]);
  const [poolChallenges, setPoolChallenges] = useState<PoolChallengeStats[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantDetail[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  useEffect(() => {
    fetchChallengeStats();
  }, []);

  const fetchChallengeStats = async () => {
    try {
      // Fetch community challenges with participant stats
      const { data: challengesData, error: challengesError } = await supabase
        .from("community_challenges")
        .select("*")
        .order("created_at", { ascending: false });

      if (challengesError) throw challengesError;

      // Fetch participant counts for each challenge
      const challengeIds = (challengesData || []).map(c => c.id);
      
      const { data: participantsData, error: participantsError } = await supabase
        .from("community_challenge_participants")
        .select("challenge_id, current_value, user_id");

      if (participantsError) throw participantsError;

      // Calculate stats for each challenge
      const challengeStats: ChallengeStats[] = (challengesData || []).map(challenge => {
        const challengeParticipants = (participantsData || []).filter(
          p => p.challenge_id === challenge.id
        );
        const values = challengeParticipants.map(p => p.current_value);
        const completedCount = challenge.target_value 
          ? challengeParticipants.filter(p => p.current_value >= challenge.target_value).length 
          : 0;

        return {
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          start_date: challenge.start_date,
          end_date: challenge.end_date,
          is_active: challenge.is_active,
          is_lottery: challenge.is_lottery,
          lottery_winner_id: challenge.lottery_winner_id,
          lottery_drawn_at: challenge.lottery_drawn_at,
          target_value: challenge.target_value,
          winner_type: challenge.winner_type,
          goal_description: challenge.goal_description,
          goal_unit: challenge.goal_unit,
          participant_count: challengeParticipants.length,
          avg_progress: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
          max_progress: values.length > 0 ? Math.max(...values) : 0,
          completed_count: completedCount,
        };
      });

      setChallenges(challengeStats);

      // Fetch pool challenges
      const { data: poolData, error: poolError } = await supabase
        .from("pool_challenges")
        .select("*")
        .order("created_at", { ascending: false });

      if (poolError) throw poolError;

      const { data: poolParticipantsData } = await supabase
        .from("pool_challenge_participants")
        .select("challenge_id, current_value");

      const poolStats: PoolChallengeStats[] = (poolData || []).map(pc => {
        const pcParticipants = (poolParticipantsData || []).filter(
          p => p.challenge_id === pc.id
        );
        const values = pcParticipants.map(p => p.current_value);

        return {
          id: pc.id,
          challenge_type: pc.challenge_type,
          challenge_category: pc.challenge_category,
          target_value: pc.target_value,
          start_date: pc.start_date,
          end_date: pc.end_date,
          status: pc.status,
          participant_count: pcParticipants.length,
          avg_progress: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
          max_progress: values.length > 0 ? Math.max(...values) : 0,
        };
      });

      setPoolChallenges(poolStats);

      // Calculate overall stats
      const uniqueParticipantIds = new Set((participantsData || []).map(p => p.user_id));
      const activeChallenges = challengeStats.filter(c => c.is_active && !isPast(new Date(c.end_date)));
      const totalCompleted = challengeStats.reduce((sum, c) => sum + c.completed_count, 0);
      const totalParticipants = challengeStats.reduce((sum, c) => sum + c.participant_count, 0);

      setOverallStats({
        totalCommunityChallenges: challengeStats.length,
        activeChallenges: activeChallenges.length,
        totalParticipants: totalParticipants,
        uniqueParticipants: uniqueParticipantIds.size,
        completionRate: totalParticipants > 0 ? Math.round((totalCompleted / totalParticipants) * 100) : 0,
        lotteriesDrawn: challengeStats.filter(c => c.lottery_drawn_at).length,
        poolChallenges: poolStats.length,
        poolParticipants: (poolParticipantsData || []).length,
      });

    } catch (error) {
      console.error("Error fetching challenge stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async (challengeId: string) => {
    setParticipantsLoading(true);
    setSelectedChallenge(challengeId);
    
    try {
      const { data: participantsData, error } = await supabase
        .from("community_challenge_participants")
        .select("user_id, current_value, joined_at")
        .eq("challenge_id", challengeId)
        .order("current_value", { ascending: false });

      if (error) throw error;

      // Fetch profiles
      const userIds = (participantsData || []).map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profilesMap = new Map((profiles || []).map(p => [p.user_id, p]));

      const enrichedParticipants: ParticipantDetail[] = (participantsData || []).map(p => ({
        user_id: p.user_id,
        display_name: profilesMap.get(p.user_id)?.display_name || "Okänd",
        avatar_url: profilesMap.get(p.user_id)?.avatar_url || null,
        current_value: p.current_value,
        joined_at: p.joined_at,
      }));

      setParticipants(enrichedParticipants);
    } catch (error) {
      console.error("Error fetching participants:", error);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const getChallengeStatus = (challenge: ChallengeStats) => {
    const now = new Date();
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);

    if (!challenge.is_active) return { label: "Inaktiv", color: "bg-gray-500" };
    if (isFuture(start)) return { label: "Kommande", color: "bg-yellow-500" };
    if (isPast(end)) return { label: "Avslutad", color: "bg-muted" };
    return { label: "Pågår", color: "bg-green-500" };
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("sv-SE").format(Math.round(num * 10) / 10);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Laddar tävlingsstatistik...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats?.totalCommunityChallenges || 0}</p>
                <p className="text-sm text-muted-foreground">Community-tävlingar</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats?.uniqueParticipants || 0}</p>
                <p className="text-sm text-muted-foreground">Unika deltagare</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <CheckCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats?.completionRate || 0}%</p>
                <p className="text-sm text-muted-foreground">Genomförandegrad</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <Gift className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallStats?.lotteriesDrawn || 0}</p>
                <p className="text-sm text-muted-foreground">Utlottningar gjorda</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="community" className="space-y-4">
        <TabsList>
          <TabsTrigger value="community">Community-tävlingar</TabsTrigger>
          <TabsTrigger value="pool">Pool-utmaningar</TabsTrigger>
        </TabsList>

        <TabsContent value="community" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Community-tävlingar
              </CardTitle>
              <CardDescription>
                Alla tävlingar med deltagarstatistik
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tävling</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead className="text-right">Deltagare</TableHead>
                      <TableHead className="text-right">Genomfört</TableHead>
                      <TableHead className="text-right">Snitt progress</TableHead>
                      <TableHead className="text-right">Högst</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {challenges.map((challenge) => {
                      const status = getChallengeStatus(challenge);
                      return (
                        <TableRow key={challenge.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{challenge.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(challenge.start_date), "d MMM", { locale: sv })} - {format(new Date(challenge.end_date), "d MMM", { locale: sv })}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={status.color + " text-white"}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {challenge.is_lottery ? (
                              <Badge variant="outline" className="gap-1">
                                <Gift className="h-3 w-3" /> Lotteri
                              </Badge>
                            ) : (
                              <Badge variant="outline">{challenge.winner_type}</Badge>
                            )}
                            {challenge.lottery_drawn_at && (
                              <Badge variant="default" className="ml-1 gap-1 bg-amber-500">
                                <PartyPopper className="h-3 w-3" /> Draget
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {challenge.participant_count}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span>{challenge.completed_count}</span>
                              {challenge.target_value && challenge.participant_count > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({Math.round((challenge.completed_count / challenge.participant_count) * 100)}%)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(challenge.avg_progress)} {challenge.goal_unit}
                          </TableCell>
                          <TableCell className="text-right font-medium text-primary">
                            {formatNumber(challenge.max_progress)} {challenge.goal_unit}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => fetchParticipants(challenge.id)}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {challenges.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Inga tävlingar hittades
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Participants Detail */}
          {selectedChallenge && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Deltagare - {challenges.find(c => c.id === selectedChallenge)?.title}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedChallenge(null)}>
                    Stäng
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {participantsLoading ? (
                  <div className="py-4 text-center text-muted-foreground">Laddar...</div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Placering</TableHead>
                          <TableHead>Deltagare</TableHead>
                          <TableHead className="text-right">Progress</TableHead>
                          <TableHead className="text-right">Anmäld</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participants.map((p, index) => {
                          const challenge = challenges.find(c => c.id === selectedChallenge);
                          const progressPercent = challenge?.target_value 
                            ? Math.min((p.current_value / challenge.target_value) * 100, 100)
                            : 0;
                          
                          return (
                            <TableRow key={p.user_id}>
                              <TableCell>
                                <span className={`font-bold ${
                                  index === 0 ? "text-yellow-500" :
                                  index === 1 ? "text-gray-400" :
                                  index === 2 ? "text-amber-600" : ""
                                }`}>
                                  #{index + 1}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {p.avatar_url ? (
                                    <img src={p.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                                  ) : (
                                    <div className="h-8 w-8 rounded-full bg-muted" />
                                  )}
                                  <span>{p.display_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Progress value={progressPercent} className="w-20 h-2" />
                                  <span className="font-medium min-w-[60px]">
                                    {p.current_value} {challenge?.goal_unit}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {format(new Date(p.joined_at), "d MMM HH:mm", { locale: sv })}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pool" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Pool-utmaningar
              </CardTitle>
              <CardDescription>
                Matchade utmaningar mellan användare
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-4">
                      <BarChart3 className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-2xl font-bold">{overallStats?.poolChallenges || 0}</p>
                        <p className="text-sm text-muted-foreground">Totalt pool-utmaningar</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-4">
                      <Users className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{overallStats?.poolParticipants || 0}</p>
                        <p className="text-sm text-muted-foreground">Pool-deltagare totalt</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Typ</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Mål</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Deltagare</TableHead>
                      <TableHead className="text-right">Snitt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poolChallenges.map((pc) => (
                      <TableRow key={pc.id}>
                        <TableCell className="font-medium">{pc.challenge_type}</TableCell>
                        <TableCell>{pc.challenge_category}</TableCell>
                        <TableCell>{pc.target_value}</TableCell>
                        <TableCell>
                          <Badge variant={pc.status === "active" ? "default" : "secondary"}>
                            {pc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{pc.participant_count}</TableCell>
                        <TableCell className="text-right">{formatNumber(pc.avg_progress)}</TableCell>
                      </TableRow>
                    ))}
                    {poolChallenges.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Inga pool-utmaningar hittades
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
