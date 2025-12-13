import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, Heart, Trophy, UserPlus, Activity, Clock, Zap, Search, User, ChevronDown, ChevronUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AdminStatsData {
  users: {
    total: number;
    newMonth: number;
    newWeek: number;
    activeWeek: number;
    activeMonth: number;
  };
  workouts: {
    total: number;
    month: number;
    week: number;
  };
  cardio: {
    total: number;
    month: number;
  };
  programs: {
    total: number;
  };
  challenges: {
    communityParticipants: number;
    poolParticipants: number;
  };
  social: {
    friendships: number;
  };
  aggregate: {
    totalSets: number;
    totalMinutes: number;
    totalCardioMinutes: number;
    totalXP: number;
  };
  charts: {
    signupsByDay: { date: string; count: number }[];
    workoutsByDay: { date: string; count: number }[];
  };
}

interface UserSearchResult {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email?: string;
}

interface UserDetailedStats {
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
    gender: string | null;
    birth_year: number | null;
  };
  stats: {
    level: number;
    total_xp: number;
    total_workouts: number;
    total_sets: number;
    total_minutes: number;
    total_cardio_sessions: number;
    total_cardio_minutes: number;
    total_cardio_distance_km: number;
  } | null;
  recentWorkouts: number;
  recentCardio: number;
}

export function AdminStats() {
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User lookup state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetailedStats | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userLookupOpen, setUserLookupOpen] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-stats");
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      setStats(data);
    } catch (err) {
      console.error("Error fetching admin stats:", err);
      setError("Kunde inte hämta statistik");
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-lookup", {
        body: { action: "search", query: searchQuery }
      });
      
      if (error) throw error;
      setSearchResults(data.users || []);
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setSearchLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-lookup", {
        body: { action: "details", userId }
      });
      
      if (error) throw error;
      setSelectedUser(data);
      setSelectedUserId(userId);
    } catch (err) {
      console.error("Error fetching user details:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("sv-SE").format(num);
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    if (hours >= 1000) {
      return `${formatNumber(hours)} tim`;
    }
    return `${formatNumber(minutes)} min`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Laddar statistik...
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          {error || "Något gick fel"}
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: "Totalt användare",
      value: formatNumber(stats.users.total),
      description: `+${stats.users.newWeek} senaste veckan`,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Aktiva användare (7d)",
      value: formatNumber(stats.users.activeWeek),
      description: `${stats.users.activeMonth} senaste månaden`,
      icon: Activity,
      color: "text-green-500",
    },
    {
      title: "Totalt styrkepass",
      value: formatNumber(stats.workouts.total),
      description: `${stats.workouts.week} senaste veckan`,
      icon: Dumbbell,
      color: "text-orange-500",
    },
    {
      title: "Totalt konditionspass",
      value: formatNumber(stats.cardio.total),
      description: `${stats.cardio.month} senaste månaden`,
      icon: Heart,
      color: "text-red-500",
    },
    {
      title: "Träningsprogram",
      value: formatNumber(stats.programs.total),
      description: "Skapade program",
      icon: Trophy,
      color: "text-purple-500",
    },
    {
      title: "Tävlingsdeltagare",
      value: formatNumber(stats.challenges.communityParticipants + stats.challenges.poolParticipants),
      description: `${stats.challenges.communityParticipants} community, ${stats.challenges.poolParticipants} pool`,
      icon: Trophy,
      color: "text-yellow-500",
    },
    {
      title: "Vänskapsrelationer",
      value: formatNumber(stats.social.friendships),
      description: "Accepterade vänförfrågningar",
      icon: UserPlus,
      color: "text-pink-500",
    },
    {
      title: "Total XP",
      value: formatNumber(stats.aggregate.totalXP),
      description: "Samlat av alla användare",
      icon: Zap,
      color: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* User Lookup Section */}
      <Collapsible open={userLookupOpen} onOpenChange={setUserLookupOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Sök användare
                </CardTitle>
                {userLookupOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Sök på namn eller e-post..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                />
                <Button onClick={searchUsers} disabled={searchLoading}>
                  {searchLoading ? "Söker..." : "Sök"}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{searchResults.length} resultat</p>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.user_id}
                        onClick={() => fetchUserDetails(user.user_id)}
                        className={`flex items-center gap-3 p-2 rounded-lg border text-left transition-colors hover:bg-muted/50 ${
                          selectedUserId === user.user_id ? "bg-muted border-primary" : ""
                        }`}
                      >
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{user.display_name || "Okänd"}</p>
                          {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected User Details */}
              {selectedUser && (
                <Card className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      {selectedUser.profile.avatar_url ? (
                        <img src={selectedUser.profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-base">{selectedUser.profile.display_name || "Okänd"}</CardTitle>
                        <CardDescription>
                          Medlem sedan {format(parseISO(selectedUser.profile.created_at), "d MMMM yyyy", { locale: sv })}
                          {selectedUser.profile.gender && ` • ${selectedUser.profile.gender}`}
                          {selectedUser.profile.birth_year && ` • Född ${selectedUser.profile.birth_year}`}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedUser.stats ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div className="p-2 rounded-lg bg-background">
                          <div className="text-lg font-bold">{selectedUser.stats.level}</div>
                          <p className="text-xs text-muted-foreground">Nivå</p>
                        </div>
                        <div className="p-2 rounded-lg bg-background">
                          <div className="text-lg font-bold">{formatNumber(selectedUser.stats.total_xp)}</div>
                          <p className="text-xs text-muted-foreground">XP</p>
                        </div>
                        <div className="p-2 rounded-lg bg-background">
                          <div className="text-lg font-bold">{selectedUser.stats.total_workouts}</div>
                          <p className="text-xs text-muted-foreground">Styrkepass</p>
                        </div>
                        <div className="p-2 rounded-lg bg-background">
                          <div className="text-lg font-bold">{selectedUser.stats.total_cardio_sessions}</div>
                          <p className="text-xs text-muted-foreground">Konditionspass</p>
                        </div>
                        <div className="p-2 rounded-lg bg-background">
                          <div className="text-lg font-bold">{formatNumber(selectedUser.stats.total_sets)}</div>
                          <p className="text-xs text-muted-foreground">Totala set</p>
                        </div>
                        <div className="p-2 rounded-lg bg-background">
                          <div className="text-lg font-bold">{formatMinutes(selectedUser.stats.total_minutes)}</div>
                          <p className="text-xs text-muted-foreground">Styrketid</p>
                        </div>
                        <div className="p-2 rounded-lg bg-background">
                          <div className="text-lg font-bold">{formatMinutes(selectedUser.stats.total_cardio_minutes)}</div>
                          <p className="text-xs text-muted-foreground">Konditionstid</p>
                        </div>
                        <div className="p-2 rounded-lg bg-background">
                          <div className="text-lg font-bold">{selectedUser.stats.total_cardio_distance_km.toFixed(1)} km</div>
                          <p className="text-xs text-muted-foreground">Total distans</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Ingen träningsdata</p>
                    )}
                    <div className="flex gap-4 mt-3 pt-3 border-t text-sm">
                      <span className="text-muted-foreground">
                        Senaste 7 dagarna: <strong>{selectedUser.recentWorkouts}</strong> styrkepass, <strong>{selectedUser.recentCardio}</strong> konditionspass
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Användarstatistik</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.title}</span>
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Aggregate stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Aggregerad träningsdata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">{formatNumber(stats.aggregate.totalSets)}</div>
              <p className="text-xs text-muted-foreground">Totalt set</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{formatMinutes(stats.aggregate.totalMinutes)}</div>
              <p className="text-xs text-muted-foreground">Styrketräning</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{formatMinutes(stats.aggregate.totalCardioMinutes)}</div>
              <p className="text-xs text-muted-foreground">Konditionsträning</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {formatMinutes(stats.aggregate.totalMinutes + stats.aggregate.totalCardioMinutes)}
              </div>
              <p className="text-xs text-muted-foreground">Total träningstid</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nya användare (7 dagar)</CardTitle>
            <CardDescription>Registreringar per dag</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.charts.signupsByDay}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(parseISO(date), "EEE", { locale: sv })}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip 
                    labelFormatter={(date) => format(parseISO(date as string), "d MMM", { locale: sv })}
                    formatter={(value) => [value, "Registreringar"]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Träningspass (7 dagar)</CardTitle>
            <CardDescription>Loggade pass per dag</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.charts.workoutsByDay}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(parseISO(date), "EEE", { locale: sv })}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip 
                    labelFormatter={(date) => format(parseISO(date as string), "d MMM", { locale: sv })}
                    formatter={(value) => [value, "Träningspass"]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
