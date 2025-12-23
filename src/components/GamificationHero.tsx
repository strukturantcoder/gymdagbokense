import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Zap, ChevronRight, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSocial, UserStats, Achievement, UserAchievement } from "@/hooks/useSocial";

export default function GamificationHero() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getLevelFromXP, getXPForNextLevel } = useSocial();
  
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [statsRes, achievementsRes, earnedRes] = await Promise.all([
        supabase
          .from("user_stats")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("achievements")
          .select("*")
          .order("requirement_value", { ascending: true }),
        supabase
          .from("user_achievements")
          .select("*")
          .eq("user_id", user.id),
      ]);

      if (statsRes.data) {
        setStats(statsRes.data as UserStats);
      } else {
        // New user - create default stats
        setStats({
          user_id: user.id,
          total_workouts: 0,
          total_sets: 0,
          total_minutes: 0,
          total_xp: 0,
          level: 1,
        });
      }

      if (achievementsRes.data) {
        setAchievements(achievementsRes.data as Achievement[]);
      }

      if (earnedRes.data) {
        setEarnedAchievements(earnedRes.data as UserAchievement[]);
      }
    } catch (error) {
      console.error("Error fetching gamification data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-6 animate-pulse">
        <CardContent className="py-6">
          <div className="h-32 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const currentLevel = getLevelFromXP(stats.total_xp);
  const currentLevelXP = getXPForNextLevel(currentLevel - 1);
  const nextLevelXP = getXPForNextLevel(currentLevel);
  const progressXP = stats.total_xp - currentLevelXP;
  const neededXP = nextLevelXP - currentLevelXP;
  const progressPercent = Math.min(100, (progressXP / neededXP) * 100);

  const earnedIds = new Set(earnedAchievements.map((ua) => ua.achievement_id));
  
  // Get closest 3 unearned achievements to show
  const unearnedAchievements = achievements
    .filter((a) => !earnedIds.has(a.id))
    .slice(0, 3);

  // Get recently earned achievements (last 3)
  const recentlyEarned = achievements
    .filter((a) => earnedIds.has(a.id))
    .slice(0, 3);

  const totalEarned = earnedAchievements.length;
  const totalAvailable = achievements.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="overflow-hidden border-gym-orange/30 bg-gradient-to-br from-gym-orange/10 via-card to-amber-500/5">
        <CardContent className="py-5 relative">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gym-orange/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-amber-500/20 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
          
          <div className="relative z-10">
            {/* Header with Level Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-14 h-14 rounded-xl bg-gradient-to-br from-gym-orange to-amber-500 flex items-center justify-center shadow-lg ring-2 ring-gym-orange/30"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <span className="text-2xl font-bold text-white">{currentLevel}</span>
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-lg">Nivå {currentLevel}</h3>
                    <Sparkles className="w-4 h-4 text-gym-orange" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stats.total_xp.toLocaleString()} XP totalt
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/stats")}
                className="text-gym-orange hover:text-gym-orange hover:bg-gym-orange/10"
              >
                Se statistik
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* XP Progress Bar */}
            <div className="mb-5">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Till nivå {currentLevel + 1}</span>
                <span className="font-medium text-gym-orange">
                  {progressXP} / {neededXP} XP
                </span>
              </div>
              <div className="relative">
                <Progress value={progressPercent} className="h-3" />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  style={{ borderRadius: "inherit" }}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-2 mb-5 p-3 bg-background/50 rounded-lg backdrop-blur-sm">
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{stats.total_workouts}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pass</p>
              </div>
              <div className="text-center border-l border-border">
                <p className="text-xl font-bold text-foreground">{stats.total_sets}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sets</p>
              </div>
              <div className="text-center border-l border-border">
                <p className="text-xl font-bold text-foreground">{Math.round(stats.total_minutes / 60)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Timmar</p>
              </div>
              <div className="text-center border-l border-border">
                <p className="text-xl font-bold text-gym-orange">{totalEarned}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Troféer</p>
              </div>
            </div>

            {/* Achievements Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gym-orange" />
                  <span className="text-sm font-medium">
                    {totalEarned > 0 ? "Nästa att låsa upp" : "Lås upp achievements"}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {totalEarned}/{totalAvailable}
                </Badge>
              </div>

              {/* Unearned achievements to work towards */}
              {unearnedAchievements.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {unearnedAchievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex-shrink-0 w-24 p-3 bg-secondary/50 rounded-lg text-center border border-border/50 hover:border-gym-orange/30 transition-colors cursor-default"
                    >
                      <div className="text-2xl mb-1 grayscale opacity-60">
                        {achievement.icon}
                      </div>
                      <p className="text-[10px] font-medium truncate">{achievement.name}</p>
                      <Badge variant="outline" className="text-[9px] mt-1 px-1.5">
                        +{achievement.xp_reward} XP
                      </Badge>
                    </motion.div>
                  ))}
                  
                  {/* View all button */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => navigate("/social?tab=achievements")}
                    className="flex-shrink-0 w-24 p-3 bg-gym-orange/10 rounded-lg text-center border border-gym-orange/30 hover:bg-gym-orange/20 transition-colors"
                  >
                    <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-gym-orange/20 flex items-center justify-center">
                      <ChevronRight className="w-4 h-4 text-gym-orange" />
                    </div>
                    <p className="text-[10px] font-medium text-gym-orange">Visa alla</p>
                  </motion.button>
                </div>
              )}

              {/* Earned achievements showcase */}
              {recentlyEarned.length > 0 && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Upplåsta</p>
                  <div className="flex gap-1">
                    {recentlyEarned.map((achievement) => (
                      <div
                        key={achievement.id}
                        className="w-10 h-10 rounded-lg bg-gym-orange/20 flex items-center justify-center border border-gym-orange/30"
                        title={achievement.name}
                      >
                        <span className="text-lg">{achievement.icon}</span>
                      </div>
                    ))}
                    {totalEarned > 3 && (
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
                        +{totalEarned - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Empty state for new users */}
              {totalEarned === 0 && (
                <div className="p-4 bg-secondary/30 rounded-lg text-center">
                  <Zap className="w-8 h-8 mx-auto mb-2 text-gym-orange" />
                  <p className="text-sm font-medium">Börja träna för att tjäna XP!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Varje pass ger dig XP och låser upp nya achievements
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
