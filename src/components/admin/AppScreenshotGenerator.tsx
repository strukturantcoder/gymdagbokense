import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Smartphone, BarChart3, Dumbbell, Users, Home, Map, Zap, Share2 } from "lucide-react";
import { toast } from "sonner";

type ScreenshotTemplate = 
  | "dashboard" 
  | "training" 
  | "statistics" 
  | "social"
  | "cardio"
  | "crossfit"
  | "workoutSession";

interface TemplateInfo {
  id: ScreenshotTemplate;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TEMPLATES: TemplateInfo[] = [
  { id: "dashboard", name: "Dashboard", description: "Översiktssidan med snabbåtgärder", icon: Home },
  { id: "training", name: "Träning", description: "Styrketräningsvy", icon: Dumbbell },
  { id: "workoutSession", name: "Träningspass", description: "Aktiv träningssession", icon: Zap },
  { id: "cardio", name: "Kondition", description: "Konditionsloggning", icon: Map },
  { id: "crossfit", name: "CrossFit", description: "WOD-generering", icon: Dumbbell },
  { id: "statistics", name: "Statistik", description: "Framsteg och grafer", icon: BarChart3 },
  { id: "social", name: "Socialt", description: "Vänner och utmaningar", icon: Users },
];

const COLORS = {
  background: "#0a0a0a",
  surface: "#1a1a1a",
  surfaceLight: "#2a2a2a",
  orange: "#f97316",
  orangeLight: "#fb923c",
  orangeDark: "#ea580c",
  white: "#FFFFFF",
  whiteMuted: "rgba(255, 255, 255, 0.8)",
  whiteDim: "rgba(255, 255, 255, 0.5)",
  green: "#22c55e",
  blue: "#3b82f6",
  red: "#ef4444",
};

export default function AppScreenshotGenerator() {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ScreenshotTemplate>("dashboard");
  const [imageFormat, setImageFormat] = useState<"post" | "story">("story");
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

  const drawPhoneFrame = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    // Phone outer frame
    ctx.fillStyle = "#1f1f1f";
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 40);
    ctx.fill();
    
    // Phone bezel
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Screen area
    const screenPadding = 12;
    ctx.fillStyle = COLORS.background;
    ctx.beginPath();
    ctx.roundRect(x + screenPadding, y + screenPadding, width - screenPadding * 2, height - screenPadding * 2, 30);
    ctx.fill();
    
    // Notch/Dynamic Island
    ctx.fillStyle = "#1f1f1f";
    ctx.beginPath();
    ctx.roundRect(x + width/2 - 60, y + screenPadding + 8, 120, 28, 15);
    ctx.fill();
    
    return {
      screenX: x + screenPadding + 8,
      screenY: y + screenPadding + 45,
      screenWidth: width - screenPadding * 2 - 16,
      screenHeight: height - screenPadding * 2 - 60,
    };
  };

  const drawStatusBar = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number) => {
    ctx.font = "bold 14px -apple-system, sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "left";
    ctx.fillText("09:41", x + 10, y + 15);
    
    ctx.textAlign = "right";
    ctx.fillText("100%", x + width - 10, y + 15);
    
    // Battery icon
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.roundRect(x + width - 60, y + 5, 22, 10, 2);
    ctx.fill();
    ctx.fillStyle = COLORS.green;
    ctx.beginPath();
    ctx.roundRect(x + width - 58, y + 7, 18, 6, 1);
    ctx.fill();
  };

  const drawCard = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    ctx.fillStyle = COLORS.surface;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 16);
    ctx.fill();
    
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const drawButton = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, text: string, primary = true) => {
    if (primary) {
      const gradient = ctx.createLinearGradient(x, y, x + width, y);
      gradient.addColorStop(0, COLORS.orange);
      gradient.addColorStop(1, COLORS.orangeDark);
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = COLORS.surfaceLight;
    }
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 12);
    ctx.fill();
    
    ctx.font = "bold 16px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.fillText(text, x + width/2, y + height/2 + 5);
  };

  const drawDashboard = (ctx: CanvasRenderingContext2D, screen: { screenX: number; screenY: number; screenWidth: number; screenHeight: number }) => {
    const { screenX: x, screenY: y, screenWidth: w } = screen;
    let yPos = y;
    
    // Header with logo
    ctx.font = "bold 28px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.textAlign = "center";
    ctx.fillText("GYMDAGBOKEN", x + w/2, yPos + 25);
    yPos += 50;
    
    // XP Progress card
    drawCard(ctx, x + 10, yPos, w - 20, 100);
    ctx.font = "bold 18px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "left";
    ctx.fillText("Nivå 12", x + 25, yPos + 30);
    ctx.font = "14px sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.fillText("2,450 / 3,000 XP", x + 25, yPos + 50);
    
    // XP bar
    ctx.fillStyle = COLORS.surfaceLight;
    ctx.beginPath();
    ctx.roundRect(x + 25, yPos + 65, w - 70, 20, 10);
    ctx.fill();
    
    const progress = 0.82;
    const gradient = ctx.createLinearGradient(x + 25, yPos + 65, x + 25 + (w - 70) * progress, yPos + 65);
    gradient.addColorStop(0, COLORS.orangeDark);
    gradient.addColorStop(1, COLORS.orange);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x + 25, yPos + 65, (w - 70) * progress, 20, 10);
    ctx.fill();
    yPos += 120;
    
    // Quick Actions card
    drawCard(ctx, x + 10, yPos, w - 20, 180);
    ctx.font = "bold 16px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "left";
    ctx.fillText("Snabbåtgärder", x + 25, yPos + 28);
    
    // Stats row
    const statsY = yPos + 45;
    const statWidth = (w - 60) / 3;
    
    [
      { emoji: "🔥", value: "5", label: "Streak" },
      { emoji: "💪", value: "12", label: "Pass" },
      { emoji: "⏱️", value: "8h", label: "Tid" },
    ].forEach((stat, i) => {
      const sx = x + 25 + i * statWidth;
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(stat.emoji, sx + statWidth/2, statsY + 20);
      ctx.font = "bold 22px 'Oswald', sans-serif";
      ctx.fillStyle = COLORS.orange;
      ctx.fillText(stat.value, sx + statWidth/2, statsY + 50);
      ctx.font = "12px sans-serif";
      ctx.fillStyle = COLORS.whiteDim;
      ctx.fillText(stat.label, sx + statWidth/2, statsY + 68);
    });
    
    // Action buttons
    drawButton(ctx, x + 25, yPos + 125, (w - 70)/2, 40, "LOGGA STYRKA");
    drawButton(ctx, x + 35 + (w - 70)/2, yPos + 125, (w - 70)/2, 40, "LOGGA KONDITION", false);
    yPos += 200;
    
    // Weekly overview card
    drawCard(ctx, x + 10, yPos, w - 20, 150);
    ctx.font = "bold 16px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "left";
    ctx.fillText("Denna vecka", x + 25, yPos + 28);
    
    // Mini bar chart
    const days = ["M", "T", "O", "T", "F", "L", "S"];
    const values = [0.6, 0.8, 0.4, 1, 0.7, 0.9, 0.3];
    const barWidth = (w - 80) / 7;
    const maxBarHeight = 70;
    
    days.forEach((day, i) => {
      const bx = x + 30 + i * barWidth;
      const barHeight = values[i] * maxBarHeight;
      
      ctx.fillStyle = i < 5 ? COLORS.orange : COLORS.surfaceLight;
      ctx.beginPath();
      ctx.roundRect(bx, yPos + 50 + (maxBarHeight - barHeight), barWidth - 8, barHeight, 4);
      ctx.fill();
      
      ctx.font = "11px sans-serif";
      ctx.fillStyle = COLORS.whiteDim;
      ctx.textAlign = "center";
      ctx.fillText(day, bx + (barWidth - 8)/2, yPos + 140);
    });
  };

  const drawTraining = (ctx: CanvasRenderingContext2D, screen: { screenX: number; screenY: number; screenWidth: number; screenHeight: number }) => {
    const { screenX: x, screenY: y, screenWidth: w } = screen;
    let yPos = y;
    
    // Header
    ctx.font = "bold 24px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.fillText("Träning", x + w/2, yPos + 25);
    yPos += 50;
    
    // Tabs
    const tabs = ["Styrka", "Kondition", "CrossFit"];
    const tabWidth = (w - 40) / 3;
    tabs.forEach((tab, i) => {
      ctx.fillStyle = i === 0 ? COLORS.orange : "transparent";
      ctx.beginPath();
      ctx.roundRect(x + 20 + i * tabWidth, yPos, tabWidth - 5, 36, 8);
      ctx.fill();
      
      ctx.font = "bold 14px 'Oswald', sans-serif";
      ctx.fillStyle = i === 0 ? COLORS.white : COLORS.whiteDim;
      ctx.textAlign = "center";
      ctx.fillText(tab, x + 20 + i * tabWidth + (tabWidth - 5)/2, yPos + 23);
    });
    yPos += 55;
    
    // Active program card
    drawCard(ctx, x + 10, yPos, w - 20, 120);
    ctx.font = "12px sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.textAlign = "left";
    ctx.fillText("AKTIVT PROGRAM", x + 25, yPos + 25);
    
    ctx.font = "bold 18px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText("Push Pull Legs", x + 25, yPos + 50);
    
    ctx.font = "14px sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.fillText("6 dagar/vecka • Avancerad", x + 25, yPos + 72);
    
    drawButton(ctx, x + 25, yPos + 85, w - 70, 25, "STARTA PASS", true);
    yPos += 140;
    
    // Recent workouts
    ctx.font = "bold 16px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "left";
    ctx.fillText("Senaste pass", x + 20, yPos + 20);
    yPos += 35;
    
    const workouts = [
      { day: "Push dag", date: "Igår", exercises: 8, duration: "52 min" },
      { day: "Pull dag", date: "2 dagar sedan", exercises: 7, duration: "48 min" },
      { day: "Ben dag", date: "3 dagar sedan", exercises: 6, duration: "55 min" },
    ];
    
    workouts.forEach((workout) => {
      drawCard(ctx, x + 10, yPos, w - 20, 70);
      
      ctx.font = "bold 15px 'Oswald', sans-serif";
      ctx.fillStyle = COLORS.white;
      ctx.textAlign = "left";
      ctx.fillText(workout.day, x + 25, yPos + 25);
      
      ctx.font = "12px sans-serif";
      ctx.fillStyle = COLORS.whiteDim;
      ctx.fillText(workout.date, x + 25, yPos + 45);
      
      ctx.textAlign = "right";
      ctx.fillStyle = COLORS.orange;
      ctx.fillText(`${workout.exercises} övningar`, x + w - 35, yPos + 25);
      ctx.fillStyle = COLORS.whiteDim;
      ctx.fillText(workout.duration, x + w - 35, yPos + 45);
      
      yPos += 80;
    });
  };

  const drawWorkoutSession = (ctx: CanvasRenderingContext2D, screen: { screenX: number; screenY: number; screenWidth: number; screenHeight: number }) => {
    const { screenX: x, screenY: y, screenWidth: w, screenHeight: h } = screen;
    let yPos = y;
    
    // Progress bar at top
    ctx.fillStyle = COLORS.surfaceLight;
    ctx.fillRect(x, yPos, w, 4);
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(x, yPos, w * 0.4, 4);
    yPos += 15;
    
    // Exercise counter
    ctx.font = "14px sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.textAlign = "center";
    ctx.fillText("Övning 3 av 8", x + w/2, yPos + 10);
    yPos += 30;
    
    // Timer
    ctx.font = "bold 48px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.fillText("23:45", x + w/2, yPos + 45);
    yPos += 70;
    
    // Current exercise
    drawCard(ctx, x + 10, yPos, w - 20, 200);
    
    ctx.font = "bold 22px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.fillText("Bänkpress", x + w/2, yPos + 35);
    
    ctx.font = "14px sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.fillText("4 set × 8-10 reps", x + w/2, yPos + 58);
    
    // Set inputs
    const setY = yPos + 80;
    ctx.font = "bold 12px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.textAlign = "left";
    ctx.fillText("SET", x + 30, setY);
    ctx.fillText("VIKT", x + 80, setY);
    ctx.fillText("REPS", x + 160, setY);
    
    const sets = [
      { set: 1, weight: "80", reps: "10", done: true },
      { set: 2, weight: "82.5", reps: "9", done: true },
      { set: 3, weight: "82.5", reps: "", done: false },
      { set: 4, weight: "", reps: "", done: false },
    ];
    
    sets.forEach((s, i) => {
      const sy = setY + 20 + i * 28;
      
      // Set number
      ctx.fillStyle = s.done ? COLORS.green : COLORS.whiteDim;
      ctx.font = "bold 14px 'Oswald', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(s.set.toString(), x + 40, sy + 15);
      
      // Weight input
      ctx.fillStyle = COLORS.surfaceLight;
      ctx.beginPath();
      ctx.roundRect(x + 65, sy, 70, 24, 6);
      ctx.fill();
      if (s.weight) {
        ctx.fillStyle = COLORS.white;
        ctx.font = "14px sans-serif";
        ctx.fillText(s.weight + " kg", x + 100, sy + 16);
      }
      
      // Reps input
      ctx.fillStyle = COLORS.surfaceLight;
      ctx.beginPath();
      ctx.roundRect(x + 145, sy, 60, 24, 6);
      ctx.fill();
      if (s.reps) {
        ctx.fillStyle = COLORS.white;
        ctx.fillText(s.reps, x + 175, sy + 16);
      }
      
      // Check
      if (s.done) {
        ctx.fillStyle = COLORS.green;
        ctx.font = "16px sans-serif";
        ctx.fillText("✓", x + w - 45, sy + 16);
      }
    });
    yPos += 220;
    
    // Navigation buttons
    drawButton(ctx, x + 20, yPos + 10, (w - 50)/2, 45, "← FÖRRA", false);
    drawButton(ctx, x + 30 + (w - 50)/2, yPos + 10, (w - 50)/2, 45, "NÄSTA →");
  };

  const drawStatistics = (ctx: CanvasRenderingContext2D, screen: { screenX: number; screenY: number; screenWidth: number; screenHeight: number }) => {
    const { screenX: x, screenY: y, screenWidth: w } = screen;
    let yPos = y;
    
    // Header
    ctx.font = "bold 24px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.fillText("Statistik", x + w/2, yPos + 25);
    yPos += 55;
    
    // Stats overview
    const stats = [
      { value: "156", label: "Pass", color: COLORS.orange },
      { value: "524", label: "Timmar", color: COLORS.blue },
      { value: "12", label: "Nivå", color: COLORS.green },
    ];
    
    const statWidth = (w - 40) / 3;
    stats.forEach((stat, i) => {
      drawCard(ctx, x + 15 + i * statWidth, yPos, statWidth - 10, 80);
      
      ctx.font = "bold 28px 'Oswald', sans-serif";
      ctx.fillStyle = stat.color;
      ctx.textAlign = "center";
      ctx.fillText(stat.value, x + 15 + i * statWidth + (statWidth - 10)/2, yPos + 40);
      
      ctx.font = "12px sans-serif";
      ctx.fillStyle = COLORS.whiteDim;
      ctx.fillText(stat.label, x + 15 + i * statWidth + (statWidth - 10)/2, yPos + 60);
    });
    yPos += 100;
    
    // Chart card
    drawCard(ctx, x + 10, yPos, w - 20, 180);
    ctx.font = "bold 16px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "left";
    ctx.fillText("Träning per vecka", x + 25, yPos + 28);
    
    // Line chart mock
    const chartX = x + 30;
    const chartY = yPos + 50;
    const chartW = w - 60;
    const chartH = 100;
    
    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(chartX, chartY + (chartH / 4) * i);
      ctx.lineTo(chartX + chartW, chartY + (chartH / 4) * i);
      ctx.stroke();
    }
    
    // Line
    const points = [0.3, 0.5, 0.4, 0.7, 0.6, 0.8, 0.9, 0.75, 0.85, 0.95, 0.8, 1];
    ctx.strokeStyle = COLORS.orange;
    ctx.lineWidth = 3;
    ctx.beginPath();
    points.forEach((p, i) => {
      const px = chartX + (chartW / (points.length - 1)) * i;
      const py = chartY + chartH - (chartH * p);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    
    // Fill under line
    ctx.lineTo(chartX + chartW, chartY + chartH);
    ctx.lineTo(chartX, chartY + chartH);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
    gradient.addColorStop(0, "rgba(249, 115, 22, 0.3)");
    gradient.addColorStop(1, "rgba(249, 115, 22, 0)");
    ctx.fillStyle = gradient;
    ctx.fill();
    yPos += 200;
    
    // PR card
    drawCard(ctx, x + 10, yPos, w - 20, 100);
    ctx.font = "bold 16px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "left";
    ctx.fillText("Senaste PR 🏆", x + 25, yPos + 28);
    
    ctx.font = "14px sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.fillText("Bänkpress: 100 kg × 5", x + 25, yPos + 55);
    ctx.fillStyle = COLORS.whiteDim;
    ctx.fillText("Tidigare: 95 kg × 5 (+5 kg)", x + 25, yPos + 78);
  };

  const drawSocial = (ctx: CanvasRenderingContext2D, screen: { screenX: number; screenY: number; screenWidth: number; screenHeight: number }) => {
    const { screenX: x, screenY: y, screenWidth: w } = screen;
    let yPos = y;
    
    // Header
    ctx.font = "bold 24px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.fillText("Socialt", x + w/2, yPos + 25);
    yPos += 55;
    
    // Tabs
    const tabs = ["Vänner", "Utmaningar", "Pool"];
    const tabWidth = (w - 40) / 3;
    tabs.forEach((tab, i) => {
      ctx.fillStyle = i === 1 ? COLORS.orange : "transparent";
      ctx.beginPath();
      ctx.roundRect(x + 20 + i * tabWidth, yPos, tabWidth - 5, 36, 8);
      ctx.fill();
      
      ctx.font = "bold 14px 'Oswald', sans-serif";
      ctx.fillStyle = i === 1 ? COLORS.white : COLORS.whiteDim;
      ctx.textAlign = "center";
      ctx.fillText(tab, x + 20 + i * tabWidth + (tabWidth - 5)/2, yPos + 23);
    });
    yPos += 55;
    
    // Active challenge card
    drawCard(ctx, x + 10, yPos, w - 20, 150);
    ctx.font = "12px sans-serif";
    ctx.fillStyle = COLORS.green;
    ctx.textAlign = "left";
    ctx.fillText("AKTIV UTMANING", x + 25, yPos + 25);
    
    ctx.font = "bold 18px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText("Flest träningspass", x + 25, yPos + 50);
    
    ctx.font = "14px sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.fillText("7 dagar kvar", x + 25, yPos + 72);
    
    // Leaderboard
    const leaders = [
      { name: "Du", value: 8, leading: true },
      { name: "A. Andersson", value: 7, leading: false },
    ];
    
    leaders.forEach((leader, i) => {
      const ly = yPos + 90 + i * 25;
      ctx.font = "14px sans-serif";
      ctx.fillStyle = leader.leading ? COLORS.orange : COLORS.white;
      ctx.textAlign = "left";
      ctx.fillText(`${i + 1}. ${leader.name}`, x + 25, ly);
      ctx.textAlign = "right";
      ctx.fillText(`${leader.value} pass`, x + w - 35, ly);
    });
    yPos += 170;
    
    // Create challenge button
    drawButton(ctx, x + 20, yPos, w - 40, 45, "+ SKAPA UTMANING");
    yPos += 65;
    
    // Friends preview
    drawCard(ctx, x + 10, yPos, w - 20, 100);
    ctx.font = "bold 16px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "left";
    ctx.fillText("Dina vänner", x + 25, yPos + 28);
    
    // Friend avatars
    const avatarSize = 40;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = ["#3b82f6", "#22c55e", "#f97316", "#8b5cf6"][i];
      ctx.beginPath();
      ctx.arc(x + 45 + i * 50, yPos + 65, avatarSize/2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.font = "bold 16px sans-serif";
      ctx.fillStyle = COLORS.white;
      ctx.textAlign = "center";
      ctx.fillText(["J", "M", "L", "K"][i], x + 45 + i * 50, yPos + 70);
    }
  };

  const drawCardio = (ctx: CanvasRenderingContext2D, screen: { screenX: number; screenY: number; screenWidth: number; screenHeight: number }) => {
    const { screenX: x, screenY: y, screenWidth: w } = screen;
    let yPos = y;
    
    // Header
    ctx.font = "bold 24px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.fillText("Kondition", x + w/2, yPos + 25);
    yPos += 55;
    
    // Quick log button
    drawButton(ctx, x + 20, yPos, w - 40, 50, "📍 STARTA GPS-TRACKING");
    yPos += 70;
    
    // Activity selection
    ctx.font = "bold 14px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.textAlign = "left";
    ctx.fillText("Välj aktivitet", x + 20, yPos);
    yPos += 20;
    
    const activities = [
      { emoji: "🏃", name: "Löpning" },
      { emoji: "🚴", name: "Cykling" },
      { emoji: "🚶", name: "Promenad" },
      { emoji: "🏊", name: "Simning" },
    ];
    
    const actWidth = (w - 50) / 4;
    activities.forEach((act, i) => {
      const ax = x + 20 + i * actWidth;
      ctx.fillStyle = i === 0 ? COLORS.orange : COLORS.surface;
      ctx.beginPath();
      ctx.roundRect(ax, yPos, actWidth - 10, 60, 12);
      ctx.fill();
      
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(act.emoji, ax + (actWidth - 10)/2, yPos + 28);
      
      ctx.font = "10px sans-serif";
      ctx.fillStyle = COLORS.white;
      ctx.fillText(act.name, ax + (actWidth - 10)/2, yPos + 50);
    });
    yPos += 80;
    
    // Recent cardio
    ctx.font = "bold 16px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "left";
    ctx.fillText("Senaste aktiviteter", x + 20, yPos + 15);
    yPos += 35;
    
    const cardios = [
      { type: "🏃", name: "Löpning", dist: "5.2 km", time: "28:45", date: "Idag" },
      { type: "🚴", name: "Cykling", dist: "15.8 km", time: "42:30", date: "Igår" },
    ];
    
    cardios.forEach((cardio) => {
      drawCard(ctx, x + 10, yPos, w - 20, 75);
      
      ctx.font = "28px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(cardio.type, x + 25, yPos + 40);
      
      ctx.font = "bold 16px 'Oswald', sans-serif";
      ctx.fillStyle = COLORS.white;
      ctx.fillText(cardio.name, x + 65, yPos + 25);
      
      ctx.font = "13px sans-serif";
      ctx.fillStyle = COLORS.whiteDim;
      ctx.fillText(`${cardio.dist} • ${cardio.time}`, x + 65, yPos + 48);
      
      ctx.textAlign = "right";
      ctx.fillStyle = COLORS.orange;
      ctx.fillText(cardio.date, x + w - 35, yPos + 35);
      
      yPos += 85;
    });
  };

  const drawCrossfit = (ctx: CanvasRenderingContext2D, screen: { screenX: number; screenY: number; screenWidth: number; screenHeight: number }) => {
    const { screenX: x, screenY: y, screenWidth: w } = screen;
    let yPos = y;
    
    // Header
    ctx.font = "bold 24px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.textAlign = "center";
    ctx.fillText("CrossFit WOD", x + w/2, yPos + 25);
    yPos += 55;
    
    // Generated WOD card
    drawCard(ctx, x + 10, yPos, w - 20, 280);
    
    ctx.font = "12px sans-serif";
    ctx.fillStyle = COLORS.orange;
    ctx.textAlign = "left";
    ctx.fillText("DAGENS WOD", x + 25, yPos + 25);
    
    ctx.font = "bold 20px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.white;
    ctx.fillText("AMRAP 15 min", x + 25, yPos + 52);
    
    const exercises = [
      "10 × Burpees",
      "15 × Kettlebell Swings (24kg)",
      "20 × Air Squats",
      "10 × Pull-ups",
    ];
    
    ctx.font = "15px sans-serif";
    exercises.forEach((ex, i) => {
      ctx.fillStyle = COLORS.white;
      ctx.fillText(ex, x + 25, yPos + 85 + i * 28);
    });
    
    ctx.font = "12px sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.fillText("Scaling: Jumping pull-ups, Box step-ups", x + 25, yPos + 200);
    
    drawButton(ctx, x + 25, yPos + 230, w - 70, 40, "STARTA WOD");
    yPos += 300;
    
    // Generate new WOD
    drawButton(ctx, x + 20, yPos, w - 40, 45, "🎲 GENERERA NY WOD", false);
  };

  const generateImage = useCallback(async (
    canvas: HTMLCanvasElement,
    template: ScreenshotTemplate, 
    format: "post" | "story"
  ): Promise<Blob | null> => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const width = 1080;
    const height = format === "post" ? 1080 : 1920;
    canvas.width = width;
    canvas.height = height;

    // Background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#0a0a0a");
    gradient.addColorStop(0.5, "#121212");
    gradient.addColorStop(1, "#0a0a0a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Orange glow
    ctx.shadowBlur = 200;
    ctx.shadowColor = "rgba(249, 115, 22, 0.15)";
    ctx.beginPath();
    ctx.arc(width * 0.7, height * 0.3, 300, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(249, 115, 22, 0.05)";
    ctx.fill();
    ctx.shadowBlur = 0;

    // Phone mockup
    const phoneWidth = format === "post" ? 380 : 420;
    const phoneHeight = format === "post" ? 780 : 850;
    const phoneX = (width - phoneWidth) / 2;
    const phoneY = format === "post" ? 150 : 200;

    const screen = drawPhoneFrame(ctx, phoneX, phoneY, phoneWidth, phoneHeight);
    drawStatusBar(ctx, screen.screenX, screen.screenY - 25, screen.screenWidth);

    // Draw template content
    switch (template) {
      case "dashboard":
        drawDashboard(ctx, screen);
        break;
      case "training":
        drawTraining(ctx, screen);
        break;
      case "workoutSession":
        drawWorkoutSession(ctx, screen);
        break;
      case "cardio":
        drawCardio(ctx, screen);
        break;
      case "crossfit":
        drawCrossfit(ctx, screen);
        break;
      case "statistics":
        drawStatistics(ctx, screen);
        break;
      case "social":
        drawSocial(ctx, screen);
        break;
    }

    // Logo and branding at bottom
    if (logoImage) {
      const logoSize = 60;
      ctx.drawImage(logoImage, width/2 - logoSize/2, height - 120, logoSize, logoSize);
    }
    
    ctx.font = "bold 28px 'Oswald', sans-serif";
    ctx.fillStyle = COLORS.whiteDim;
    ctx.textAlign = "center";
    ctx.fillText("GYMDAGBOKEN.SE", width / 2, height - 45);

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
          title: "Gymdagboken",
          text: "Se min träning i Gymdagboken! 💪",
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

  const handleDownloadAll = async () => {
    if (!downloadCanvasRef.current) return;
    
    toast.info("Genererar alla screenshots...");
    
    for (const template of TEMPLATES) {
      const blob = await generateImage(downloadCanvasRef.current, template.id, imageFormat);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gymdagboken-${template.id}-${imageFormat}.png`;
        a.click();
        URL.revokeObjectURL(url);
        await new Promise(r => setTimeout(r, 300));
      }
    }
    
    toast.success("Alla screenshots nedladdade!");
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
                Välj app-vy
              </CardTitle>
              <CardDescription>
                Realistiska screenshots av appen utan reklam
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
                    <TabsTrigger value="story" className="flex-1">Story (1080x1920)</TabsTrigger>
                    <TabsTrigger value="post" className="flex-1">Post (1080x1080)</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Share and download buttons */}
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
                  Ladda ner alla screenshots
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
