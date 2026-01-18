import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Dumbbell, Loader2 } from "lucide-react";

import AdBanner from "@/components/AdBanner";
import CrossFitWOD from "@/components/CrossFitWOD";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Crossfit() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-20 md:pb-4">
      <header className="border-b border-border bg-card shrink-0">
        <div className="px-3 py-2 md:px-4 md:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/training")}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display text-base font-bold">CROSSFIT</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-3 pt-2 md:px-4">
        <AdBanner format="horizontal" placement="training_top" />
      </div>

      <main className="px-3 py-3 md:px-4">
        <CrossFitWOD />
      </main>

      <div className="px-3 pb-4 md:px-4">
        <AdBanner format="horizontal" placement="training_bottom" />
      </div>
    </div>
  );
}
