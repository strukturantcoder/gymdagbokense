import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Copy, Loader2, Sparkles, RefreshCw, ExternalLink, Image, Download, Pencil } from "lucide-react";

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [showEditInput, setShowEditInput] = useState(false);

  useEffect(() => {
    if (open && challenge) {
      setImageUrl(null);
      setImagePrompt("");
      setEditPrompt("");
      setShowEditInput(false);
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
      // Store the suggested image prompt for later use
      if (data.suggestedImagePrompt) {
        setImagePrompt(data.suggestedImagePrompt);
      }
    } catch (error) {
      console.error("Error generating caption:", error);
      toast.error("Kunde inte generera Instagram-inlägg");
    } finally {
      setGenerating(false);
    }
  };

  const generateImage = async () => {
    if (!challenge) return;

    setGeneratingImage(true);
    try {
      const prompt = imagePrompt || `Fitness challenge promotional image for ${challenge.theme || challenge.title}`;
      
      const { data, error } = await supabase.functions.invoke("generate-challenge-image", {
        body: { 
          prompt,
          challengeTitle: challenge.title 
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setImageUrl(data.imageUrl);
      setShowEditInput(false);
      setEditPrompt("");
      toast.success("Bild genererad!");
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Kunde inte generera bild");
    } finally {
      setGeneratingImage(false);
    }
  };

  const editImage = async () => {
    if (!imageUrl || !editPrompt.trim()) {
      toast.error("Skriv en instruktion för att redigera bilden");
      return;
    }

    setGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-challenge-image", {
        body: { 
          prompt: editPrompt,
          challengeTitle: challenge?.title,
          editImage: imageUrl 
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setImageUrl(data.imageUrl);
      setShowEditInput(false);
      setEditPrompt("");
      toast.success("Bild redigerad!");
    } catch (error) {
      console.error("Error editing image:", error);
      toast.error("Kunde inte redigera bild");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!imageUrl) return;

    try {
      // Convert base64 to blob and download
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `instagram-${challenge?.title?.replace(/\s+/g, "-").toLowerCase() || "challenge"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Bild nedladdad!");
    } catch {
      toast.error("Kunde inte ladda ner bild");
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
    navigator.clipboard.writeText(caption).then(() => {
      toast.success("Text kopierad! Öppnar Instagram...");
      window.open("https://www.instagram.com/", "_blank");
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Dela till Instagram
          </DialogTitle>
          <DialogDescription>
            AI-genererad text och bild för att marknadsföra din tävling på Instagram.
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

          {/* Image Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Bild
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateImage}
                disabled={generatingImage || generating}
                className="h-8"
              >
                {generatingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                {imageUrl ? "Generera ny bild" : "Generera bild"}
              </Button>
            </div>

            {generatingImage ? (
              <div className="flex items-center justify-center py-12 border rounded-lg bg-muted/30 aspect-square">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">
                    <Sparkles className="inline h-4 w-4 mr-1" />
                    AI genererar bild...
                  </p>
                  <p className="text-xs text-muted-foreground">Detta kan ta några sekunder</p>
                </div>
              </div>
            ) : imageUrl ? (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden border">
                  <img 
                    src={imageUrl} 
                    alt="Generated challenge image" 
                    className="w-full aspect-square object-cover"
                  />
                </div>
                
                {showEditInput ? (
                  <div className="space-y-2">
                    <Input
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Beskriv hur du vill ändra bilden..."
                      onKeyDown={(e) => e.key === "Enter" && editImage()}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowEditInput(false); setEditPrompt(""); }}
                        className="flex-1"
                      >
                        Avbryt
                      </Button>
                      <Button
                        size="sm"
                        onClick={editImage}
                        disabled={!editPrompt.trim()}
                        className="flex-1"
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Redigera
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEditInput(true)}
                      className="flex-1"
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Redigera med AI
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadImage}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Ladda ner
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div 
                onClick={generateImage}
                className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Image className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Klicka för att generera en bild</p>
              </div>
            )}
          </div>

          {/* Caption Section */}
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
                className="min-h-[180px] resize-none"
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
            Ladda ner bilden och kopiera texten. Skapa sedan ett nytt inlägg i Instagram-appen.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
