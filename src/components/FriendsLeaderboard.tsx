import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Flame, Dumbbell, TrendingUp, Medal, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  value: number;
  rank: number;
  isCurrentUser: boolean;
}

type Period = "week" | "month" | "all";
type Metric = "xp" | "workouts" | "minutes";

export default function FriendsLeaderboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [metric, setMetric] = useState<Metric>("xp");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchLeaderboard();
    }
  }, [user, period, metric]);

  const fetchLeaderboard = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get friend IDs
      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      const friendIds = new Set<string>();
      friendIds.add(user.id); // Include current user
      friendships?.forEach((f) => {
        friendIds.add(f.user_id === user.id ? f.friend_id : f.user_id);
      });

      const userIds = Array.from(friendIds);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      let entries: LeaderboardEntry[] = [];

      if (metric === "xp") {
        // Get XP from user_stats
        const { data: stats } = await supabase
          .from("user_stats")
          .select("user_id, total_xp")
          .in("user_id", userIds);

        entries = (stats || []).map((s) => ({
          user_id: s.user_id,
          display_name: profileMap.get(s.user_id)?.display_name || "Anonym",
          avatar_url: profileMap.get(s.user_id)?.avatar_url || null,
          value: s.total_xp || 0,
          rank: 0,
          isCurrentUser: s.user_id === user.id,
        }));
      } else {
        // Get workout stats based on period
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        if (period === "week") {
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
        } else if (period === "month") {
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
        }

        const workoutQuery = supabase
          .from("workout_logs")
          .select("user_id, duration_minutes")
          .in("user_id", userIds);

        if (startDate && endDate) {
          workoutQuery
            .gte("completed_at", startDate.toISOString())
            .lte("completed_at", endDate.toISOString());
        }

        const { data: workouts } = await workoutQuery;

        // Aggregate by user
        const aggregated = new Map<string, number>();
        userIds.forEach((id) => aggregated.set(id, 0));

        workouts?.forEach((w) => {
          const current = aggregated.get(w.user_id) || 0;
          if (metric === "workouts") {
            aggregated.set(w.user_id, current + 1);
          } else if (metric === "minutes") {
            aggregated.set(w.user_id, current + (w.duration_minutes || 0));
          }
        });

        entries = userIds.map((userId) => ({
          user_id: userId,
          display_name: profileMap.get(userId)?.display_name || "Anonym",
          avatar_url: profileMap.get(userId)?.avatar_url || null,
          value: aggregated.get(userId) || 0,
          rank: 0,
          isCurrentUser: userId === user.id,
        }));
      }

      // Sort and rank
      entries.sort((a, b) => b.value - a.value);
      entries.forEach((e, i) => (e.rank = i + 1));

      setLeaderboard(entries);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 text-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case "xp":
        return "XP";
      case "workouts":
        return "pass";
      case "minutes":
        return "min";
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "week":
        return "Denna vecka";
      case "month":
        return "Denna månad";
      case "all":
        return "Totalt";
    }
  };

  if (leaderboard.length <= 1) return null; // Don't show if only user exists

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-gym-orange" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
              {(["week", "month", "all"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  {p === "week" ? "Vecka" : p === "month" ? "Månad" : "Totalt"}
                </button>
              ))}
            </div>
            <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
              {(["xp", "workouts", "minutes"] as Metric[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    metric === m
                      ? "bg-gym-orange text-white"
                      : "hover:bg-secondary"
                  }`}
                >
                  {m === "xp" ? "XP" : m === "workouts" ? "Pass" : "Minuter"}
                </button>
              ))}
            </div>
          </div>

          {/* Leaderboard list */}
          <div className="space-y-2">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  entry.isCurrentUser
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-secondary/30"
                }`}
              >
                <div className="w-8 flex justify-center">{getRankIcon(entry.rank)}</div>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {entry.display_name?.slice(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`flex-1 text-sm truncate ${
                    entry.isCurrentUser ? "font-bold" : ""
                  }`}
                >
                  {entry.isCurrentUser ? "Du" : entry.display_name}
                </span>
                <Badge
                  variant={entry.isCurrentUser ? "default" : "secondary"}
                  className="font-mono"
                >
                  {entry.value} {getMetricLabel()}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
