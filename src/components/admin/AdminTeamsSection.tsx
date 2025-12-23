import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Trophy, ChevronLeft, ChevronRight, Crown, UserPlus, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

interface TeamData {
  id: string;
  name: string;
  description: string | null;
  leader_id: string;
  avatar_url: string | null;
  created_at: string;
  memberCount: number;
  totalXp: number;
  invitedCount: number;
  leader: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  invited_by: string | null;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  stats: {
    level: number;
    total_xp: number;
    total_workouts: number;
  } | null;
  inviterName: string | null;
}

interface TopInviter {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  inviteCount: number;
}

export function AdminTeamsSection() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [teamsTotal, setTeamsTotal] = useState(0);
  const [teamsPage, setTeamsPage] = useState(0);
  const [teamsLoading, setTeamsLoading] = useState(false);
  
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  
  const [topInviters, setTopInviters] = useState<TopInviter[]>([]);
  const [invitersLoading, setInvitersLoading] = useState(false);
  
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchTeams(0);
    fetchTopInviters();
  }, []);

  const fetchTeams = async (page: number) => {
    setTeamsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-lookup", {
        body: { action: "listTeams", limit: PAGE_SIZE, offset: page * PAGE_SIZE }
      });
      
      if (error) throw error;
      setTeams(data.teams || []);
      setTeamsTotal(data.total || 0);
      setTeamsPage(page);
    } catch (err) {
      console.error("Error fetching teams:", err);
    } finally {
      setTeamsLoading(false);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    setMembersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-lookup", {
        body: { action: "listTeamMembers", teamId }
      });
      
      if (error) throw error;
      setTeamMembers(data.members || []);
    } catch (err) {
      console.error("Error fetching team members:", err);
    } finally {
      setMembersLoading(false);
    }
  };

  const fetchTopInviters = async () => {
    setInvitersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-lookup", {
        body: { action: "listTopInviters", limit: 20 }
      });
      
      if (error) throw error;
      setTopInviters(data.inviters || []);
    } catch (err) {
      console.error("Error fetching top inviters:", err);
    } finally {
      setInvitersLoading(false);
    }
  };

  const openTeamDetails = (team: TeamData) => {
    setSelectedTeam(team);
    fetchTeamMembers(team.id);
  };

  const formatNumber = (num: number) => new Intl.NumberFormat("sv-SE").format(num);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "leader":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600 text-xs font-medium"><Crown className="h-3 w-3" /> Ledare</span>;
      case "admin":
        return <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600 text-xs font-medium">Admin</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">Medlem</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Members Modal */}
      <Dialog open={!!selectedTeam} onOpenChange={(open) => !open && setSelectedTeam(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {selectedTeam?.name} - Medlemmar ({teamMembers.length})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {membersLoading ? (
              <div className="py-8 text-center text-muted-foreground">Laddar...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Medlem</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Nivå</TableHead>
                    <TableHead>XP</TableHead>
                    <TableHead>Styrkepass</TableHead>
                    <TableHead>Inbjuden av</TableHead>
                    <TableHead>Gick med</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {member.profile?.avatar_url ? (
                            <img src={member.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{member.profile?.display_name || "Okänd"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(member.role)}</TableCell>
                      <TableCell>{member.stats?.level || 1}</TableCell>
                      <TableCell>{formatNumber(member.stats?.total_xp || 0)}</TableCell>
                      <TableCell>{member.stats?.total_workouts || 0}</TableCell>
                      <TableCell>{member.inviterName || "-"}</TableCell>
                      <TableCell>{format(parseISO(member.joined_at), "d MMM yyyy", { locale: sv })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Teams List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Alla lag ({formatNumber(teamsTotal)})
          </CardTitle>
          <CardDescription>Klicka på ett lag för att se medlemmar</CardDescription>
        </CardHeader>
        <CardContent>
          {teamsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Laddar...</div>
          ) : (
            <>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lag</TableHead>
                      <TableHead>Ledare</TableHead>
                      <TableHead>Medlemmar</TableHead>
                      <TableHead>Total XP</TableHead>
                      <TableHead>Inbjudna</TableHead>
                      <TableHead>Skapat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team) => (
                      <TableRow 
                        key={team.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openTeamDetails(team)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {team.avatar_url ? (
                              <img src={team.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <span className="font-medium">{team.name}</span>
                              {team.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{team.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {team.leader?.avatar_url ? (
                              <img src={team.leader.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                            ) : (
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                                <User className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-sm">{team.leader?.display_name || "Okänd"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{team.memberCount}</TableCell>
                        <TableCell>{formatNumber(team.totalXp)}</TableCell>
                        <TableCell>{team.invitedCount}</TableCell>
                        <TableCell>{format(parseISO(team.created_at), "d MMM yyyy", { locale: sv })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <span className="text-sm text-muted-foreground">
                  Visar {teamsPage * PAGE_SIZE + 1}-{Math.min((teamsPage + 1) * PAGE_SIZE, teamsTotal)} av {teamsTotal}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchTeams(teamsPage - 1)}
                    disabled={teamsPage === 0 || teamsLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchTeams(teamsPage + 1)}
                    disabled={(teamsPage + 1) * PAGE_SIZE >= teamsTotal || teamsLoading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Top Inviters (App-wide) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Topp-inbjudare (hela appen)
          </CardTitle>
          <CardDescription>Användare som bjudit in flest personer till appen via referral-koder</CardDescription>
        </CardHeader>
        <CardContent>
          {invitersLoading ? (
            <div className="py-8 text-center text-muted-foreground">Laddar...</div>
          ) : topInviters.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Inga inbjudningar registrerade ännu.</p>
          ) : (
            <div className="space-y-2">
              {topInviters.map((inviter, index) => (
                <div key={inviter.user_id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <span className={`text-lg font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    #{index + 1}
                  </span>
                  {inviter.avatar_url ? (
                    <img src={inviter.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{inviter.display_name || "Okänd"}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">{inviter.inviteCount}</span>
                    <p className="text-xs text-muted-foreground">inbjudningar</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
