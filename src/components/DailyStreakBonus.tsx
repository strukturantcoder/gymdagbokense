import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Gift, Sparkles, Check, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  canClaimBonus: boolean;
  lastActivityDate: string | null;
}

export default function DailyStreakBonus() {
  const { user } = useAuth();
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [justClaimed, setJustClaimed] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);

  useEffect(() => {
    if (user) {
      fetchStreakData();
    }
  }, [user]);

  const fetchStreakData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_stats")
        .select("current_streak, longest_streak, last_activity_date, daily_bonus_claimed_at")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching streak data:", error);
        return;
      }

      if (data) {
        const today = new Date().toISOString().split("T")[0];
        const canClaimBonus = data.daily_bonus_claimed_at !== today;

        setStreakData({
          currentStreak: data.current_streak || 0,
          longestStreak: data.longest_streak || 0,
          canClaimBonus,
          lastActivityDate: data.last_activity_date,
        });
      } else {
        setStreakData({
          currentStreak: 0,
          longestStreak: 0,
          canClaimBonus: true,
          lastActivityDate: null,
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const claimDailyBonus = async () => {
    if (!user || claiming || !streakData?.canClaimBonus) return;

    setClaiming(true);

    try {
      const { data, error } = await supabase.rpc("claim_daily_bonus", {
        p_user_id: user.id,
      });

      if (error) {
        console.error("Error claiming bonus:", error);
        toast.error("Kunde inte hämta din dagliga bonus");
        return;
      }

      if (data && data.length > 0) {
        const result = data[0];
        
        if (result.is_new_day) {
          setEarnedXP(result.xp_earned);
          setJustClaimed(true);
          setStreakData((prev) =>
            prev
              ? {
                  ...prev,
                  currentStreak: result.new_streak,
                  longestStreak: Math.max(prev.longestStreak, result.new_streak),
                  canClaimBonus: false,
                }
              : null
          );

          // Trigger confetti
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#f97316", "#fbbf24", "#f59e0b"],
          });

          toast.success(`+${result.xp_earned} XP daglig bonus!`, {
            description: `Du har nu ${result.new_streak} dagars streak 🔥`,
          });

          // Reset just claimed animation after delay
          setTimeout(() => {
            setJustClaimed(false);
          }, 3000);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Något gick fel");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <Card className="mb-4 animate-pulse">
        <CardContent className="py-4">
          <div className="h-16 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!streakData) return null;

  const bonusXP = 10 + Math.min(streakData.currentStreak * 5, 50);
  const nextBonusXP = 10 + Math.min((streakData.currentStreak + 1) * 5, 50);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <Card
        className={`overflow-hidden transition-all duration-500 ${
          justClaimed
            ? "border-gym-orange shadow-lg shadow-gym-orange/20"
            : streakData.canClaimBonus
            ? "border-gym-orange/50 bg-gradient-to-r from-gym-orange/10 to-amber-500/10"
            : "border-border"
        }`}
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Streak info */}
            <div className="flex items-center gap-3">
              <motion.div
                animate={
                  streakData.currentStreak > 0 || justClaimed
                    ? { scale: [1, 1.1, 1] }
                    : {}
                }
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  streakData.currentStreak > 0 || justClaimed
                    ? "bg-gradient-to-br from-gym-orange to-amber-500"
                    : "bg-muted"
                }`}
              >
                <Flame
                  className={`w-6 h-6 ${
                    streakData.currentStreak > 0 || justClaimed
                      ? "text-white"
                      : "text-muted-foreground"
                  }`}
                />
              </motion.div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg">
                    {streakData.currentStreak} dagar
                  </span>
                  {streakData.currentStreak > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-gym-orange/20 text-gym-orange"
                    >
                      🔥 Streak
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {streakData.canClaimBonus
                    ? `Hämta ${nextBonusXP} XP daglig bonus!`
                    : `Längsta: ${streakData.longestStreak} dagar`}
                </p>
              </div>
            </div>

            {/* Claim button or claimed state */}
            <AnimatePresence mode="wait">
              {justClaimed ? (
                <motion.div
                  key="claimed"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg"
                >
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="font-bold text-green-500">+{earnedXP} XP</span>
                </motion.div>
              ) : streakData.canClaimBonus ? (
                <motion.div key="claim">
                  <Button
                    onClick={claimDailyBonus}
                    disabled={claiming}
                    className="bg-gradient-to-r from-gym-orange to-amber-500 hover:from-gym-orange/90 hover:to-amber-500/90 text-white gap-2"
                  >
                    {claiming ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <>
                        <Gift className="w-4 h-4" />
                        Hämta
                      </>
                    )}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="collected"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Hämtad idag</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Streak milestones */}
          {streakData.currentStreak >= 3 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 pt-3 border-t border-border"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="w-3.5 h-3.5 text-gym-orange" />
                <span>
                  {streakData.currentStreak >= 7
                    ? "Max bonus! +60 XP per dag"
                    : `${7 - streakData.currentStreak} dagar kvar till max bonus`}
                </span>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
