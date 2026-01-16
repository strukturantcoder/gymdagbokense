import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Instagram, Copy, Loader2, RefreshCw, ExternalLink, Image, Download, Share2, Trophy, Target, Calendar, Gift } from "lucide-react";

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

type ChallengeTemplate = "main" | "howToJoin" | "prize" | "deadline";

const COLORS = {
  background: "#121212",
  backgroundGradient1: "#0a0a0a",
  backgroundGradient2: "#1a1a1a",
  orange: "#f97316",
  orangeLight: "#fb923c",
  orangeDark: "#ea580c",
  white: "#FFFFFF",
  whiteMuted: "rgba(255, 255, 255, 0.8)",
  whiteDim: "rgba(255, 255, 255, 0.6)",
};

interface ChallengeContent {
  title: string;
  subtitle: string;
  goalText: string;
  prizeText: string;
  deadlineText: string;
  swipeText: string;
  howToJoinTitle: string;
  howToJoinSteps: string[];
  instagramHandle: string;
}

export function ShareChallengeInstagramDialog({
  open,
  onOpenChange,
  challenge,
}: ShareChallengeInstagramDialogProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);
  const [caption, setCaption] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate>("main");
  const [imageFormat, setImageFormat] = useState<"post" | "story">("post");
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  
  const [content, setContent] = useState<ChallengeContent>({
    title: "",
    subtitle: "",
    goalText: "",
    prizeText: "",
    deadlineText: "",
    swipeText: "Svajpa för mer info →",
    howToJoinTitle: "SÅ DELTAR DU",
    howToJoinSteps: [
      "Öppna gymdagboken.se",
      "Gå med i tävlingen",
      "Genomför utmaningen",
      "Vinn priset!",
    ],
    instagramHandle: "@gymdagbokense",
  });

  // Load logo
  useEffect(() => {
    const logo = new window.Image();
    logo.crossOrigin = "anonymous";
    logo.onload = () => setLogoImage(logo);
    logo.src = "/logo-garmin-256.png";
  }, []);

  // Initialize content from challenge
  useEffect(() => {
    if (open && challenge) {
      const endDate = new Date(challenge.end_date);
      const formattedDeadline = endDate.toLocaleDateString("sv-SE", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });

      setContent({
        title: challenge.title.toUpperCase(),
        subtitle: challenge.theme?.toUpperCase() || "DELTA NU",
        goalText: challenge.target_value
          ? `${challenge.target_value} ${challenge.goal_unit.toUpperCase()}`
          : challenge.goal_description.toUpperCase(),
        prizeText: challenge.is_lottery ? "VINN I LOTTERIET" : "VINN UTMANINGEN",
        deadlineText: formattedDeadline,
        swipeText: "Svajpa för mer info →",
        howToJoinTitle: "SÅ DELTAR DU",
        howToJoinSteps: [
          "Öppna gymdagboken.se",
          "Gå med i tävlingen",
          challenge.goal_description || "Genomför utmaningen",
          "Vinn priset!",
        ],
        instagramHandle: "@gymdagbokense",
      });
      setSelectedTemplate("main");
      generateCaption();
    }
  }, [open, challenge]);

  const drawLogo = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    if (logoImage) {
      ctx.drawImage(logoImage, x - size / 2, y - size / 2, size, size);
    }
  };

  const generateImage = useCallback(async (
    canvas: HTMLCanvasElement,
    template: ChallengeTemplate,
    format: "post" | "story"
  ): Promise<Blob | null> => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const width = 1080;
    const height = format === "post" ? 1080 : 1920;
    canvas.width = width;
    canvas.height = height;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, COLORS.backgroundGradient1);
    gradient.addColorStop(0.5, COLORS.background);
    gradient.addColorStop(1, COLORS.backgroundGradient2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Orange glow effects
    ctx.shadowBlur = 150;
    ctx.shadowColor = "rgba(249, 115, 22, 0.4)";
    ctx.beginPath();
    ctx.arc(width * 0.8, height * 0.2, 200, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(249, 115, 22, 0.08)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(width * 0.2, height * 0.8, 250, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(249, 115, 22, 0.05)";
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw logo
    const logoSize = format === "post" ? 120 : 150;
    const logoY = format === "post" ? 100 : 120;
    drawLogo(ctx, width / 2, logoY, logoSize);

    // Draw template-specific content
    switch (template) {
      case "main":
        drawMainTemplate(ctx, width, height, format);
        break;
      case "howToJoin":
        drawHowToJoinTemplate(ctx, width, height, format);
        break;
      case "prize":
        drawPrizeTemplate(ctx, width, height, format);
        break;
      case "deadline":
        drawDeadlineTemplate(ctx, width, height, format);
        break;
    }

    // Branding
    ctx.font = "bold 32px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.textAlign = "center";
    ctx.fillText(content.instagramHandle, width / 2, height - 40);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
    });
  }, [logoImage, content]);

  const drawMainTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 30 : 100);

    // Trophy emoji
    ctx.font = "80px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🏆", width / 2, centerY - 280);

    // Main title
    ctx.font = "bold 72px 'Oswald', sans-serif";
    const titleGradient = ctx.createLinearGradient(0, centerY - 200, 0, centerY - 120);
    titleGradient.addColorStop(0, COLORS.orangeLight);
    titleGradient.addColorStop(1, COLORS.orange);
    ctx.fillStyle = titleGradient;
    
    // Word wrap title
    const words = content.title.split(" ");
    let line = "";
    let lines: string[] = [];
    const maxWidth = width - 100;
    
    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    
    lines.forEach((l, i) => {
      ctx.fillText(l, width / 2, centerY - 180 + (i * 80));
    });

    // Subtitle
    const subtitleY = centerY - 180 + (lines.length * 80) + 30;
    ctx.font = "bold 48px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText(content.subtitle, width / 2, subtitleY);

    // Goal highlight
    const goalY = subtitleY + 100;
    const prizeGradient = ctx.createLinearGradient(0, goalY, 0, goalY + 100);
    prizeGradient.addColorStop(0, COLORS.orange);
    prizeGradient.addColorStop(1, COLORS.orangeDark);
    ctx.fillStyle = prizeGradient;
    ctx.font = "bold 90px 'Oswald', sans-serif";
    ctx.fillText(content.goalText, width / 2, goalY);

    // Fire emoji
    ctx.font = "80px sans-serif";
    ctx.fillText("🔥", width / 2, goalY + 120);

    // Bottom text
    ctx.font = "36px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText(content.swipeText, width / 2, height - 100);
  };

  const drawHowToJoinTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const startY = format === "post" ? height * 0.22 : height * 0.15;

    // Title
    ctx.font = "bold 72px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.textAlign = "center";
    ctx.fillText(content.howToJoinTitle, width / 2, startY);

    // Arrow
    ctx.font = "60px sans-serif";
    ctx.fillText("👇", width / 2, startY + 80);

    // Steps
    const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];
    ctx.fillStyle = COLORS.white;

    let yPos = startY + 180;
    content.howToJoinSteps.forEach((text, index) => {
      ctx.font = "48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(emojis[index] || `${index + 1}️⃣`, width / 2 - 340, yPos);
      ctx.font = "bold 40px 'Oswald', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(text, width / 2 - 280, yPos);
      ctx.textAlign = "center";
      yPos += 100;
    });

    // Trophy
    ctx.font = "80px sans-serif";
    ctx.fillText("💪", width / 2, yPos + 60);

    // Bottom info
    ctx.font = "bold 36px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orangeLight;
    ctx.fillText("Anmäl dig nu på gymdagboken.se", width / 2, height - 150);

    ctx.font = "32px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText(`Deadline: ${content.deadlineText}`, width / 2, height - 100);
  };

  const drawPrizeTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 30 : 100);

    // Gift emoji
    ctx.font = "100px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎁", width / 2, centerY - 200);

    // Title
    ctx.font = "bold 64px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.fillText(content.prizeText, width / 2, centerY - 80);

    // Challenge name
    ctx.font = "bold 80px 'Oswald', sans-serif";
    const prizeGradient = ctx.createLinearGradient(0, centerY, 0, centerY + 100);
    prizeGradient.addColorStop(0, COLORS.orangeLight);
    prizeGradient.addColorStop(1, COLORS.orange);
    ctx.fillStyle = prizeGradient;
    
    // Word wrap
    const words = content.title.split(" ");
    let line = "";
    let lines: string[] = [];
    const maxWidth = width - 100;
    
    for (const word of words) {
      const testLine = line + (line ? " " : "") + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    
    lines.forEach((l, i) => {
      ctx.fillText(l, width / 2, centerY + 20 + (i * 90));
    });

    // Goal
    const goalY = centerY + 20 + (lines.length * 90) + 40;
    ctx.font = "bold 56px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText(content.goalText, width / 2, goalY);

    // Trophy emoji
    ctx.font = "60px sans-serif";
    ctx.fillText("🏆", width / 2, height - 120);
  };

  const drawDeadlineTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 30 : 100);

    // Clock emoji
    ctx.font = "120px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⏰", width / 2, centerY - 150);

    // Title
    ctx.font = "bold 72px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.fillText("SISTA CHANSEN", width / 2, centerY);

    // Date
    ctx.font = "bold 56px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText(content.deadlineText.toUpperCase(), width / 2, centerY + 80);

    // Challenge name
    ctx.font = "bold 48px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orangeLight;
    ctx.fillText(content.title, width / 2, centerY + 160);

    // Info
    ctx.font = "36px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText("Anmäl dig innan det är för sent!", width / 2, centerY + 230);

    // Fire emoji
    ctx.font = "60px sans-serif";
    ctx.fillText("🔥", width / 2, height - 120);
  };

  // Update preview
  useEffect(() => {
    if (previewCanvasRef.current && logoImage && open) {
      generateImage(previewCanvasRef.current, selectedTemplate, imageFormat);
    }
  }, [selectedTemplate, imageFormat, logoImage, generateImage, open, content]);

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

  const handleDownload = async () => {
    if (!downloadCanvasRef.current) {
      toast.error("Kunde inte generera bilden");
      return;
    }

    const blob = await generateImage(downloadCanvasRef.current, selectedTemplate, imageFormat);
    if (!blob) {
      toast.error("Kunde inte generera bilden");
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `challenge-${selectedTemplate}-${imageFormat}-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Bilden har laddats ner!");
  };

  const handleShare = async () => {
    if (!downloadCanvasRef.current) {
      toast.error("Kunde inte generera bilden");
      return;
    }

    const blob = await generateImage(downloadCanvasRef.current, selectedTemplate, imageFormat);
    if (!blob) {
      toast.error("Kunde inte generera bilden");
      return;
    }

    const file = new File([blob], `challenge-${selectedTemplate}-${imageFormat}.png`, { type: "image/png" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: challenge?.title || "Gymdagboken Tävling",
          text: caption,
        });
        toast.success("Delad!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          handleDownload();
        }
      }
    } else {
      handleDownload();
      toast.info("Öppna Instagram och välj bilden från kamerarullen");
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

  const templates: { id: ChallengeTemplate; label: string; icon: React.ReactNode }[] = [
    { id: "main", label: "Huvudbild", icon: <Trophy className="h-4 w-4" /> },
    { id: "howToJoin", label: "Så deltar du", icon: <Target className="h-4 w-4" /> },
    { id: "prize", label: "Priset", icon: <Gift className="h-4 w-4" /> },
    { id: "deadline", label: "Deadline", icon: <Calendar className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-500" />
            Dela till Instagram
          </DialogTitle>
          <DialogDescription>
            Skapa professionella bilder för att marknadsföra din tävling på Instagram.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Controls */}
          <div className="space-y-4">
            {challenge && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium">{challenge.title}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {new Date(challenge.start_date).toLocaleDateString("sv-SE")} - {new Date(challenge.end_date).toLocaleDateString("sv-SE")}
                </p>
              </div>
            )}

            {/* Template selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Välj mall
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    className="justify-start gap-2"
                    size="sm"
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    {template.icon}
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Format selection */}
            <div className="space-y-2">
              <Label>Format</Label>
              <Tabs value={imageFormat} onValueChange={(v) => setImageFormat(v as "post" | "story")}>
                <TabsList className="w-full">
                  <TabsTrigger value="post" className="flex-1">
                    Post (1080×1080)
                  </TabsTrigger>
                  <TabsTrigger value="story" className="flex-1">
                    Story (1080×1920)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Editable content */}
            <div className="space-y-3">
              <Label>Anpassa text</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="title" className="text-xs text-muted-foreground">Titel</Label>
                  <Input
                    id="title"
                    value={content.title}
                    onChange={(e) => setContent({ ...content, title: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="subtitle" className="text-xs text-muted-foreground">Underrubrik</Label>
                  <Input
                    id="subtitle"
                    value={content.subtitle}
                    onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="goalText" className="text-xs text-muted-foreground">Mål</Label>
                  <Input
                    id="goalText"
                    value={content.goalText}
                    onChange={(e) => setContent({ ...content, goalText: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prizeText" className="text-xs text-muted-foreground">Pristext</Label>
                  <Input
                    id="prizeText"
                    value={content.prizeText}
                    onChange={(e) => setContent({ ...content, prizeText: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <Button onClick={handleShare} className="w-full" size="lg">
                <Share2 className="h-5 w-5 mr-2" />
                Dela till Instagram
              </Button>
              <Button onClick={handleDownload} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Ladda ner bild
              </Button>
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
                <div className="flex items-center justify-center py-8 border rounded-lg bg-muted/30">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">AI genererar inlägg...</p>
                  </div>
                </div>
              ) : (
                <Textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Instagram-text genereras..."
                  className="min-h-[120px] resize-none text-sm"
                />
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!caption || generating}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {copied ? "Kopierad!" : "Kopiera text"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInstagram}
                  disabled={!caption || generating}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Öppna Instagram
                </Button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Förhandsvisning</Label>
            <div className="border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center p-4">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-[500px] object-contain rounded shadow-lg"
                style={{ 
                  aspectRatio: imageFormat === "post" ? "1/1" : "9/16",
                  maxHeight: imageFormat === "post" ? "400px" : "500px"
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Välj mall och format, ladda sedan ner bilden.
            </p>
          </div>
        </div>

        {/* Hidden canvas for download */}
        <canvas ref={downloadCanvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
