import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Smartphone, BarChart3, Trophy, Users, Zap, Map as MapIcon, Target, Dumbbell, Share2, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";

// Import AI-generated marketing images
import heroFitnessApp from "@/assets/marketing/hero-fitness-app.jpg";
import achievementCelebration from "@/assets/marketing/achievement-celebration.jpg";
import aiWorkoutPlanning from "@/assets/marketing/ai-workout-planning.jpg";
import socialCommunityStory from "@/assets/marketing/social-community-story.jpg";
import gpsTrackingRoute from "@/assets/marketing/gps-tracking-route.jpg";
import statisticsDashboard from "@/assets/marketing/statistics-dashboard.jpg";

type MarketingTemplate = 
  | "appOverview" 
  | "aiFeature" 
  | "statsShowcase" 
  | "gpsTracking" 
  | "socialFeatures" 
  | "xpSystem"
  | "workoutLogging";

interface TemplateInfo {
  id: MarketingTemplate;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  backgroundImage?: string;
}

const TEMPLATES: TemplateInfo[] = [
  { id: "appOverview", name: "App-översikt", description: "Allmän presentation av appen", icon: Smartphone, backgroundImage: heroFitnessApp },
  { id: "aiFeature", name: "AI-funktioner", description: "Visa AI-genererade träningsprogram", icon: Zap, backgroundImage: aiWorkoutPlanning },
  { id: "workoutLogging", name: "Träningsloggning", description: "Visa hur man loggar pass", icon: Dumbbell, backgroundImage: heroFitnessApp },
  { id: "statsShowcase", name: "Statistik", description: "Visa statistik och framsteg", icon: BarChart3, backgroundImage: statisticsDashboard },
  { id: "gpsTracking", name: "GPS-spårning", description: "Visa kart- och GPS-funktioner", icon: MapIcon, backgroundImage: gpsTrackingRoute },
  { id: "socialFeatures", name: "Sociala funktioner", description: "Utmaningar och vänner", icon: Users, backgroundImage: socialCommunityStory },
  { id: "xpSystem", name: "XP & Nivåer", description: "Gamification och achievements", icon: Trophy, backgroundImage: achievementCelebration },
];

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
  green: "#22c55e",
  blue: "#3b82f6",
};

interface AIGeneratedContent {
  headline: string;
  subheadline: string;
  caption: string;
  hashtags: string;
}

export default function MarketingImageGenerator() {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplate>("appOverview");
  const [imageFormat, setImageFormat] = useState<"post" | "story">("post");
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);
  const [backgroundImages, setBackgroundImages] = useState(() => new Map<string, HTMLImageElement>());
  const [useAIBackground, setUseAIBackground] = useState(true);
  
  // AI content generation
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiContent, setAiContent] = useState<AIGeneratedContent | null>(null);
  const [customCaption, setCustomCaption] = useState("");
  const [isRegeneratingBackground, setIsRegeneratingBackground] = useState(false);

  // Load logo
  useEffect(() => {
    const img = document.createElement('img') as HTMLImageElement;
    img.crossOrigin = "anonymous";
    img.onload = () => {
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
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0;
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const processedImg = document.createElement('img') as HTMLImageElement;
      processedImg.onload = () => setLogoImage(processedImg);
      processedImg.src = canvas.toDataURL("image/png");
    };
    img.src = "/pwa-512x512.png";
  }, []);

  // Load background images
  useEffect(() => {
    const loadBackgroundImages = async () => {
      const imageMap: Map<string, HTMLImageElement> = new globalThis.Map();
      
      for (const template of TEMPLATES) {
        if (template.backgroundImage) {
          const img = document.createElement('img') as HTMLImageElement;
          img.crossOrigin = "anonymous";
          await new Promise<void>((resolve) => {
            img.onload = () => {
              imageMap.set(template.id, img);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = template.backgroundImage;
          });
        }
      }
      
      setBackgroundImages(imageMap);
    };
    
    loadBackgroundImages();
  }, []);

  const generateAIContent = async () => {
    setIsGeneratingAI(true);
    
    const templateInfo = TEMPLATES.find(t => t.id === selectedTemplate);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-marketing-content', {
        body: {
          template: selectedTemplate,
          templateName: templateInfo?.name,
          templateDescription: templateInfo?.description,
          format: imageFormat
        }
      });

      if (error) throw error;

      setAiContent(data);
      setCustomCaption(data.caption + "\n\n" + data.hashtags);
      toast.success("AI-innehåll genererat!");
    } catch (error) {
      console.error("Error generating AI content:", error);
      toast.error("Kunde inte generera AI-innehåll");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const regenerateBackground = async () => {
    setIsRegeneratingBackground(true);
    const templateInfo = TEMPLATES.find(t => t.id === selectedTemplate);
    
    const prompts: Record<MarketingTemplate, string> = {
      appOverview: "Modern fitness app hero image with athletic person using smartphone, dynamic gym environment, vibrant orange and dark tones, professional photography style, 16:9 aspect ratio, ultra high resolution",
      aiFeature: "Futuristic AI workout planning visualization, holographic fitness data floating in space, neural network patterns with exercise icons, dark tech aesthetic with orange accents, square composition, ultra high resolution",
      workoutLogging: "Athletic person logging workout on phone in modern gym, dramatic lighting, fitness technology concept, dark moody atmosphere with orange highlights, 16:9 aspect ratio, ultra high resolution",
      statsShowcase: "Stunning fitness statistics dashboard visualization with colorful 3D charts, progress graphs floating in dark space, data visualization art, glowing metrics and numbers, modern tech aesthetic, square composition, ultra high resolution",
      gpsTracking: "Dynamic GPS running route map visualization with glowing neon path tracking on dark urban cityscape, runner's perspective with speed metrics overlay, modern fitness tech aesthetic, dramatic lighting, 16:9 aspect ratio, ultra high resolution",
      socialFeatures: "Group of friends celebrating fitness achievement together, high-five moment, community spirit, energetic atmosphere, social fitness concept, vertical portrait composition, ultra high resolution",
      xpSystem: "Epic achievement celebration with golden trophy and confetti explosion, gamification visual with XP numbers floating, victory moment, dramatic lighting on dark background, square composition, ultra high resolution"
    };
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-marketing-content', {
        body: {
          regenerateBackground: true,
          template: selectedTemplate,
          templateName: templateInfo?.name,
          prompt: prompts[selectedTemplate]
        }
      });

      if (error) throw error;
      
      if (data?.imageUrl) {
        // Load the new image
        const img = document.createElement('img') as HTMLImageElement;
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setBackgroundImages(prev => {
            const newMap = new globalThis.Map(prev);
            newMap.set(selectedTemplate, img);
            return newMap;
          });
          toast.success("Ny bakgrundsbild genererad!");
        };
        img.onerror = () => {
          toast.error("Kunde inte ladda den genererade bilden");
        };
        img.src = data.imageUrl;
      } else {
        toast.error("Ingen bild returnerades från AI");
      }
    } catch (error) {
      console.error("Error regenerating background:", error);
      toast.error("Kunde inte generera ny bakgrund");
    } finally {
      setIsRegeneratingBackground(false);
    }
  };

  const drawLogo = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    if (logoImage) {
      ctx.drawImage(logoImage, x - size / 2, y - size / 2, size, size);
    }
  };

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, template: MarketingTemplate) => {
    const bgImage = backgroundImages.get(template);
    
    if (useAIBackground && bgImage) {
      // Draw the AI-generated background image
      const imgAspect = bgImage.width / bgImage.height;
      const canvasAspect = width / height;
      
      let drawWidth, drawHeight, drawX, drawY;
      
      if (imgAspect > canvasAspect) {
        drawHeight = height;
        drawWidth = height * imgAspect;
        drawX = (width - drawWidth) / 2;
        drawY = 0;
      } else {
        drawWidth = width;
        drawHeight = width / imgAspect;
        drawX = 0;
        drawY = (height - drawHeight) / 2;
      }
      
      ctx.drawImage(bgImage, drawX, drawY, drawWidth, drawHeight);
      
      // Add dark overlay for text readability
      const overlay = ctx.createLinearGradient(0, 0, 0, height);
      overlay.addColorStop(0, "rgba(0, 0, 0, 0.7)");
      overlay.addColorStop(0.3, "rgba(0, 0, 0, 0.4)");
      overlay.addColorStop(0.7, "rgba(0, 0, 0, 0.4)");
      overlay.addColorStop(1, "rgba(0, 0, 0, 0.8)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Fallback to gradient background
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
    }
  };

  const drawTextWithShadow = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number) => {
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(text, x, y);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  const drawTemplateContent = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story", template: MarketingTemplate) => {
    const centerY = height / 2 + (format === "post" ? 0 : 50);
    
    // Use AI-generated content if available
    const headline = aiContent?.headline || getDefaultHeadline(template);
    const subheadline = aiContent?.subheadline || getDefaultSubheadline(template);
    
    // Main title with shadow for readability
    ctx.font = `bold ${format === "post" ? 72 : 80}px 'Oswald', sans-serif`;
    ctx.textAlign = "center";
    const titleGradient = ctx.createLinearGradient(0, centerY - 200, 0, centerY - 100);
    titleGradient.addColorStop(0, COLORS.orange);
    titleGradient.addColorStop(1, COLORS.orangeLight);
    ctx.fillStyle = titleGradient;
    
    // Split headline into lines
    const headlineLines = headline.split('\n');
    headlineLines.forEach((line, i) => {
      drawTextWithShadow(ctx, line.toUpperCase(), width / 2, centerY - 160 + i * 80);
    });
    
    // Subtitle
    ctx.font = "32px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    drawTextWithShadow(ctx, subheadline, width / 2, centerY + 20);
    
    // Feature-specific icons/elements
    const features = getFeatureIcons(template);
    const startY = centerY + 100;
    const spacing = format === "post" ? 70 : 90;
    
    features.forEach((feature, i) => {
      ctx.font = "40px sans-serif";
      drawTextWithShadow(ctx, feature.emoji, width / 2 - 150, startY + i * spacing);
      
      ctx.font = "28px 'Oswald', sans-serif";
      ctx.fillStyle = COLORS.white;
      ctx.textAlign = "left";
      drawTextWithShadow(ctx, feature.text, width / 2 - 100, startY + i * spacing);
      ctx.textAlign = "center";
    });
    
    // CTA Button
    ctx.fillStyle = COLORS.orange;
    ctx.beginPath();
    ctx.roundRect(width/2 - 200, height - 180, 400, 60, 30);
    ctx.fill();
    
    ctx.font = "bold 28px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText("GYMDAGBOKEN.SE", width / 2, height - 140);
  };

  const getDefaultHeadline = (template: MarketingTemplate): string => {
    const headlines: Record<MarketingTemplate, string> = {
      appOverview: "DIN DIGITALA\nTRÄNINGSDAGBOK",
      aiFeature: "AI-GENERERADE\nTRÄNINGSPROGRAM",
      workoutLogging: "LOGGA VARJE\nTRÄNINGSPASS",
      statsShowcase: "SE DINA\nFRAMSTEG",
      gpsTracking: "GPS-SPÅRNING\nFÖR KONDITION",
      socialFeatures: "UTMANA\nDINA VÄNNER",
      xpSystem: "SAMLA XP\n& NIVÅA UPP"
    };
    return headlines[template];
  };

  const getDefaultSubheadline = (template: MarketingTemplate): string => {
    const subheadlines: Record<MarketingTemplate, string> = {
      appOverview: "Logga • Analysera • Förbättras",
      aiFeature: "Personligt anpassade program baserat på dina mål",
      workoutLogging: "Detaljerad loggning per set",
      statsShowcase: "Veckovis träningsöversikt",
      gpsTracking: "Spåra dina löprundor och cykelturer",
      socialFeatures: "Tävla om vem som tränar mest!",
      xpSystem: "Gamification för gains!"
    };
    return subheadlines[template];
  };

  const getFeatureIcons = (template: MarketingTemplate): { emoji: string; text: string }[] => {
    const features: Record<MarketingTemplate, { emoji: string; text: string }[]> = {
      appOverview: [
        { emoji: "🤖", text: "AI-träningsprogram" },
        { emoji: "📊", text: "Detaljerad statistik" },
        { emoji: "🏆", text: "Utmaningar & XP" },
        { emoji: "🗺️", text: "GPS-spårning" },
      ],
      aiFeature: [
        { emoji: "✅", text: "Välj antal dagar per vecka" },
        { emoji: "✅", text: "Anpassa efter din nivå" },
        { emoji: "✅", text: "Finjustera med AI-chat" },
        { emoji: "✅", text: "Spara och modifiera" },
      ],
      workoutLogging: [
        { emoji: "🏋️", text: "8 övningar" },
        { emoji: "🔁", text: "24 set" },
        { emoji: "⚖️", text: "4.5t total vikt" },
        { emoji: "⭐", text: "+50 XP" },
      ],
      statsShowcase: [
        { emoji: "📈", text: "Progressionsgrafer" },
        { emoji: "🎯", text: "Målspårning" },
        { emoji: "📅", text: "Veckoöversikt" },
        { emoji: "🏆", text: "Personliga rekord" },
      ],
      gpsTracking: [
        { emoji: "🏃", text: "Löpning" },
        { emoji: "🚴", text: "Cykling" },
        { emoji: "🚶", text: "Promenader" },
        { emoji: "📍", text: "Rutt på karta" },
      ],
      socialFeatures: [
        { emoji: "🏋️", text: "Flest träningspass" },
        { emoji: "⏱️", text: "Längst träningstid" },
        { emoji: "💪", text: "Flest set" },
        { emoji: "🏃", text: "Mest kondition" },
      ],
      xpSystem: [
        { emoji: "🏋️", text: "Styrkepass: +50 XP" },
        { emoji: "🏃", text: "Kondition: +2 XP/min" },
        { emoji: "🏆", text: "Achievements: +100 XP" },
        { emoji: "⚡", text: "Utmaningar: +150 XP" },
      ],
    };
    return features[template];
  };

  const generateImage = useCallback(async (
    canvas: HTMLCanvasElement,
    template: MarketingTemplate, 
    format: "post" | "story"
  ): Promise<Blob | null> => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const width = 1080;
    const height = format === "post" ? 1080 : 1920;
    canvas.width = width;
    canvas.height = height;

    drawBackground(ctx, width, height, template);

    // Logo at top
    const logoSize = format === "post" ? 120 : 150;
    const logoY = format === "post" ? 100 : 120;
    drawLogo(ctx, width / 2, logoY, logoSize);

    // Draw template content
    drawTemplateContent(ctx, width, height, format, template);

    // Branding at bottom
    ctx.font = "bold 32px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.textAlign = "center";
    drawTextWithShadow(ctx, "@gymdagbokense", width / 2, height - 40);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
    });
  }, [logoImage, backgroundImages, useAIBackground, aiContent]);

  // Update preview
  useEffect(() => {
    if (previewCanvasRef.current && logoImage) {
      generateImage(previewCanvasRef.current, selectedTemplate, imageFormat);
    }
  }, [selectedTemplate, imageFormat, logoImage, generateImage, backgroundImages, useAIBackground, aiContent]);

  const handleDownload = async () => {
    if (!downloadCanvasRef.current) return;
    
    const blob = await generateImage(downloadCanvasRef.current, selectedTemplate, imageFormat);
    if (!blob) {
      toast.error("Kunde inte generera bild");
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gymdagboken-${selectedTemplate}-${imageFormat}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Bild nedladdad!");
  };

  const handleDownloadAll = async () => {
    if (!downloadCanvasRef.current) return;
    
    toast.info("Genererar alla bilder...");
    
    for (const template of TEMPLATES) {
      for (const format of ["post", "story"] as const) {
        const blob = await generateImage(downloadCanvasRef.current, template.id, format);
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `gymdagboken-${template.id}-${format}.png`;
          a.click();
          URL.revokeObjectURL(url);
          await new Promise(r => setTimeout(r, 300));
        }
      }
    }
    
    toast.success("Alla bilder nedladdade!");
  };

  const handleShareToInstagram = async () => {
    if (!downloadCanvasRef.current) return;
    
    const blob = await generateImage(downloadCanvasRef.current, selectedTemplate, imageFormat);
    if (!blob) {
      toast.error("Kunde inte generera bild");
      return;
    }

    const file = new File([blob], `gymdagboken-${selectedTemplate}-${imageFormat}.png`, { type: "image/png" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Gymdagboken Instagram",
          text: customCaption || "Dela till Instagram",
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

  const currentTemplate = TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Välj mall
              </CardTitle>
              <CardDescription>
                Marknadsföringsbilder för Instagram
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template selection */}
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    className="h-auto py-3 flex-col items-start text-left"
                    onClick={() => {
                      setSelectedTemplate(template.id);
                      setAiContent(null);
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <template.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{template.name}</span>
                      {template.backgroundImage && (
                        <span className="ml-auto text-xs bg-primary/20 px-1.5 py-0.5 rounded">AI</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">{template.description}</span>
                  </Button>
                ))}
              </div>

              {/* AI Background Toggle */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Använd AI-bakgrund</span>
                </div>
                <Button
                  variant={useAIBackground ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseAIBackground(!useAIBackground)}
                >
                  {useAIBackground ? "På" : "Av"}
                </Button>
              </div>

              {/* Regenerate Background Button */}
              {useAIBackground && (
                <Button
                  onClick={regenerateBackground}
                  disabled={isRegeneratingBackground}
                  variant="outline"
                  className="w-full"
                >
                  {isRegeneratingBackground ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Genererar ny bakgrund...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generera ny AI-bakgrund för {currentTemplate?.name}
                    </>
                  )}
                </Button>
              )}

              {/* Format selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Format</label>
                <Tabs value={imageFormat} onValueChange={(v) => setImageFormat(v as "post" | "story")}>
                  <TabsList className="w-full">
                    <TabsTrigger value="post" className="flex-1">Post (1080x1080)</TabsTrigger>
                    <TabsTrigger value="story" className="flex-1">Story (1080x1920)</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Download and share buttons */}
              <div className="space-y-2">
                <Button onClick={handleShareToInstagram} className="w-full" size="lg">
                  <Share2 className="h-5 w-5 mr-2" />
                  Dela till Instagram
                </Button>
                <Button onClick={handleDownload} variant="outline" className="w-full">
                  <Download className="h-5 w-5 mr-2" />
                  Ladda ner bild
                </Button>
                <Button onClick={handleDownloadAll} variant="ghost" className="w-full">
                  Ladda ner alla bilder
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Content Generator */}
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-genererat innehåll
              </CardTitle>
              <CardDescription>
                Låt AI skapa marknadsföringstext för {currentTemplate?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={generateAIContent} 
                disabled={isGeneratingAI}
                className="w-full"
                variant="outline"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Genererar...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generera AI-förslag
                  </>
                )}
              </Button>
              
              {aiContent && (
                <div className="space-y-3 p-3 bg-muted rounded-lg">
                  <div>
                    <label className="text-xs text-muted-foreground">Rubrik</label>
                    <p className="font-bold text-primary">{aiContent.headline}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Underrubrik</label>
                    <p className="text-sm">{aiContent.subheadline}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Instagram-caption</label>
                <Textarea
                  value={customCaption}
                  onChange={(e) => setCustomCaption(e.target.value)}
                  placeholder="Skriv din caption här eller generera med AI..."
                  rows={4}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(customCaption);
                    toast.success("Caption kopierad!");
                  }}
                  disabled={!customCaption}
                >
                  Kopiera caption
                </Button>
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
          </CardContent>
        </Card>
      </div>

      {/* Hidden canvas */}
      <canvas ref={downloadCanvasRef} className="hidden" />
    </div>
  );
}
