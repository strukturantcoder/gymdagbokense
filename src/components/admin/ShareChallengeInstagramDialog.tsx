import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Copy, Loader2, Sparkles, RefreshCw, ExternalLink } from "lucide-react";

interface ChallengeData {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  goal_description: string;
  goal_unit: string;
  target_value: number | null;
  start_date: string;
  end_date: string;
  is_lottery: boolean;
  winner_type: string;
}

interface ShareChallengeInstagramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: ChallengeData | null;
}

export function ShareChallengeInstagramDialog({
  open,
  onOpenChange,
  challenge,
}: ShareChallengeInstagramDialogProps) {
  const [caption, setCaption] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && challenge) {
      generateCaption();
    }
  }, [open, challenge]);

  const generateCaption = async () => {
    if (!challenge) return;

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-instagram-post", {
        body: { challenge },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setCaption(data.caption || "");
    } catch (error) {
      console.error("Error generating caption:", error);
      toast.error("Kunde inte generera Instagram-inlägg");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      toast.success("Text kopierad till urklipp!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kunde inte kopiera text");
    }
  };

  const handleOpenInstagram = () => {
    // Copy text first
    navigator.clipboard.writeText(caption).then(() => {
      toast.success("Text kopierad! Öppnar Instagram...");
      // Open Instagram (will open app on mobile, web on desktop)
      window.open("https://www.instagram.com/", "_blank");
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Dela till Instagram
          </DialogTitle>
          <DialogDescription>
            AI-genererad text för att marknadsföra din tävling på Instagram.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {challenge && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium">{challenge.title}</p>
              <p className="text-muted-foreground text-xs mt-1">
                {new Date(challenge.start_date).toLocaleDateString("sv-SE")} - {new Date(challenge.end_date).toLocaleDateString("sv-SE")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="caption">Inläggstext</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateCaption}
                disabled={generating}
                className="h-8"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Generera ny
              </Button>
            </div>

            {generating ? (
              <div className="flex items-center justify-center py-12 border rounded-lg bg-muted/30">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">
                    <Sparkles className="inline h-4 w-4 mr-1" />
                    AI genererar inlägg...
                  </p>
                </div>
              </div>
            ) : (
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Instagram-text genereras..."
                className="min-h-[200px] resize-none"
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleOpenInstagram}
              disabled={!caption || generating}
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600"
            >
              <Instagram className="h-4 w-4 mr-2" />
              Öppna Instagram
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>

            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={!caption || generating}
            >
              <Copy className="h-4 w-4 mr-2" />
              {copied ? "Kopierad!" : "Kopiera text"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Texten kopieras automatiskt när du öppnar Instagram. Klistra sedan in i ditt nya inlägg.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
