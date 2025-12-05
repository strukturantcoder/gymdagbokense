import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, Heart, Trophy, UserPlus, Activity, Clock, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { sv } from "date-fns/locale";

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

export function AdminStats() {
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
