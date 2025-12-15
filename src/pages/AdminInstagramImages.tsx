import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Image, Sparkles, Trophy, Gift, Dumbbell, FolderDown, Megaphone, Share2 } from "lucide-react";
import { toast } from "sonner";
import MarketingImageGenerator from "@/components/admin/MarketingImageGenerator";

// Competition content configuration
interface CompetitionContent {
  prizeValue: string;
  prizeDescription: string;
  sponsor: string;
  commentQuestion: string;
  tagCount: string;
  deadline: string;
  instagramHandle: string;
}

type ImageTemplate = "main" | "howToEnter" | "extraChance" | "winner" | "countdown";

// Brand colors - Black and Orange theme
const COLORS = {
  background: "#121212",
  backgroundGradient1: "#0a0a0a",
  backgroundGradient2: "#1a1a1a",
  orange: "#f97316", // HSL 25 95% 53%
  orangeLight: "#fb923c",
  orangeDark: "#ea580c",
  white: "#FFFFFF",
  whiteMuted: "rgba(255, 255, 255, 0.8)",
  whiteDim: "rgba(255, 255, 255, 0.6)",
};

const AdminInstagramImages = () => {
  const { isAdmin, loading: isLoading } = useAdmin();
  const navigate = useNavigate();
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ImageTemplate>("main");
  const [imageFormat, setImageFormat] = useState<"post" | "story">("post");
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  
  // Editable competition content - load from localStorage
  const [content, setContent] = useState<CompetitionContent>(() => {
    const saved = localStorage.getItem('instagram-competition-content');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback to defaults
      }
    }
    return {
      prizeValue: "1000 KR",
      prizeDescription: "PRESENTKORT",
      sponsor: "GYMGROSSISTEN",
      commentQuestion: "Vad är ett måste i din träning?",
      tagCount: "2",
      deadline: "19 december kl. 12:00",
      instagramHandle: "@gymdagbokense",
    };
  });

  // Save content to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('instagram-competition-content', JSON.stringify(content));
  }, [content]);

  // Load and process logo to remove white background
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Create a canvas to process the image and remove white background
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setLogoImage(img);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Make white/light pixels transparent
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check if pixel is white or very light (threshold: 240)
        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Create a new image from the processed canvas
      const processedImg = new window.Image();
      processedImg.onload = () => setLogoImage(processedImg);
      processedImg.src = canvas.toDataURL("image/png");
    };
    img.src = "/pwa-512x512.png";
  }, []);

  const drawLogo = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    if (logoImage) {
      ctx.drawImage(logoImage, x - size / 2, y - size / 2, size, size);
    }
  };

  const generateImage = useCallback(async (
    canvas: HTMLCanvasElement,
    template: ImageTemplate, 
    format: "post" | "story"
  ): Promise<Blob | null> => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Set dimensions based on format
    const width = 1080;
    const height = format === "post" ? 1080 : 1920;
    canvas.width = width;
    canvas.height = height;

    // Background gradient - Black
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, COLORS.backgroundGradient1);
    gradient.addColorStop(0.5, COLORS.background);
    gradient.addColorStop(1, COLORS.backgroundGradient2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add orange glow effects
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

    // Draw logo at top
    const logoSize = format === "post" ? 120 : 150;
    const logoY = format === "post" ? 100 : 120;
    drawLogo(ctx, width / 2, logoY, logoSize);

    // Draw template-specific content
    switch (template) {
      case "main":
        drawMainTemplate(ctx, width, height, format);
        break;
      case "howToEnter":
        drawHowToEnterTemplate(ctx, width, height, format);
        break;
      case "extraChance":
        drawExtraChanceTemplate(ctx, width, height, format);
        break;
      case "winner":
        drawWinnerTemplate(ctx, width, height, format);
        break;
      case "countdown":
        drawCountdownTemplate(ctx, width, height, format);
        break;
    }

    // Add branding at bottom
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

    // Fire emoji
    ctx.font = "80px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🔥", width / 2, centerY - 280);

    // Main title with orange gradient
    ctx.font = "bold 90px 'Oswald', sans-serif";
    const titleGradient = ctx.createLinearGradient(0, centerY - 200, 0, centerY - 120);
    titleGradient.addColorStop(0, COLORS.orangeLight);
    titleGradient.addColorStop(1, COLORS.orange);
    ctx.fillStyle = titleGradient;
    ctx.fillText("TÄVLA & VINN", width / 2, centerY - 160);

    // Prize highlight
    const prizeGradient = ctx.createLinearGradient(0, centerY - 80, 0, centerY + 100);
    prizeGradient.addColorStop(0, COLORS.orange);
    prizeGradient.addColorStop(1, COLORS.orangeDark);
    ctx.fillStyle = prizeGradient;
    ctx.font = "bold 72px 'Oswald', sans-serif";
    ctx.fillText(content.prizeDescription.toUpperCase(), width / 2, centerY - 40);
    ctx.font = "bold 120px 'Oswald', sans-serif";
    ctx.fillText(content.prizeValue.toUpperCase(), width / 2, centerY + 80);

    // From text
    ctx.font = "bold 48px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText(`FRÅN ${content.sponsor.toUpperCase()}`, width / 2, centerY + 160);

    // Gift emoji
    ctx.font = "100px sans-serif";
    ctx.fillText("🎁", width / 2, centerY + 280);

    // Bottom text
    ctx.font = "36px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText("Svajpa för att se hur du deltar →", width / 2, height - 100);
  };

  const drawHowToEnterTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const startY = format === "post" ? height * 0.22 : height * 0.15;

    // Title
    ctx.font = "bold 72px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.textAlign = "center";
    ctx.fillText("SÅ DELTAR DU", width / 2, startY);

    // Down arrow
    ctx.font = "60px sans-serif";
    ctx.fillText("👇", width / 2, startY + 80);

    // Steps
    const steps = [
      { emoji: "1️⃣", text: `Följ ${content.instagramHandle}` },
      { emoji: "2️⃣", text: "Gilla detta inlägg ❤️" },
      { emoji: "3️⃣", text: "Kommentera:" },
    ];

    ctx.fillStyle = COLORS.white;

    let yPos = startY + 180;
    steps.forEach((step) => {
      ctx.font = "48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(step.emoji, width / 2 - 300, yPos);
      ctx.font = "bold 44px 'Oswald', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(step.text, width / 2 - 240, yPos);
      ctx.textAlign = "center";
      yPos += 100;
    });

    // Comment instruction
    ctx.font = "italic 36px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText(`"${content.commentQuestion}"`, width / 2, yPos + 20);
    ctx.fillText(`+ tagga ${content.tagCount} träningskompisar`, width / 2, yPos + 70);

    // Deadline
    ctx.font = "bold 40px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.fillText("📅 Tävlingen avslutas", width / 2, height - 200);
    ctx.fillText(content.deadline, width / 2, height - 150);
  };

  const drawExtraChanceTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 30 : 100);

    // Title
    ctx.font = "80px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("💥", width / 2, centerY - 280);

    ctx.font = "bold 64px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.fillText("EXTRA CHANS", width / 2, centerY - 180);
    ctx.fillText("ATT VINNA", width / 2, centerY - 110);

    // Steps
    const steps = [
      "➡️ Registrera dig på gymdagboken.se",
      "➡️ Genomför ett styrkepass i appen",
      "➡️ Dela passet i din story",
      `➡️ Tagga ${content.instagramHandle}`,
    ];

    ctx.font = "bold 40px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;

    let yPos = centerY;
    steps.forEach((step) => {
      ctx.fillText(step, width / 2, yPos);
      yPos += 70;
    });

    // Rocket emoji
    ctx.font = "80px sans-serif";
    ctx.fillText("🚀", width / 2, yPos + 60);

    // Bottom highlight
    ctx.font = "bold 36px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orangeLight;
    ctx.fillText("Dubbla dina chanser att vinna!", width / 2, height - 100);
  };

  const drawWinnerTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 30 : 100);

    // Trophy
    ctx.font = "120px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🏆", width / 2, centerY - 150);

    // Title
    ctx.font = "bold 80px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.fillText("VINNAREN", width / 2, centerY);
    ctx.fillText("LOTTAS", width / 2, centerY + 80);

    // Date - extract just the date from deadline
    const deadlineDate = content.deadline.split(" kl.")[0] || content.deadline;
    ctx.font = "bold 48px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText(deadlineDate, width / 2, centerY + 180);

    // Contact info
    ctx.font = "36px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText("Vinnaren kontaktas via DM", width / 2, centerY + 260);

    // Good luck
    ctx.font = "60px sans-serif";
    ctx.fillText("🍀", width / 2, height - 150);
    ctx.font = "bold 40px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.fillText("Lycka till!", width / 2, height - 80);
  };

  const drawCountdownTemplate = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 30 : 100);

    // Clock
    ctx.font = "100px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⏰", width / 2, centerY - 200);

    // Title
    ctx.font = "bold 72px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orangeLight;
    ctx.fillText("SISTA CHANSEN!", width / 2, centerY - 60);

    // Deadline
    ctx.font = "bold 56px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.fillText("Tävlingen avslutas", width / 2, centerY + 40);
    ctx.font = "bold 64px 'Oswald', sans-serif";
    ctx.fillText(content.deadline, width / 2, centerY + 120);

    // Call to action
    ctx.font = "bold 44px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText("Har du deltagit?", width / 2, centerY + 220);

    // Emojis
    ctx.font = "60px sans-serif";
    ctx.fillText("🔥💪🎁", width / 2, height - 120);
  };

  // Update preview when template, format, logo, or content changes
  useEffect(() => {
    if (isAdmin && previewCanvasRef.current && logoImage) {
      generateImage(previewCanvasRef.current, selectedTemplate, imageFormat);
    }
  }, [selectedTemplate, imageFormat, isAdmin, logoImage, generateImage, content]);

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
    link.download = `instagram-${selectedTemplate}-${imageFormat}-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Bilden har laddats ner!");
  };

  const handleDownloadAll = async () => {
    if (!downloadCanvasRef.current) {
      toast.error("Kunde inte generera bilderna");
      return;
    }

    const allTemplates: ImageTemplate[] = ["main", "howToEnter", "extraChance", "winner", "countdown"];
    const timestamp = Date.now();
    
    toast.info("Genererar alla bilder...");

    for (const template of allTemplates) {
      const blob = await generateImage(downloadCanvasRef.current, template, imageFormat);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `instagram-${template}-${imageFormat}-${timestamp}.png`;
        link.click();
        URL.revokeObjectURL(url);
        // Small delay between downloads to prevent browser blocking
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    toast.success("Alla bilder har laddats ner!");
  };

  const handleShareToInstagram = async () => {
    if (!downloadCanvasRef.current) {
      toast.error("Kunde inte generera bilden");
      return;
    }

    const blob = await generateImage(downloadCanvasRef.current, selectedTemplate, imageFormat);
    if (!blob) {
      toast.error("Kunde inte generera bilden");
      return;
    }

    const file = new File([blob], `instagram-${selectedTemplate}-${imageFormat}.png`, { type: "image/png" });

    // Check if native share is available
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Gymdagboken Instagram",
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

  const templates: { id: ImageTemplate; label: string; icon: React.ReactNode }[] = [
    { id: "main", label: "Huvudbild", icon: <Trophy className="h-4 w-4" /> },
    { id: "howToEnter", label: "Så deltar du", icon: <Dumbbell className="h-4 w-4" /> },
    { id: "extraChance", label: "Extra chans", icon: <Sparkles className="h-4 w-4" /> },
    { id: "winner", label: "Vinnare lottas", icon: <Gift className="h-4 w-4" /> },
    { id: "countdown", label: "Countdown", icon: <Image className="h-4 w-4" /> },
  ];

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Instagram Bildgenerator</h1>
        <Button variant="outline" onClick={() => navigate("/admin/challenges")}>
          ← Tillbaka
        </Button>
      </div>

      <Tabs defaultValue="competition" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="competition" className="gap-2">
            <Trophy className="h-4 w-4" />
            Tävling
          </TabsTrigger>
          <TabsTrigger value="marketing" className="gap-2">
            <Megaphone className="h-4 w-4" />
            Marknadsföring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="competition">
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

              {/* Download and share buttons */}
              <div className="space-y-2">
                <Button onClick={handleShareToInstagram} className="w-full" size="lg">
                  <Share2 className="h-5 w-5 mr-2" />
                  Dela till Instagram
                </Button>
                <Button onClick={handleDownload} variant="outline" className="w-full" size="lg">
                  <Download className="h-5 w-5 mr-2" />
                  Ladda ner bild
                </Button>
                <Button onClick={handleDownloadAll} variant="ghost" className="w-full">
                  <FolderDown className="h-5 w-5 mr-2" />
                  Ladda ner alla bilder
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
                  <Label htmlFor="prizeValue">Prisvärde</Label>
                  <Input
                    id="prizeValue"
                    value={content.prizeValue}
                    onChange={(e) => setContent({ ...content, prizeValue: e.target.value })}
                    placeholder="1000 KR"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prizeDescription">Pristyp</Label>
                  <Input
                    id="prizeDescription"
                    value={content.prizeDescription}
                    onChange={(e) => setContent({ ...content, prizeDescription: e.target.value })}
                    placeholder="PRESENTKORT"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sponsor">Sponsor</Label>
                <Input
                  id="sponsor"
                  value={content.sponsor}
                  onChange={(e) => setContent({ ...content, sponsor: e.target.value })}
                  placeholder="GYMGROSSISTEN"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="commentQuestion">Kommentarsfråga</Label>
                <Textarea
                  id="commentQuestion"
                  value={content.commentQuestion}
                  onChange={(e) => setContent({ ...content, commentQuestion: e.target.value })}
                  placeholder="Vad är ett måste i din träning?"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tagCount">Antal att tagga</Label>
                  <Input
                    id="tagCount"
                    value={content.tagCount}
                    onChange={(e) => setContent({ ...content, tagCount: e.target.value })}
                    placeholder="2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagramHandle">Instagram-handle</Label>
                  <Input
                    id="instagramHandle"
                    value={content.instagramHandle}
                    onChange={(e) => setContent({ ...content, instagramHandle: e.target.value })}
                    placeholder="@gymdagbokense"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  value={content.deadline}
                  onChange={(e) => setContent({ ...content, deadline: e.target.value })}
                  placeholder="19 december kl. 12:00"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
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
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Klicka på "Ladda ner bild" för att spara i full upplösning
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hidden canvas for download generation */}
      <canvas ref={downloadCanvasRef} className="hidden" />

      {/* Competition text reference */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Tävlingstext (för kopiering)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-x-auto">
{`🔥 TÄVLA & VINN 🔥
Redo att ta din träning till nästa nivå? 💪

Vi lottar ut ett ${content.prizeDescription.toLowerCase()} från ${content.sponsor} värt ${content.prizeValue.toLowerCase()} 🎁
Perfekt för protein, kreatin, träningskläder eller annat du behöver för dina mål.

👇 SÅ DELTAR DU 👇
1️⃣ Följ ${content.instagramHandle}
2️⃣ Gilla detta inlägg ❤️
3️⃣ Kommentera: ${content.commentQuestion} + tagga ${content.tagCount} träningskompisar

💥 EXTRA CHANS ATT VINNA 💥
➡️ Registrera dig på gymdagboken.se
➡️ Genomför ett styrkepass i appen
➡️ Dela passet i din story och tagga ${content.instagramHandle}

📅 Tävlingen avslutas ${content.deadline}
🏆 Vinnaren lottas och kontaktas via DM

Lycka till! 🚀
#gymdagboken #tävling #giveaway #${content.sponsor.toLowerCase().replace(/\s+/g, '')} #träning #fitness`}
          </pre>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => {
              navigator.clipboard.writeText(`🔥 TÄVLA & VINN 🔥
Redo att ta din träning till nästa nivå? 💪

Vi lottar ut ett ${content.prizeDescription.toLowerCase()} från ${content.sponsor} värt ${content.prizeValue.toLowerCase()} 🎁
Perfekt för protein, kreatin, träningskläder eller annat du behöver för dina mål.

👇 SÅ DELTAR DU 👇
1️⃣ Följ ${content.instagramHandle}
2️⃣ Gilla detta inlägg ❤️
3️⃣ Kommentera: ${content.commentQuestion} + tagga ${content.tagCount} träningskompisar

💥 EXTRA CHANS ATT VINNA 💥
➡️ Registrera dig på gymdagboken.se
➡️ Genomför ett styrkepass i appen
➡️ Dela passet i din story och tagga ${content.instagramHandle}

📅 Tävlingen avslutas ${content.deadline}
🏆 Vinnaren lottas och kontaktas via DM

Lycka till! 🚀
#gymdagboken #tävling #giveaway #${content.sponsor.toLowerCase().replace(/\s+/g, '')} #träning #fitness`);
              toast.success("Text kopierad!");
            }}
          >
            Kopiera text
          </Button>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="marketing">
          <MarketingImageGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminInstagramImages;