import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, Heart, Trophy, UserPlus, Activity, Clock, Zap, Search, User, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO, subDays, subMonths } from "date-fns";
import { sv } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DateFilter = "all" | "week" | "month" | "3months";

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

interface UserWithStats {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  stats: {
    level: number;
    total_xp: number;
    total_workouts: number;
    total_cardio_sessions: number;
  } | null;
}

interface WorkoutLogEntry {
  id: string;
  user_id: string;
  workout_day: string;
  duration_minutes: number | null;
  completed_at: string;
  notes: string | null;
  profile: { display_name: string | null; avatar_url: string | null } | null;
  exerciseCount: number;
  totalSets: number;
}

interface CardioLogEntry {
  id: string;
  user_id: string;
  activity_type: string;
  duration_minutes: number;
  distance_km: number | null;
  calories_burned: number | null;
  completed_at: string;
  notes: string | null;
  profile: { display_name: string | null; avatar_url: string | null } | null;
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

interface ActiveUserEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  stats: {
    level: number;
    total_xp: number;
    total_workouts: number;
    total_cardio_sessions: number;
  } | null;
  recentWorkouts: number;
  recentCardio: number;
}

interface ChallengeParticipant {
  id: string;
  user_id: string;
  current_value: number;
  joined_at: string;
  type: "community" | "pool";
  challengeTitle: string;
  isActive: boolean;
  endDate: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
}

type ModalType = "users" | "workouts" | "cardio" | "activeUsers" | "challengeParticipants" | null;

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

  // Modal states
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalLoading, setModalLoading] = useState(false);
  
  // All users list
  const [allUsers, setAllUsers] = useState<UserWithStats[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(0);
  
  // Workout logs
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogEntry[]>([]);
  const [workoutsTotal, setWorkoutsTotal] = useState(0);
  const [workoutsPage, setWorkoutsPage] = useState(0);
  
  // Cardio logs
  const [cardioLogs, setCardioLogs] = useState<CardioLogEntry[]>([]);
  const [cardioTotal, setCardioTotal] = useState(0);
  const [cardioPage, setCardioPage] = useState(0);
  
  // Active users
  const [activeUsers, setActiveUsers] = useState<ActiveUserEntry[]>([]);
  const [activeUsersTotal, setActiveUsersTotal] = useState(0);
  const [activeUsersPage, setActiveUsersPage] = useState(0);
  
  // Challenge participants
  const [challengeParticipants, setChallengeParticipants] = useState<ChallengeParticipant[]>([]);
  const [challengeParticipantsTotal, setChallengeParticipantsTotal] = useState(0);
  const [challengeParticipantsPage, setChallengeParticipantsPage] = useState(0);

  // Date filters
  const [workoutsDateFilter, setWorkoutsDateFilter] = useState<DateFilter>("all");
  const [cardioDateFilter, setCardioDateFilter] = useState<DateFilter>("all");
  const [activeUsersDateFilter, setActiveUsersDateFilter] = useState<DateFilter>("week");
  const [challengesDateFilter, setChallengesDateFilter] = useState<DateFilter>("all");

  const PAGE_SIZE = 20;

  const getDateFromFilter = (filter: DateFilter): string | null => {
    if (filter === "all") return null;
    const now = new Date();
    switch (filter) {
      case "week": return subDays(now, 7).toISOString();
      case "month": return subMonths(now, 1).toISOString();
      case "3months": return subMonths(now, 3).toISOString();
      default: return null;
    }
  };

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

  const fetchAllUsers = async (page: number) => {
    setModalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-lookup", {
        body: { action: "listAll", limit: PAGE_SIZE, offset: page * PAGE_SIZE }
      });
      
      if (error) throw error;
      setAllUsers(data.users || []);
      setUsersTotal(data.total || 0);
      setUsersPage(page);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchWorkoutLogs = async (page: number, dateFilter: DateFilter = workoutsDateFilter) => {
    setModalLoading(true);
    try {
      const fromDate = getDateFromFilter(dateFilter);
      const { data, error } = await supabase.functions.invoke("admin-user-lookup", {
        body: { action: "listWorkouts", limit: PAGE_SIZE, offset: page * PAGE_SIZE, fromDate }
      });
      
      if (error) throw error;
      setWorkoutLogs(data.workouts || []);
      setWorkoutsTotal(data.total || 0);
      setWorkoutsPage(page);
    } catch (err) {
      console.error("Error fetching workouts:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchCardioLogs = async (page: number, dateFilter: DateFilter = cardioDateFilter) => {
    setModalLoading(true);
    try {
      const fromDate = getDateFromFilter(dateFilter);
      const { data, error } = await supabase.functions.invoke("admin-user-lookup", {
        body: { action: "listCardio", limit: PAGE_SIZE, offset: page * PAGE_SIZE, fromDate }
      });
      
      if (error) throw error;
      setCardioLogs(data.cardioLogs || []);
      setCardioTotal(data.total || 0);
      setCardioPage(page);
    } catch (err) {
      console.error("Error fetching cardio:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchActiveUsers = async (page: number, dateFilter: DateFilter = activeUsersDateFilter) => {
    setModalLoading(true);
    try {
      const fromDate = getDateFromFilter(dateFilter);
      const { data, error } = await supabase.functions.invoke("admin-user-lookup", {
        body: { action: "listActiveUsers", limit: PAGE_SIZE, offset: page * PAGE_SIZE, fromDate }
      });
      
      if (error) throw error;
      setActiveUsers(data.users || []);
      setActiveUsersTotal(data.total || 0);
      setActiveUsersPage(page);
    } catch (err) {
      console.error("Error fetching active users:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchChallengeParticipants = async (page: number, dateFilter: DateFilter = challengesDateFilter) => {
    setModalLoading(true);
    try {
      const fromDate = getDateFromFilter(dateFilter);
      const { data, error } = await supabase.functions.invoke("admin-user-lookup", {
        body: { action: "listChallengeParticipants", limit: PAGE_SIZE, offset: page * PAGE_SIZE, fromDate }
      });
      
      if (error) throw error;
      setChallengeParticipants(data.participants || []);
      setChallengeParticipantsTotal(data.total || 0);
      setChallengeParticipantsPage(page);
    } catch (err) {
      console.error("Error fetching challenge participants:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleWorkoutsFilterChange = (filter: DateFilter) => {
    setWorkoutsDateFilter(filter);
    fetchWorkoutLogs(0, filter);
  };

  const handleCardioFilterChange = (filter: DateFilter) => {
    setCardioDateFilter(filter);
    fetchCardioLogs(0, filter);
  };

  const handleActiveUsersFilterChange = (filter: DateFilter) => {
    setActiveUsersDateFilter(filter);
    fetchActiveUsers(0, filter);
  };

  const handleChallengesFilterChange = (filter: DateFilter) => {
    setChallengesDateFilter(filter);
    fetchChallengeParticipants(0, filter);
  };

  const openModal = (type: ModalType) => {
    setModalType(type);
    if (type === "users") {
      fetchAllUsers(0);
    } else if (type === "workouts") {
      fetchWorkoutLogs(0);
    } else if (type === "cardio") {
      fetchCardioLogs(0);
    } else if (type === "activeUsers") {
      fetchActiveUsers(0);
    } else if (type === "challengeParticipants") {
      fetchChallengeParticipants(0);
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

  const activityTypeMap: Record<string, string> = {
    running: "Löpning",
    walking: "Promenad",
    cycling: "Cykling",
    swimming: "Simning",
    golf: "Golf",
    intervals: "Intervaller",
    other: "Övrigt"
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
      clickable: true,
      onClick: () => openModal("users"),
    },
    {
      title: "Aktiva användare (7d)",
      value: formatNumber(stats.users.activeWeek),
      description: `${stats.users.activeMonth} senaste månaden`,
      icon: Activity,
      color: "text-green-500",
      clickable: true,
      onClick: () => openModal("activeUsers"),
    },
    {
      title: "Totalt styrkepass",
      value: formatNumber(stats.workouts.total),
      description: `${stats.workouts.week} senaste veckan`,
      icon: Dumbbell,
      color: "text-orange-500",
      clickable: true,
      onClick: () => openModal("workouts"),
    },
    {
      title: "Totalt konditionspass",
      value: formatNumber(stats.cardio.total),
      description: `${stats.cardio.month} senaste månaden`,
      icon: Heart,
      color: "text-red-500",
      clickable: true,
      onClick: () => openModal("cardio"),
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
      clickable: true,
      onClick: () => openModal("challengeParticipants"),
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
      {/* Users Modal */}
      <Dialog open={modalType === "users"} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alla användare ({formatNumber(usersTotal)})
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {modalLoading ? (
              <div className="py-8 text-center text-muted-foreground">Laddar...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Användare</TableHead>
                    <TableHead>Nivå</TableHead>
                    <TableHead>XP</TableHead>
                    <TableHead>Styrkepass</TableHead>
                    <TableHead>Konditionspass</TableHead>
                    <TableHead>Registrerad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{user.display_name || "Okänd"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.stats?.level || 1}</TableCell>
                      <TableCell>{formatNumber(user.stats?.total_xp || 0)}</TableCell>
                      <TableCell>{user.stats?.total_workouts || 0}</TableCell>
                      <TableCell>{user.stats?.total_cardio_sessions || 0}</TableCell>
                      <TableCell>{format(parseISO(user.created_at), "d MMM yyyy", { locale: sv })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Visar {usersPage * PAGE_SIZE + 1}-{Math.min((usersPage + 1) * PAGE_SIZE, usersTotal)} av {usersTotal}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAllUsers(usersPage - 1)}
                disabled={usersPage === 0 || modalLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchAllUsers(usersPage + 1)}
                disabled={(usersPage + 1) * PAGE_SIZE >= usersTotal || modalLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workouts Modal */}
      <Dialog open={modalType === "workouts"} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Alla styrkepass ({formatNumber(workoutsTotal)})
              </DialogTitle>
              <Select value={workoutsDateFilter} onValueChange={(v) => handleWorkoutsFilterChange(v as DateFilter)}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla tider</SelectItem>
                  <SelectItem value="week">Senaste veckan</SelectItem>
                  <SelectItem value="month">Senaste månaden</SelectItem>
                  <SelectItem value="3months">Senaste 3 mån</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {modalLoading ? (
              <div className="py-8 text-center text-muted-foreground">Laddar...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Användare</TableHead>
                    <TableHead>Träningsdag</TableHead>
                    <TableHead>Övningar</TableHead>
                    <TableHead>Set</TableHead>
                    <TableHead>Tid</TableHead>
                    <TableHead>Datum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workoutLogs.map((workout) => (
                    <TableRow key={workout.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {workout.profile?.avatar_url ? (
                            <img src={workout.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{workout.profile?.display_name || "Okänd"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{workout.workout_day}</TableCell>
                      <TableCell>{workout.exerciseCount}</TableCell>
                      <TableCell>{workout.totalSets}</TableCell>
                      <TableCell>{workout.duration_minutes ? `${workout.duration_minutes} min` : "-"}</TableCell>
                      <TableCell>{format(parseISO(workout.completed_at), "d MMM HH:mm", { locale: sv })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Visar {workoutsPage * PAGE_SIZE + 1}-{Math.min((workoutsPage + 1) * PAGE_SIZE, workoutsTotal)} av {workoutsTotal}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchWorkoutLogs(workoutsPage - 1)}
                disabled={workoutsPage === 0 || modalLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchWorkoutLogs(workoutsPage + 1)}
                disabled={(workoutsPage + 1) * PAGE_SIZE >= workoutsTotal || modalLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cardio Modal */}
      <Dialog open={modalType === "cardio"} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Alla konditionspass ({formatNumber(cardioTotal)})
              </DialogTitle>
              <Select value={cardioDateFilter} onValueChange={(v) => handleCardioFilterChange(v as DateFilter)}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla tider</SelectItem>
                  <SelectItem value="week">Senaste veckan</SelectItem>
                  <SelectItem value="month">Senaste månaden</SelectItem>
                  <SelectItem value="3months">Senaste 3 mån</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {modalLoading ? (
              <div className="py-8 text-center text-muted-foreground">Laddar...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Användare</TableHead>
                    <TableHead>Aktivitet</TableHead>
                    <TableHead>Tid</TableHead>
                    <TableHead>Distans</TableHead>
                    <TableHead>Kalorier</TableHead>
                    <TableHead>Datum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cardioLogs.map((cardio) => (
                    <TableRow key={cardio.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {cardio.profile?.avatar_url ? (
                            <img src={cardio.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{cardio.profile?.display_name || "Okänd"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{activityTypeMap[cardio.activity_type] || cardio.activity_type}</TableCell>
                      <TableCell>{cardio.duration_minutes} min</TableCell>
                      <TableCell>{cardio.distance_km ? `${cardio.distance_km.toFixed(1)} km` : "-"}</TableCell>
                      <TableCell>{cardio.calories_burned || "-"}</TableCell>
                      <TableCell>{format(parseISO(cardio.completed_at), "d MMM HH:mm", { locale: sv })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Visar {cardioPage * PAGE_SIZE + 1}-{Math.min((cardioPage + 1) * PAGE_SIZE, cardioTotal)} av {cardioTotal}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCardioLogs(cardioPage - 1)}
                disabled={cardioPage === 0 || modalLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCardioLogs(cardioPage + 1)}
                disabled={(cardioPage + 1) * PAGE_SIZE >= cardioTotal || modalLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Users Modal */}
      <Dialog open={modalType === "activeUsers"} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Aktiva användare ({formatNumber(activeUsersTotal)})
              </DialogTitle>
              <Select value={activeUsersDateFilter} onValueChange={(v) => handleActiveUsersFilterChange(v as DateFilter)}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Senaste veckan</SelectItem>
                  <SelectItem value="month">Senaste månaden</SelectItem>
                  <SelectItem value="3months">Senaste 3 mån</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {modalLoading ? (
              <div className="py-8 text-center text-muted-foreground">Laddar...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Användare</TableHead>
                    <TableHead>Nivå</TableHead>
                    <TableHead>XP</TableHead>
                    <TableHead>Styrkepass</TableHead>
                    <TableHead>Konditionspass</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{user.display_name || "Okänd"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.stats?.level || 1}</TableCell>
                      <TableCell>{formatNumber(user.stats?.total_xp || 0)}</TableCell>
                      <TableCell>{user.recentWorkouts}</TableCell>
                      <TableCell>{user.recentCardio}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Visar {activeUsersPage * PAGE_SIZE + 1}-{Math.min((activeUsersPage + 1) * PAGE_SIZE, activeUsersTotal)} av {activeUsersTotal}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchActiveUsers(activeUsersPage - 1)}
                disabled={activeUsersPage === 0 || modalLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchActiveUsers(activeUsersPage + 1)}
                disabled={(activeUsersPage + 1) * PAGE_SIZE >= activeUsersTotal || modalLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenge Participants Modal */}
      <Dialog open={modalType === "challengeParticipants"} onOpenChange={(open) => !open && setModalType(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Tävlingsdeltagare ({formatNumber(challengeParticipantsTotal)})
              </DialogTitle>
              <Select value={challengesDateFilter} onValueChange={(v) => handleChallengesFilterChange(v as DateFilter)}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla tider</SelectItem>
                  <SelectItem value="week">Senaste veckan</SelectItem>
                  <SelectItem value="month">Senaste månaden</SelectItem>
                  <SelectItem value="3months">Senaste 3 mån</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            {modalLoading ? (
              <div className="py-8 text-center text-muted-foreground">Laddar...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Användare</TableHead>
                    <TableHead>Tävling</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gick med</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {challengeParticipants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {participant.profile?.avatar_url ? (
                            <img src={participant.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{participant.profile?.display_name || "Okänd"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{participant.challengeTitle}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded ${participant.type === "community" ? "bg-blue-500/10 text-blue-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                          {participant.type === "community" ? "Community" : "Pool"}
                        </span>
                      </TableCell>
                      <TableCell>{participant.current_value}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded ${participant.isActive ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                          {participant.isActive ? "Aktiv" : "Avslutad"}
                        </span>
                      </TableCell>
                      <TableCell>{format(parseISO(participant.joined_at), "d MMM HH:mm", { locale: sv })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Visar {challengeParticipantsPage * PAGE_SIZE + 1}-{Math.min((challengeParticipantsPage + 1) * PAGE_SIZE, challengeParticipantsTotal)} av {challengeParticipantsTotal}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchChallengeParticipants(challengeParticipantsPage - 1)}
                disabled={challengeParticipantsPage === 0 || modalLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchChallengeParticipants(challengeParticipantsPage + 1)}
                disabled={(challengeParticipantsPage + 1) * PAGE_SIZE >= challengeParticipantsTotal || modalLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
            <Card 
              key={index} 
              className={stat.clickable ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
              onClick={stat.onClick}
            >
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
