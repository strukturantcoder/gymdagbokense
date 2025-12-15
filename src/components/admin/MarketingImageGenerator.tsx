import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Smartphone, BarChart3, Trophy, Users, Zap, Map, Target, Dumbbell, Share2 } from "lucide-react";
import { toast } from "sonner";

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
}

const TEMPLATES: TemplateInfo[] = [
  { id: "appOverview", name: "App-översikt", description: "Allmän presentation av appen", icon: Smartphone },
  { id: "aiFeature", name: "AI-funktioner", description: "Visa AI-genererade träningsprogram", icon: Zap },
  { id: "workoutLogging", name: "Träningsloggning", description: "Visa hur man loggar pass", icon: Dumbbell },
  { id: "statsShowcase", name: "Statistik", description: "Visa statistik och framsteg", icon: BarChart3 },
  { id: "gpsTracking", name: "GPS-spårning", description: "Visa kart- och GPS-funktioner", icon: Map },
  { id: "socialFeatures", name: "Sociala funktioner", description: "Utmaningar och vänner", icon: Users },
  { id: "xpSystem", name: "XP & Nivåer", description: "Gamification och achievements", icon: Trophy },
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

export default function MarketingImageGenerator() {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingTemplate>("appOverview");
  const [imageFormat, setImageFormat] = useState<"post" | "story">("post");
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

  // Load logo
  useEffect(() => {
    const img = new window.Image();
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

  const drawBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
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
  };

  const drawPhoneMockup = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    // Phone frame
    ctx.fillStyle = "#1f1f1f";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 30);
    ctx.fill();
    
    // Screen
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.roundRect(x + 8, y + 8, width - 16, height - 16, 22);
    ctx.fill();
    
    // Notch
    ctx.fillStyle = "#1f1f1f";
    ctx.beginPath();
    ctx.roundRect(x + width/2 - 50, y + 8, 100, 25, 15);
    ctx.fill();
  };

  const drawFeatureCard = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, emoji: string, title: string, subtitle: string) => {
    // Card background
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 16);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = "rgba(249, 115, 22, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Emoji
    ctx.font = "40px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(emoji, x + width/2, y + 50);
    
    // Title
    ctx.font = "bold 24px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText(title, x + width/2, y + 90);
    
    // Subtitle
    ctx.font = "16px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.fillText(subtitle, x + width/2, y + 115);
  };

  const drawAppOverview = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 0 : 50);
    
    // Main title
    ctx.font = `bold ${format === "post" ? 72 : 80}px 'Oswald', sans-serif`;
    ctx.textAlign = "center";
    const titleGradient = ctx.createLinearGradient(0, centerY - 200, 0, centerY - 100);
    titleGradient.addColorStop(0, COLORS.orange);
    titleGradient.addColorStop(1, COLORS.orangeLight);
    ctx.fillStyle = titleGradient;
    ctx.fillText("DIN DIGITALA", width / 2, centerY - 160);
    ctx.fillText("TRÄNINGSDAGBOK", width / 2, centerY - 80);
    
    // Subtitle
    ctx.font = "32px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText("Logga • Analysera • Förbättras", width / 2, centerY - 20);
    
    // Feature highlights
    const features = [
      { emoji: "🤖", text: "AI-träningsprogram" },
      { emoji: "📊", text: "Detaljerad statistik" },
      { emoji: "🏆", text: "Utmaningar & XP" },
      { emoji: "🗺️", text: "GPS-spårning" },
    ];
    
    const startY = centerY + 60;
    const spacing = format === "post" ? 70 : 90;
    
    features.forEach((feature, i) => {
      ctx.font = "40px sans-serif";
      ctx.fillText(feature.emoji, width / 2 - 150, startY + i * spacing);
      
      ctx.font = "28px 'Oswald', sans-serif";
      ctx.fillStyle = COLORS.white;
      ctx.textAlign = "left";
      ctx.fillText(feature.text, width / 2 - 100, startY + i * spacing);
      ctx.textAlign = "center";
    });
    
    // CTA
    ctx.fillStyle = COLORS.orange;
    ctx.beginPath();
    ctx.roundRect(width/2 - 200, height - 180, 400, 60, 30);
    ctx.fill();
    
    ctx.font = "bold 28px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText("GYMDAGBOKEN.SE", width / 2, height - 140);
  };

  const drawAIFeature = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 0 : 80);
    
    // AI icon
    ctx.font = "100px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🤖", width / 2, centerY - 250);
    
    // Title
    ctx.font = `bold ${format === "post" ? 64 : 72}px 'Oswald', sans-serif`;
    const gradient = ctx.createLinearGradient(0, centerY - 200, 0, centerY - 100);
    gradient.addColorStop(0, COLORS.orange);
    gradient.addColorStop(1, COLORS.orangeLight);
    ctx.fillStyle = gradient;
    ctx.fillText("AI-GENERERADE", width / 2, centerY - 150);
    ctx.fillText("TRÄNINGSPROGRAM", width / 2, centerY - 80);
    
    // Description
    ctx.font = "28px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText("Personligt anpassade program", width / 2, centerY - 20);
    ctx.fillText("baserat på dina mål", width / 2, centerY + 20);
    
    // Example features
    const items = [
      "✅ Välj antal dagar per vecka",
      "✅ Anpassa efter din nivå",
      "✅ Finjustera med AI-chat",
      "✅ Spara och modifiera",
    ];
    
    const startY = centerY + 100;
    ctx.font = "26px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "left";
    items.forEach((item, i) => {
      ctx.fillText(item, width / 2 - 180, startY + i * 55);
    });
    ctx.textAlign = "center";
  };

  const drawWorkoutLogging = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 0 : 80);
    
    // Icon
    ctx.font = "100px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("💪", width / 2, centerY - 250);
    
    // Title
    ctx.font = `bold ${format === "post" ? 64 : 72}px 'Oswald', sans-serif`;
    const gradient = ctx.createLinearGradient(0, centerY - 200, 0, centerY - 100);
    gradient.addColorStop(0, COLORS.orange);
    gradient.addColorStop(1, COLORS.orangeLight);
    ctx.fillStyle = gradient;
    ctx.fillText("LOGGA VARJE", width / 2, centerY - 150);
    ctx.fillText("TRÄNINGSPASS", width / 2, centerY - 80);
    
    // Stats example
    ctx.font = "28px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText("Detaljerad loggning per set", width / 2, centerY - 20);
    
    // Mock workout stats
    const stats = [
      { label: "ÖVNINGAR", value: "8", emoji: "🏋️" },
      { label: "SET", value: "24", emoji: "🔁" },
      { label: "TOTAL VIKT", value: "4.5t", emoji: "⚖️" },
      { label: "XP", value: "+50", emoji: "⭐" },
    ];
    
    const cardWidth = 200;
    const cardHeight = 100;
    const gap = 20;
    const startX = (width - (cardWidth * 2 + gap)) / 2;
    const startY = centerY + 40;
    
    stats.forEach((stat, i) => {
      const x = startX + (i % 2) * (cardWidth + gap);
      const y = startY + Math.floor(i / 2) * (cardHeight + gap);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.roundRect(x, y, cardWidth, cardHeight, 12);
      ctx.fill();
      
      ctx.font = "30px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(stat.emoji, x + 40, y + 55);
      
      ctx.font = "bold 36px 'Oswald', sans-serif";
      ctx.fillStyle = COLORS.orange;
      ctx.fillText(stat.value, x + 120, y + 45);
      
      ctx.font = "16px 'Oswald', sans-serif";
      ctx.fillStyle = COLORS.whiteDim;
      ctx.fillText(stat.label, x + 120, y + 70);
    });
  };

  const drawStatsShowcase = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 0 : 80);
    
    // Icon
    ctx.font = "100px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("📊", width / 2, centerY - 280);
    
    // Title
    ctx.font = `bold ${format === "post" ? 64 : 72}px 'Oswald', sans-serif`;
    const gradient = ctx.createLinearGradient(0, centerY - 200, 0, centerY - 100);
    gradient.addColorStop(0, COLORS.orange);
    gradient.addColorStop(1, COLORS.orangeLight);
    ctx.fillStyle = gradient;
    ctx.fillText("SE DINA", width / 2, centerY - 180);
    ctx.fillText("FRAMSTEG", width / 2, centerY - 110);
    
    // Mock chart bars
    const barWidth = 60;
    const maxBarHeight = 200;
    const barData = [0.4, 0.6, 0.5, 0.8, 0.7, 0.9, 1.0];
    const days = ["M", "T", "O", "T", "F", "L", "S"];
    const startX = (width - (barWidth * 7 + 20 * 6)) / 2;
    const barY = centerY + 150;
    
    barData.forEach((value, i) => {
      const x = startX + i * (barWidth + 20);
      const barHeight = value * maxBarHeight;
      
      // Bar
      const barGradient = ctx.createLinearGradient(x, barY - barHeight, x, barY);
      barGradient.addColorStop(0, COLORS.orange);
      barGradient.addColorStop(1, COLORS.orangeDark);
      ctx.fillStyle = barGradient;
      ctx.beginPath();
      ctx.roundRect(x, barY - barHeight, barWidth, barHeight, 8);
      ctx.fill();
      
      // Day label
      ctx.font = "20px 'Oswald', sans-serif";
      ctx.fillStyle = COLORS.whiteDim;
      ctx.textAlign = "center";
      ctx.fillText(days[i], x + barWidth / 2, barY + 30);
    });
    
    // Description
    ctx.font = "26px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText("Veckovis träningsöversikt", width / 2, centerY - 40);
  };

  const drawGPSTracking = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 0 : 80);
    
    // Icon
    ctx.font = "100px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🗺️", width / 2, centerY - 280);
    
    // Title
    ctx.font = `bold ${format === "post" ? 64 : 72}px 'Oswald', sans-serif`;
    const gradient = ctx.createLinearGradient(0, centerY - 200, 0, centerY - 100);
    gradient.addColorStop(0, COLORS.orange);
    gradient.addColorStop(1, COLORS.orangeLight);
    ctx.fillStyle = gradient;
    ctx.fillText("GPS-SPÅRNING", width / 2, centerY - 180);
    ctx.fillText("FÖR KONDITION", width / 2, centerY - 110);
    
    // Description
    ctx.font = "28px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText("Spåra dina löprundor och cykelturer", width / 2, centerY - 40);
    
    // Stats cards
    const stats = [
      { label: "DISTANS", value: "5.2 km", color: COLORS.orange },
      { label: "TEMPO", value: "5:24 /km", color: COLORS.green },
      { label: "HASTIGHET", value: "11.1 km/h", color: COLORS.blue },
    ];
    
    const cardWidth = 280;
    const cardHeight = 80;
    const startY = centerY + 20;
    
    stats.forEach((stat, i) => {
      const y = startY + i * (cardHeight + 20);
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.roundRect(width/2 - cardWidth/2, y, cardWidth, cardHeight, 12);
      ctx.fill();
      
      ctx.font = "18px 'Oswald', sans-serif";
      ctx.fillStyle = COLORS.whiteDim;
      ctx.textAlign = "left";
      ctx.fillText(stat.label, width/2 - cardWidth/2 + 20, y + 35);
      
      ctx.font = "bold 32px 'Oswald', sans-serif";
      ctx.fillStyle = stat.color;
      ctx.textAlign = "right";
      ctx.fillText(stat.value, width/2 + cardWidth/2 - 20, y + 55);
    });
    ctx.textAlign = "center";
  };

  const drawSocialFeatures = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 0 : 80);
    
    // Icons
    ctx.font = "80px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("👥", width / 2 - 60, centerY - 260);
    ctx.fillText("🏆", width / 2 + 60, centerY - 260);
    
    // Title
    ctx.font = `bold ${format === "post" ? 64 : 72}px 'Oswald', sans-serif`;
    const gradient = ctx.createLinearGradient(0, centerY - 200, 0, centerY - 100);
    gradient.addColorStop(0, COLORS.orange);
    gradient.addColorStop(1, COLORS.orangeLight);
    ctx.fillStyle = gradient;
    ctx.fillText("UTMANA", width / 2, centerY - 160);
    ctx.fillText("DINA VÄNNER", width / 2, centerY - 90);
    
    // Description
    ctx.font = "28px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteMuted;
    ctx.fillText("Tävla om vem som tränar mest!", width / 2, centerY - 20);
    
    // Challenge types
    const challenges = [
      "🏋️ Flest träningspass",
      "⏱️ Längst träningstid",
      "💪 Flest set",
      "🏃 Mest kondition",
    ];
    
    const startY = centerY + 60;
    ctx.font = "28px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    challenges.forEach((challenge, i) => {
      ctx.fillText(challenge, width / 2, startY + i * 60);
    });
  };

  const drawXPSystem = (ctx: CanvasRenderingContext2D, width: number, height: number, format: "post" | "story") => {
    const centerY = height / 2 + (format === "post" ? 0 : 80);
    
    // Icon
    ctx.font = "100px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⭐", width / 2, centerY - 280);
    
    // Title
    ctx.font = `bold ${format === "post" ? 64 : 72}px 'Oswald', sans-serif`;
    const gradient = ctx.createLinearGradient(0, centerY - 200, 0, centerY - 100);
    gradient.addColorStop(0, COLORS.orange);
    gradient.addColorStop(1, COLORS.orangeLight);
    ctx.fillStyle = gradient;
    ctx.fillText("SAMLA XP", width / 2, centerY - 180);
    ctx.fillText("& NIVÅA UPP", width / 2, centerY - 110);
    
    // XP bar mockup
    const barWidth = 500;
    const barHeight = 40;
    const barX = (width - barWidth) / 2;
    const barY = centerY - 30;
    
    // Background
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 20);
    ctx.fill();
    
    // Progress
    const progress = 0.7;
    const progressGradient = ctx.createLinearGradient(barX, barY, barX + barWidth * progress, barY);
    progressGradient.addColorStop(0, COLORS.orangeDark);
    progressGradient.addColorStop(1, COLORS.orange);
    ctx.fillStyle = progressGradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth * progress, barHeight, 20);
    ctx.fill();
    
    // Level text
    ctx.font = "bold 28px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText("NIVÅ 12", width / 2, barY + 28);
    
    // XP sources
    const sources = [
      { emoji: "🏋️", text: "Styrkepass: +50 XP" },
      { emoji: "🏃", text: "Kondition: +2 XP/min" },
      { emoji: "🏆", text: "Achievements: +100 XP" },
      { emoji: "⚡", text: "Utmaningar: +150 XP" },
    ];
    
    const startY = centerY + 60;
    ctx.font = "26px 'Oswald', sans-serif";
    sources.forEach((source, i) => {
      ctx.font = "36px sans-serif";
      ctx.fillText(source.emoji, width / 2 - 160, startY + i * 55);
      
      ctx.font = "24px 'Oswald', sans-serif";
      ctx.fillStyle = COLORS.white;
      ctx.textAlign = "left";
      ctx.fillText(source.text, width / 2 - 110, startY + i * 55);
      ctx.textAlign = "center";
    });
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

    drawBackground(ctx, width, height);

    // Logo at top
    const logoSize = format === "post" ? 120 : 150;
    const logoY = format === "post" ? 100 : 120;
    drawLogo(ctx, width / 2, logoY, logoSize);

    // Draw template content
    switch (template) {
      case "appOverview":
        drawAppOverview(ctx, width, height, format);
        break;
      case "aiFeature":
        drawAIFeature(ctx, width, height, format);
        break;
      case "workoutLogging":
        drawWorkoutLogging(ctx, width, height, format);
        break;
      case "statsShowcase":
        drawStatsShowcase(ctx, width, height, format);
        break;
      case "gpsTracking":
        drawGPSTracking(ctx, width, height, format);
        break;
      case "socialFeatures":
        drawSocialFeatures(ctx, width, height, format);
        break;
      case "xpSystem":
        drawXPSystem(ctx, width, height, format);
        break;
    }

    // Branding at bottom
    ctx.font = "bold 32px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.textAlign = "center";
    ctx.fillText("@gymdagbokense", width / 2, height - 40);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
    });
  }, [logoImage]);

  // Update preview
  useEffect(() => {
    if (previewCanvasRef.current && logoImage) {
      generateImage(previewCanvasRef.current, selectedTemplate, imageFormat);
    }
  }, [selectedTemplate, imageFormat, logoImage, generateImage]);

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
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <template.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{template.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1">{template.description}</span>
                  </Button>
                ))}
              </div>

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

          {/* Caption suggestions */}
          <Card>
            <CardHeader>
              <CardTitle>Föreslagna texter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedTemplate === "appOverview" && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="mb-2">🔥 Din träning förtjänar en egen dagbok!</p>
                  <p>Logga pass, följ framsteg och nå dina mål med Gymdagboken. Helt gratis! 💪</p>
                  <p className="mt-2 text-muted-foreground">#gymdagboken #träning #fitness #workout</p>
                </div>
              )}
              {selectedTemplate === "aiFeature" && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="mb-2">🤖 Låt AI skapa ditt perfekta träningsprogram!</p>
                  <p>Anpassa efter dina mål, erfarenhet och hur ofta du vill träna. Smart och enkelt! ⚡</p>
                  <p className="mt-2 text-muted-foreground">#ai #träningsprogram #personligtränare</p>
                </div>
              )}
              {selectedTemplate === "workoutLogging" && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="mb-2">💪 Varje rep räknas!</p>
                  <p>Logga set, vikt och reps för varje övning. Se dina framsteg över tid! 📈</p>
                  <p className="mt-2 text-muted-foreground">#träningslogg #styrketräning #gains</p>
                </div>
              )}
              {selectedTemplate === "statsShowcase" && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="mb-2">📊 Data driver framsteg!</p>
                  <p>Följ din träning med detaljerad statistik och se hur du utvecklas vecka för vecka! 🚀</p>
                  <p className="mt-2 text-muted-foreground">#statistik #framsteg #träningsdata</p>
                </div>
              )}
              {selectedTemplate === "gpsTracking" && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="mb-2">🗺️ Spåra dina löprundor!</p>
                  <p>GPS-tracking för löpning, cykling och promenader. Se rutten på kartan! 🏃‍♂️</p>
                  <p className="mt-2 text-muted-foreground">#löpning #gps #kondition #outdoor</p>
                </div>
              )}
              {selectedTemplate === "socialFeatures" && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="mb-2">🏆 Utmana dina träningskompisar!</p>
                  <p>Vem tränar mest denna vecka? Skapa utmaningar och tävla mot varandra! 💪</p>
                  <p className="mt-2 text-muted-foreground">#utmaning #träningskompisar #motivation</p>
                </div>
              )}
              {selectedTemplate === "xpSystem" && (
                <div className="bg-muted p-3 rounded-lg text-sm">
                  <p className="mb-2">⭐ Nivåa upp din träning!</p>
                  <p>Samla XP för varje pass och lås upp achievements. Gamification för gains! 🎮</p>
                  <p className="mt-2 text-muted-foreground">#xp #gamification #achievements #motivation</p>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const textEl = document.querySelector('.bg-muted.p-3.rounded-lg.text-sm');
                  if (textEl) {
                    navigator.clipboard.writeText(textEl.textContent || "");
                    toast.success("Text kopierad!");
                  }
                }}
              >
                Kopiera text
              </Button>
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
