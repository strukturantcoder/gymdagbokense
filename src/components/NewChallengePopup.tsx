import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Target, Users, Gift, PartyPopper } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface NewChallenge {
  id: string;
  title: string;
  description: string | null;
  goal_description: string;
  goal_unit: string;
  target_value: number | null;
  start_date: string;
  end_date: string;
  is_lottery: boolean;
  theme: string | null;
}

const SEEN_CHALLENGES_KEY = "gymdagboken_seen_challenges";

export function NewChallengePopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<NewChallenge | null>(null);
  const [open, setOpen] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    if (user) {
      checkForNewChallenges();
    }
  }, [user]);

  const checkForNewChallenges = async () => {
    try {
      // Get seen challenges from localStorage
      const seenChallenges = JSON.parse(localStorage.getItem(SEEN_CHALLENGES_KEY) || "[]");
      
      // Fetch active challenges that started within the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: challenges, error } = await supabase
        .from("community_challenges")
        .select("id, title, description, goal_description, goal_unit, target_value, start_date, end_date, is_lottery, theme")
        .eq("is_active", true)
        .gte("start_date", sevenDaysAgo.toISOString())
        .lte("start_date", new Date().toISOString())
        .order("start_date", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (challenges && challenges.length > 0) {
        const newChallenge = challenges[0];
        
        // Check if user has already seen this challenge
        if (!seenChallenges.includes(newChallenge.id)) {
          // Fetch participant count
          const { count } = await supabase
            .from("community_challenge_participants")
            .select("*", { count: "exact", head: true })
            .eq("challenge_id", newChallenge.id);

          setParticipantCount(count || 0);
          setChallenge(newChallenge);
          setOpen(true);
        }
      }
    } catch (error) {
      console.error("Error checking for new challenges:", error);
    }
  };

  const handleClose = () => {
    if (challenge) {
      // Mark challenge as seen
      const seenChallenges = JSON.parse(localStorage.getItem(SEEN_CHALLENGES_KEY) || "[]");
      seenChallenges.push(challenge.id);
      localStorage.setItem(SEEN_CHALLENGES_KEY, JSON.stringify(seenChallenges));
    }
    setOpen(false);
  };

  const handleJoin = async () => {
    if (!challenge || !user) return;

    try {
      const { error } = await supabase
        .from("community_challenge_participants")
        .insert({
          challenge_id: challenge.id,
          user_id: user.id,
        });

      if (error) {
        if (error.code === "23505") {
          // Already joined
          handleClose();
          navigate("/social?tab=challenges");
        } else {
          throw error;
        }
      } else {
        handleClose();
        navigate("/social?tab=challenges");
      }
    } catch (error) {
      console.error("Error joining challenge:", error);
    }
  };

  const handleViewChallenge = () => {
    handleClose();
    navigate("/social?tab=challenges");
  };

  if (!challenge) return null;

  const themeEmoji = challenge.theme === "christmas" ? "🎄" : 
                     challenge.theme === "summer" ? "☀️" : 
                     challenge.theme === "newyear" ? "🎆" : "🏆";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 10 }}
              className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-4"
            >
              {challenge.is_lottery ? (
                <Gift className="h-10 w-10 text-white" />
              ) : (
                <Trophy className="h-10 w-10 text-white" />
              )}
            </motion.div>
          </div>
          <DialogTitle className="text-center text-xl">
            {themeEmoji} Ny tävling!
          </DialogTitle>
          <DialogDescription className="text-center">
            En ny community-tävling har startat
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
            <h3 className="font-bold text-lg text-foreground mb-2">{challenge.title}</h3>
            {challenge.description && (
              <p className="text-sm text-muted-foreground mb-3">{challenge.description}</p>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>{challenge.goal_description}</span>
                {challenge.target_value && (
                  <Badge variant="secondary">
                    Mål: {challenge.target_value} {challenge.goal_unit}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(challenge.start_date), "d MMM", { locale: sv })} - {format(new Date(challenge.end_date), "d MMM yyyy", { locale: sv })}
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{participantCount} deltagare redan anmälda</span>
              </div>

              {challenge.is_lottery && (
                <div className="flex items-center gap-2 text-amber-600">
                  <PartyPopper className="h-4 w-4" />
                  <span className="font-medium">Utlottning bland alla som når målet!</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleViewChallenge} className="flex-1">
              Visa tävling
            </Button>
            <Button onClick={handleJoin} className="flex-1">
              <Trophy className="h-4 w-4 mr-2" />
              Delta nu
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
