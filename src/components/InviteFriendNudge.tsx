import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Users, Share2 } from "lucide-react";
import { toast } from "sonner";

interface InviteFriendNudgeProps {
  userId: string;
}

export default function InviteFriendNudge({ userId }: InviteFriendNudgeProps) {
  const [show, setShow] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    checkIfShouldShow();
  }, [userId]);

  const checkIfShouldShow = async () => {
    // Only show occasionally - check localStorage for last shown time
    const lastShown = localStorage.getItem("invite_nudge_last_shown");
    const now = Date.now();
    
    // Show at most once every 7 days
    if (lastShown && now - parseInt(lastShown) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // Check if user has any friends already
    const { count: friendCount } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq("status", "accepted");

    // Only show nudge if user has 0-2 friends
    if (friendCount !== null && friendCount <= 2) {
      // Get or create invite code
      const { data: existing } = await supabase
        .from("invite_codes")
        .select("code")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        setInviteCode(existing.code);
      }

      // Random chance to show (30%)
      if (Math.random() < 0.3) {
        setTimeout(() => setShow(true), 3000);
      }
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("invite_nudge_last_shown", Date.now().toString());
  };

  const shareLink = async () => {
    const url = `${window.location.origin}/auth?ref=${inviteCode}`;
    const shareData = {
      title: "Gymdagboken",
      text: "Träna med mig på Gymdagboken! Spåra din träning och tävla mot vänner.",
      url,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        dismiss();
      } catch {
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Inbjudningslänk kopierad!");
      dismiss();
    } catch {
      toast.error("Kunde inte kopiera länken");
    }
  };

  if (!inviteCode) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm"
        >
          <div className="bg-gradient-to-br from-gym-orange/90 to-gym-amber/90 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-white/20">
            <button
              onClick={dismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4 text-white/80" />
            </button>
            
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">
                  Träning är roligare med vänner!
                </p>
                <p className="text-white/80 text-xs mt-1">
                  Bjud in en vän och tävla om vem som tränar mest
                </p>
                <Button
                  size="sm"
                  onClick={shareLink}
                  className="mt-3 bg-white text-gym-orange hover:bg-white/90 w-full"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Bjud in en vän
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
