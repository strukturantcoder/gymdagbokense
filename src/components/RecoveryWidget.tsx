import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Moon, Battery, Activity, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface RecoveryLog {
  sleep_hours: number | null;
  sleep_quality: number;
  muscle_soreness: number;
  energy_level: number;
  logged_at: string;
}

export default function RecoveryWidget() {
  const { user } = useAuth();
  const [todayLog, setTodayLog] = useState<RecoveryLog | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [soreness, setSoreness] = useState(2);
  const [energy, setEnergy] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchTodayLog();
  }, [user]);

  const fetchTodayLog = async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("recovery_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("logged_at", today)
      .maybeSingle();
    if (data) setTodayLog(data as RecoveryLog);
  };

  const calculateReadyScore = (log: RecoveryLog) => {
    const sq = log.sleep_quality || 3;
    const el = log.energy_level || 3;
    const ms = log.muscle_soreness || 3;
    return (sq * 0.35) + (el * 0.35) + ((6 - ms) * 0.3);
  };

  const getReadyLabel = (score: number) => {
    if (score >= 3.5) return { text: "Redo att köra!", color: "text-green-500", bg: "from-green-500/10 to-emerald-500/10", border: "border-green-500/20" };
    if (score >= 2.5) return { text: "Måttligt redo", color: "text-amber-500", bg: "from-amber-500/10 to-yellow-500/10", border: "border-amber-500/20" };
    return { text: "Vila rekommenderas", color: "text-red-500", bg: "from-red-500/10 to-orange-500/10", border: "border-red-500/20" };
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("recovery_logs").upsert({
        user_id: user.id,
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        muscle_soreness: soreness,
        energy_level: energy,
        logged_at: today,
      }, { onConflict: "user_id,logged_at" });
      if (error) throw error;
      toast.success("Återhämtning loggad!");
      setShowCheckIn(false);
      fetchTodayLog();
    } catch (err) {
      console.error(err);
      toast.error("Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  if (!todayLog) {
    return (
      <Card className="overflow-hidden bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 cursor-pointer hover:border-indigo-500/40 transition-all" onClick={() => setShowCheckIn(true)}>
        <CardContent className="p-2.5 h-full flex flex-col justify-between">
          <Moon className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-xs font-semibold">Check-in</p>
            <p className="text-[10px] text-muted-foreground">Återhämtning</p>
          </div>
        </CardContent>
        <CheckInDialog
          open={showCheckIn}
          onOpenChange={setShowCheckIn}
          sleepHours={sleepHours}
          setSleepHours={setSleepHours}
          sleepQuality={sleepQuality}
          setSleepQuality={setSleepQuality}
          soreness={soreness}
          setSoreness={setSoreness}
          energy={energy}
          setEnergy={setEnergy}
          saving={saving}
          onSave={handleSave}
        />
      </Card>
    );
  }

  const score = calculateReadyScore(todayLog);
  const ready = getReadyLabel(score);

  return (
    <>
      <Card className={`overflow-hidden bg-gradient-to-br ${ready.bg} ${ready.border} cursor-pointer hover:opacity-90 transition-all`} onClick={() => setShowCheckIn(true)}>
        <CardContent className="p-2.5 h-full flex flex-col justify-between">
          <Battery className={`w-5 h-5 ${ready.color}`} />
          <div>
            <p className={`text-xs font-bold ${ready.color}`}>{ready.text}</p>
            <p className="text-[10px] text-muted-foreground">{todayLog.sleep_hours}h sömn</p>
          </div>
        </CardContent>
      </Card>
      <CheckInDialog
        open={showCheckIn}
        onOpenChange={setShowCheckIn}
        sleepHours={sleepHours}
        setSleepHours={setSleepHours}
        sleepQuality={sleepQuality}
        setSleepQuality={setSleepQuality}
        soreness={soreness}
        setSoreness={setSoreness}
        energy={energy}
        setEnergy={setEnergy}
        saving={saving}
        onSave={handleSave}
      />
    </>
  );
}

function CheckInDialog({
  open, onOpenChange, sleepHours, setSleepHours, sleepQuality, setSleepQuality,
  soreness, setSoreness, energy, setEnergy, saving, onSave,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  sleepHours: number; setSleepHours: (v: number) => void;
  sleepQuality: number; setSleepQuality: (v: number) => void;
  soreness: number; setSoreness: (v: number) => void;
  energy: number; setEnergy: (v: number) => void;
  saving: boolean; onSave: () => void;
}) {
  const sliderLabels = ["Väldigt dålig", "Dålig", "OK", "Bra", "Utmärkt"];
  const sorenessLabels = ["Ingen", "Lite", "Måttlig", "Hög", "Extrem"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-500" /> Daglig check-in
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div>
            <Label className="flex items-center justify-between">
              Sömn (timmar) <span className="text-sm font-bold">{sleepHours}h</span>
            </Label>
            <Slider value={[sleepHours]} onValueChange={([v]) => setSleepHours(v)} min={3} max={12} step={0.5} className="mt-2" />
          </div>
          <div>
            <Label className="flex items-center justify-between">
              Sömnkvalitet <span className="text-sm font-bold">{sliderLabels[sleepQuality - 1]}</span>
            </Label>
            <Slider value={[sleepQuality]} onValueChange={([v]) => setSleepQuality(v)} min={1} max={5} step={1} className="mt-2" />
          </div>
          <div>
            <Label className="flex items-center justify-between">
              Energinivå <span className="text-sm font-bold">{sliderLabels[energy - 1]}</span>
            </Label>
            <Slider value={[energy]} onValueChange={([v]) => setEnergy(v)} min={1} max={5} step={1} className="mt-2" />
          </div>
          <div>
            <Label className="flex items-center justify-between">
              Träningsvärk <span className="text-sm font-bold">{sorenessLabels[soreness - 1]}</span>
            </Label>
            <Slider value={[soreness]} onValueChange={([v]) => setSoreness(v)} min={1} max={5} step={1} className="mt-2" />
          </div>
          <Button className="w-full" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Spara check-in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
