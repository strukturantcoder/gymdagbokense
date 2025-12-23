import { useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Share2, Users, Trophy, Gift, Sparkles, Image } from "lucide-react";
import { toast } from "sonner";

interface TeamCompetitionContent {
  prizeValue: string;
  prizeDescription: string;
  sponsor: string;
  sponsorUrl: string;
  deadline: string;
  instagramHandle: string;
}

interface TeamCompetitionGeneratorProps {
  content: TeamCompetitionContent;
  setContent: (content: TeamCompetitionContent) => void;
  logoImage: HTMLImageElement | null;
}

type TeamTemplate = "main" | "howItWorks" | "prize" | "winner";

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

export const TeamCompetitionGenerator = ({ content, setContent, logoImage }: TeamCompetitionGeneratorProps) => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TeamTemplate>("main");
  const [imageFormat, setImageFormat] = useState<"post" | "story">("post");

  const drawLogo = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    if (logoImage) {
      ctx.drawImage(logoImage, x - size / 2, y - size / 2, size, size);
    }
  };

  const generateImage = useCallback(async (
    canvas: HTMLCanvasElement,
    template: TeamTemplate,
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
      case "howItWorks":
        drawHowItWorksTemplate(ctx, width, height, format);
        break;
      case "prize":
        drawPrizeTemplate(ctx, width, height, format);
        break;
      case "winner":
        drawWinnerTemplate(ctx, width, height, format);
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

    // Team emoji
    ctx.font = "80px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("👥", width / 2, centerY - 280);

    // Main title
    ctx.font = "bold 80px 'Oswald', sans-serif";
    const titleGradient = ctx.createLinearGradient(0, centerY - 200, 0, centerY - 120);
    titleGradient.addColorStop(0, COLORS.orangeLight);
    titleGradient.addColorStop(1, COLORS.orange);
    ctx.fillStyle = titleGradient;
    ctx.fillText("LAGTÄVLING", width / 2, centerY - 160);

    // Subtitle
    ctx.font = "bold 56px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText("BYGG DITT LAG &", width / 2, centerY - 60);

    // Prize highlight
    const prizeGradient = ctx.createLinearGradient(0, centerY, 0, centerY + 100);
    prizeGradient.addColorStop(0, COLORS.orange);
    prizeGradient.addColorStop(1, COLORS.orangeDark);
    ctx.fillStyle = prizeGradient;
    ctx.font = "bold 100px 'Oswald', sans-serif";
    ctx.fillText(`VINN ${content.prizeValue}`, width / 2, centerY + 60);

    // Sponsor
    ctx.font = "bold 48px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText(`HOS ${content.sponsor.toUpperCase()}`, width / 2, centerY + 140);

    // Gift emoji
    ctx.font = "80px sans-serif";
    ctx.fillText("🎁", width / 2, centerY + 250);

    // Bottom text
    ctx.font = "36px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText("Svajpa för att se hur du deltar →", width / 2, height - 100);
  };

  const drawHowItWorksTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const startY = format === "post" ? height * 0.22 : height * 0.15;

    // Title
    ctx.font = "bold 72px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.textAlign = "center";
    ctx.fillText("SÅ VINNER DU", width / 2, startY);

    // Arrow
    ctx.font = "60px sans-serif";
    ctx.fillText("👇", width / 2, startY + 80);

    // Steps
    const steps = [
      { emoji: "1️⃣", text: "Registrera dig på gymdagboken.se" },
      { emoji: "2️⃣", text: "Skapa ett lag" },
      { emoji: "3️⃣", text: "Bjud in vänner via länk" },
      { emoji: "4️⃣", text: "Få flest att gå med!" },
    ];

    ctx.fillStyle = COLORS.white;

    let yPos = startY + 180;
    steps.forEach((step) => {
      ctx.font = "48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(step.emoji, width / 2 - 340, yPos);
      ctx.font = "bold 40px 'Oswald', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(step.text, width / 2 - 280, yPos);
      ctx.textAlign = "center";
      yPos += 100;
    });

    // Trophy
    ctx.font = "80px sans-serif";
    ctx.fillText("🏆", width / 2, yPos + 60);

    // Bottom info
    ctx.font = "bold 36px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orangeLight;
    ctx.fillText("Lagledaren med flest inbjudna vinner!", width / 2, height - 150);

    ctx.font = "32px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText(`Tävlingen avslutas ${content.deadline}`, width / 2, height - 100);
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
    ctx.fillText("PRISET", width / 2, centerY - 80);

    // Prize value
    ctx.font = "bold 120px 'Oswald', sans-serif";
    const prizeGradient = ctx.createLinearGradient(0, centerY, 0, centerY + 100);
    prizeGradient.addColorStop(0, COLORS.orangeLight);
    prizeGradient.addColorStop(1, COLORS.orange);
    ctx.fillStyle = prizeGradient;
    ctx.fillText(content.prizeValue, width / 2, centerY + 40);

    // Prize type
    ctx.font = "bold 56px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText(content.prizeDescription.toUpperCase(), width / 2, centerY + 120);

    // Sponsor
    ctx.font = "bold 48px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orangeLight;
    ctx.fillText(`HOS ${content.sponsor.toUpperCase()}`, width / 2, centerY + 200);

    // Website
    ctx.font = "36px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText(content.sponsorUrl, width / 2, centerY + 260);

    // Shopping emoji
    ctx.font = "60px sans-serif";
    ctx.fillText("🛒💪", width / 2, height - 120);
  };

  const drawWinnerTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 30 : 100);

    // Trophy
    ctx.font = "120px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🏆", width / 2, centerY - 150);

    // Title
    ctx.font = "bold 72px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.fillText("VINNAREN", width / 2, centerY);
    ctx.fillText("UTSES", width / 2, centerY + 80);

    // Date
    ctx.font = "bold 56px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText(content.deadline, width / 2, centerY + 180);

    // Info
    ctx.font = "36px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText("Vinnaren kontaktas via appen", width / 2, centerY + 250);

    // Good luck
    ctx.font = "60px sans-serif";
    ctx.fillText("🍀", width / 2, height - 150);
    ctx.font = "bold 40px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.fillText("Lycka till!", width / 2, height - 80);
  };

  // Update preview
  useEffect(() => {
    if (previewCanvasRef.current && logoImage) {
      generateImage(previewCanvasRef.current, selectedTemplate, imageFormat);
    }
  }, [selectedTemplate, imageFormat, logoImage, generateImage]);

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
    link.download = `lagtavling-${selectedTemplate}-${imageFormat}-${Date.now()}.png`;
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

    const file = new File([blob], `lagtavling-${selectedTemplate}-${imageFormat}.png`, { type: "image/png" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Gymdagboken Lagtävling",
          text: "Dela till Instagram",
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

  const templates: { id: TeamTemplate; label: string; icon: React.ReactNode }[] = [
    { id: "main", label: "Huvudbild", icon: <Users className="h-4 w-4" /> },
    { id: "howItWorks", label: "Så vinner du", icon: <Trophy className="h-4 w-4" /> },
    { id: "prize", label: "Priset", icon: <Gift className="h-4 w-4" /> },
    { id: "winner", label: "Vinnare", icon: <Sparkles className="h-4 w-4" /> },
  ];

  const competitionText = `👥 LAGTÄVLING - VINN ${content.prizeValue}! 👥

Bygg ditt drömlag och vinn ett presentkort på ${content.prizeValue.toLowerCase()} hos ${content.sponsor}! 🎁

🏆 SÅ VINNER DU:
1️⃣ Registrera dig på gymdagboken.se
2️⃣ Skapa ett lag i appen
3️⃣ Bjud in dina vänner via delningslänk
4️⃣ Lagledaren med flest inbjudna som går med vinner!

💪 Max 10 medlemmar per lag
📅 Tävlingen avslutas ${content.deadline}
🏆 Vinnaren kontaktas via appen

Dags att rekrytera ditt gäng! 🔥

#gymdagboken #lagtävling #träning #fitness #giveaway #${content.sponsor.toLowerCase().replace(/\s+/g, "")}`;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Controls */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Välj mall och format
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Template selection */}
            <div className="space-y-3">
              <Label>Mall</Label>
              <div className="grid grid-cols-2 gap-2">
                {templates.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    className="justify-start gap-2"
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    {template.icon}
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Format selection */}
            <div className="space-y-3">
              <Label>Format</Label>
              <Tabs value={imageFormat} onValueChange={(v) => setImageFormat(v as "post" | "story")}>
                <TabsList className="w-full">
                  <TabsTrigger value="post" className="flex-1">
                    Post (1080x1080)
                  </TabsTrigger>
                  <TabsTrigger value="story" className="flex-1">
                    Story (1080x1920)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <Button onClick={handleShare} className="w-full" size="lg">
                <Share2 className="h-5 w-5 mr-2" />
                Dela till Instagram
              </Button>
              <Button onClick={handleDownload} variant="outline" className="w-full" size="lg">
                <Download className="h-5 w-5 mr-2" />
                Ladda ner bild
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Editable content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Tävlingsinnehåll
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamPrizeValue">Prisvärde</Label>
                <Input
                  id="teamPrizeValue"
                  value={content.prizeValue}
                  onChange={(e) => setContent({ ...content, prizeValue: e.target.value })}
                  placeholder="1000 KR"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamPrizeDescription">Pristyp</Label>
                <Input
                  id="teamPrizeDescription"
                  value={content.prizeDescription}
                  onChange={(e) => setContent({ ...content, prizeDescription: e.target.value })}
                  placeholder="PRESENTKORT"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamSponsor">Sponsor</Label>
                <Input
                  id="teamSponsor"
                  value={content.sponsor}
                  onChange={(e) => setContent({ ...content, sponsor: e.target.value })}
                  placeholder="ATLETBUTIKEN"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamSponsorUrl">Sponsor URL</Label>
                <Input
                  id="teamSponsorUrl"
                  value={content.sponsorUrl}
                  onChange={(e) => setContent({ ...content, sponsorUrl: e.target.value })}
                  placeholder="atletbutiken.se"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="teamDeadline">Deadline</Label>
                <Input
                  id="teamDeadline"
                  value={content.deadline}
                  onChange={(e) => setContent({ ...content, deadline: e.target.value })}
                  placeholder="31 januari 2025"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamInstagram">Instagram-handle</Label>
                <Input
                  id="teamInstagram"
                  value={content.instagramHandle}
                  onChange={(e) => setContent({ ...content, instagramHandle: e.target.value })}
                  placeholder="@gymdagbokense"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Förhandsvisning</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="relative bg-muted rounded-lg overflow-hidden flex items-center justify-center"
              style={{
                aspectRatio: imageFormat === "post" ? "1/1" : "9/16",
                maxHeight: "600px"
              }}
            >
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-full object-contain"
                style={{
                  width: imageFormat === "post" ? "100%" : "auto",
                  height: imageFormat === "story" ? "100%" : "auto"
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Competition text */}
        <Card>
          <CardHeader>
            <CardTitle>Tävlingstext (för kopiering)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-x-auto">
              {competitionText}
            </pre>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                navigator.clipboard.writeText(competitionText);
                toast.success("Text kopierad!");
              }}
            >
              Kopiera text
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Hidden canvas for download */}
      <canvas ref={downloadCanvasRef} className="hidden" />
    </div>
  );
};

export default TeamCompetitionGenerator;
