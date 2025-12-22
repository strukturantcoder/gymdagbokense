import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Clock, Sun, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReminderSettings {
  id?: string;
  user_id: string;
  reminder_type: "morning" | "before_workout";
  is_enabled: boolean;
  reminder_time: string;
  days_of_week: number[];
  minutes_before: number;
}

const DAYS = [
  { value: 1, label: "Mån" },
  { value: 2, label: "Tis" },
  { value: 3, label: "Ons" },
  { value: 4, label: "Tor" },
  { value: 5, label: "Fre" },
  { value: 6, label: "Lör" },
  { value: 0, label: "Sön" },
];

interface WorkoutReminderSettingsProps {
  trigger?: React.ReactNode;
}

export default function WorkoutReminderSettings({ trigger }: WorkoutReminderSettingsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [morningEnabled, setMorningEnabled] = useState(false);
  const [morningTime, setMorningTime] = useState("08:00");
  const [morningDays, setMorningDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const [beforeEnabled, setBeforeEnabled] = useState(false);
  const [beforeTime, setBeforeTime] = useState("18:00");
  const [beforeDays, setBeforeDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [minutesBefore, setMinutesBefore] = useState(60);

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["workout-reminders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("workout_reminders")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as ReminderSettings[];
    },
    enabled: !!user && open,
  });

  // Load existing settings
  useEffect(() => {
    if (reminders) {
      const morning = reminders.find((r) => r.reminder_type === "morning");
      if (morning) {
        setMorningEnabled(morning.is_enabled);
        setMorningTime(morning.reminder_time.slice(0, 5));
        setMorningDays(morning.days_of_week);
      }

      const before = reminders.find((r) => r.reminder_type === "before_workout");
      if (before) {
        setBeforeEnabled(before.is_enabled);
        setBeforeTime(before.reminder_time.slice(0, 5));
        setBeforeDays(before.days_of_week);
        setMinutesBefore(before.minutes_before || 60);
      }
    }
  }, [reminders]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");

      // Upsert morning reminder
      const morningData = {
        user_id: user.id,
        reminder_type: "morning" as const,
        is_enabled: morningEnabled,
        reminder_time: morningTime + ":00",
        days_of_week: morningDays,
        minutes_before: 0,
      };

      const { error: morningError } = await supabase
        .from("workout_reminders")
        .upsert(morningData, { onConflict: "user_id,reminder_type" });

      if (morningError) throw morningError;

      // Upsert before_workout reminder
      const beforeData = {
        user_id: user.id,
        reminder_type: "before_workout" as const,
        is_enabled: beforeEnabled,
        reminder_time: beforeTime + ":00",
        days_of_week: beforeDays,
        minutes_before: minutesBefore,
      };

      const { error: beforeError } = await supabase
        .from("workout_reminders")
        .upsert(beforeData, { onConflict: "user_id,reminder_type" });

      if (beforeError) throw beforeError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workout-reminders"] });
      toast.success("Påminnelseinställningar sparade!");
      setOpen(false);
    },
    onError: (error) => {
      console.error("Error saving reminders:", error);
      toast.error("Kunde inte spara inställningar");
    },
  });

  const toggleDay = (day: number, type: "morning" | "before") => {
    if (type === "morning") {
      setMorningDays((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
      );
    } else {
      setBeforeDays((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Bell className="h-4 w-4" />
            Påminnelser
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Träningspåminnelser
          </DialogTitle>
          <DialogDescription>
            Få påminnelser om dina planerade träningspass
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Morning reminder */}
            <div className="space-y-4 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10">
                    <Sun className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Morgonpåminnelse</Label>
                    <p className="text-sm text-muted-foreground">
                      Påminnelse om dagens träning
                    </p>
                  </div>
                </div>
                <Switch checked={morningEnabled} onCheckedChange={setMorningEnabled} />
              </div>

              {morningEnabled && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Tid</Label>
                    <Input
                      type="time"
                      value={morningTime}
                      onChange={(e) => setMorningTime(e.target.value)}
                      className="w-32"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Dagar</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((day) => (
                        <label
                          key={day.value}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          <Checkbox
                            checked={morningDays.includes(day.value)}
                            onCheckedChange={() => toggleDay(day.value, "morning")}
                          />
                          <span className="text-sm">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Before workout reminder */}
            <div className="space-y-4 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <Label className="text-base font-medium">Innan träning</Label>
                    <p className="text-sm text-muted-foreground">
                      Påminnelse innan planerad tid
                    </p>
                  </div>
                </div>
                <Switch checked={beforeEnabled} onCheckedChange={setBeforeEnabled} />
              </div>

              {beforeEnabled && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Planerad träningstid</Label>
                    <Input
                      type="time"
                      value={beforeTime}
                      onChange={(e) => setBeforeTime(e.target.value)}
                      className="w-32"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Påminn mig</Label>
                    <div className="flex gap-2">
                      {[30, 60, 120].map((mins) => (
                        <Button
                          key={mins}
                          type="button"
                          variant={minutesBefore === mins ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMinutesBefore(mins)}
                        >
                          {mins >= 60 ? `${mins / 60} tim` : `${mins} min`} innan
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Dagar</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((day) => (
                        <label
                          key={day.value}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          <Checkbox
                            checked={beforeDays.includes(day.value)}
                            onCheckedChange={() => toggleDay(day.value, "before")}
                          />
                          <span className="text-sm">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <strong>Tips:</strong> Aktivera push-notiser i din webbläsare för att få påminnelser även när appen är stängd.
            </div>

            {/* Save button */}
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Spara inställningar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
