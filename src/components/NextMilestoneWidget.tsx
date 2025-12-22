import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
}

interface NextMilestone {
  achievement: Achievement;
  currentValue: number;
  progressPercent: number;
}

export default function NextMilestoneWidget() {
  const { user } = useAuth();
  const [nextMilestone, setNextMilestone] = useState<NextMilestone | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNextMilestone();
    }
  }, [user]);

  const fetchNextMilestone = async () => {
    if (!user) return;

    try {
      // Fetch all achievements
      const { data: achievements } = await supabase
        .from("achievements")
        .select("*")
        .order("requirement_value", { ascending: true });

      // Fetch user's earned achievements
      const { data: earnedAchievements } = await supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", user.id);

      // Fetch user stats
      const { data: stats } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!achievements || !stats) {
        setLoading(false);
        return;
      }

      const earnedIds = new Set(earnedAchievements?.map((e) => e.achievement_id) || []);

      // Find next unearned achievement by type
      const findNextByType = (type: string, currentValue: number): NextMilestone | null => {
        const unearned = achievements
          .filter((a) => a.requirement_type === type && !earnedIds.has(a.id))
          .sort((a, b) => a.requirement_value - b.requirement_value);

        if (unearned.length === 0) return null;

        const next = unearned[0];
        const progress = Math.min(100, (currentValue / next.requirement_value) * 100);

        return {
          achievement: next as Achievement,
          currentValue,
          progressPercent: progress,
        };
      };

      // Check different achievement types and find the one closest to completion
      const candidates: (NextMilestone | null)[] = [
        findNextByType("total_workouts", stats.total_workouts || 0),
        findNextByType("total_sets", stats.total_sets || 0),
        findNextByType("total_minutes", stats.total_minutes || 0),
      ];

      // Pick the one with highest progress percentage (closest to achieving)
      const validCandidates = candidates.filter((c): c is NextMilestone => c !== null);
      
      if (validCandidates.length > 0) {
        const closest = validCandidates.reduce((prev, curr) =>
          curr.progressPercent > prev.progressPercent ? curr : prev
        );
        setNextMilestone(closest);
      }
    } catch (error) {
      console.error("Error fetching next milestone:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !nextMilestone) return null;

  const iconMap: Record<string, string> = {
    "🏋️": "dumbbell",
    "💪": "muscle",
    "🔥": "fire",
    "⚡": "zap",
    "🌟": "star",
    "🏆": "trophy",
    "👑": "crown",
    "🎯": "target",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="bg-gradient-to-r from-amber-500/10 via-gym-orange/10 to-primary/10 border-gym-orange/30 overflow-hidden">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-xl bg-gradient-to-br from-gym-orange to-amber-500 flex items-center justify-center shadow-lg flex-shrink-0"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-2xl">{nextMilestone.achievement.icon}</span>
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-gym-orange" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Nästa milstolpe
                </span>
              </div>
              <p className="font-bold text-sm truncate">{nextMilestone.achievement.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {nextMilestone.achievement.description}
              </p>
              
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    {nextMilestone.currentValue} / {nextMilestone.achievement.requirement_value}
                  </span>
                  <span className="font-medium text-gym-orange">
                    +{nextMilestone.achievement.xp_reward} XP
                  </span>
                </div>
                <Progress value={nextMilestone.progressPercent} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
