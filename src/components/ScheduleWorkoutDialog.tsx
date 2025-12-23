import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dumbbell, Footprints, Clock, Bell, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface WorkoutProgram {
  id: string;
  name: string;
  program_data: {
    days: Array<{ name: string; exercises: Array<{ name: string }> }>;
  };
}

interface ScheduledWorkout {
  id: string;
  title: string;
  workout_type: string;
  description: string | null;
  duration_minutes: number | null;
  reminder_enabled: boolean;
  reminder_minutes_before: number | null;
  workout_program_id: string | null;
  workout_day_name: string | null;
  scheduled_date: string;
  completed_at: string | null;
}

interface ScheduleWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  existingWorkouts: ScheduledWorkout[];
  onWorkoutsChange: () => void;
}

export default function ScheduleWorkoutDialog({
  open,
  onOpenChange,
  selectedDate,
  existingWorkouts,
  onWorkoutsChange,
}: ScheduleWorkoutDialogProps) {
  const { user } = useAuth();
  const [workoutType, setWorkoutType] = useState<"strength" | "cardio" | "other">("strength");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState("60");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedDayName, setSelectedDayName] = useState<string>("");
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchPrograms();
    }
  }, [open, user]);

  const fetchPrograms = async () => {
    const { data } = await supabase
      .from("workout_programs")
      .select("id, name, program_data")
      .eq("user_id", user?.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (data) {
      setPrograms(data as WorkoutProgram[]);
    }
  };

  const handleProgramSelect = (programId: string) => {
    setSelectedProgramId(programId);
    const program = programs.find((p) => p.id === programId);
    if (program && program.program_data?.days?.[0]) {
      setSelectedDayName(program.program_data.days[0].name);
      setTitle(`${program.name} - ${program.program_data.days[0].name}`);
    }
  };

  const handleDaySelect = (dayName: string) => {
    setSelectedDayName(dayName);
    const program = programs.find((p) => p.id === selectedProgramId);
    if (program) {
      setTitle(`${program.name} - ${dayName}`);
    }
  };

  const resetForm = () => {
    setWorkoutType("strength");
    setTitle("");
    setDescription("");
    setDurationMinutes("");
    setReminderEnabled(true);
    setReminderMinutes("60");
    setSelectedProgramId("");
    setSelectedDayName("");
  };

  const handleSubmit = async () => {
    if (!user || !title.trim()) {
      toast.error("Ange en titel för passet");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from("scheduled_workouts").insert({
        user_id: user.id,
        scheduled_date: format(selectedDate, "yyyy-MM-dd"),
        title: title.trim(),
        workout_type: workoutType,
        description: description.trim() || null,
        duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
        reminder_enabled: reminderEnabled,
        reminder_minutes_before: reminderEnabled ? parseInt(reminderMinutes) : null,
        workout_program_id: selectedProgramId || null,
        workout_day_name: selectedDayName || null,
      });

      if (error) throw error;

      toast.success("Träningspass schemalagt!");
      resetForm();
      onWorkoutsChange();
    } catch (error) {
      console.error("Error scheduling workout:", error);
      toast.error("Kunde inte schemalägga pass");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (workoutId: string) => {
    setIsDeleting(workoutId);
    try {
      const { error } = await supabase
        .from("scheduled_workouts")
        .delete()
        .eq("id", workoutId);

      if (error) throw error;

      toast.success("Pass borttaget");
      onWorkoutsChange();
    } catch (error) {
      console.error("Error deleting workout:", error);
      toast.error("Kunde inte ta bort pass");
    } finally {
      setIsDeleting(null);
    }
  };

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {format(selectedDate, "EEEE d MMMM", { locale: sv })}
          </DialogTitle>
          <DialogDescription>
            Schemalägg träningspass för denna dag
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Existing workouts for this day */}
          {existingWorkouts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Schemalagda pass</Label>
              <div className="space-y-2">
                {existingWorkouts.map((workout) => (
                  <div
                    key={workout.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      workout.completed_at
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {workout.workout_type === "cardio" ? (
                        <Footprints className="h-4 w-4 text-green-500" />
                      ) : (
                        <Dumbbell className="h-4 w-4 text-primary" />
                      )}
                      <span className="text-sm font-medium">{workout.title}</span>
                      {workout.completed_at && (
                        <span className="text-xs text-green-500">✓ Klar</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(workout.id)}
                      disabled={isDeleting === workout.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new workout */}
          <div className="space-y-4 pt-2 border-t">
            <Label className="text-sm font-medium">Lägg till nytt pass</Label>

            {/* Workout type */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={workoutType === "strength" ? "default" : "outline"}
                size="sm"
                onClick={() => setWorkoutType("strength")}
                className="flex-1 gap-2"
              >
                <Dumbbell className="h-4 w-4" />
                Styrka
              </Button>
              <Button
                type="button"
                variant={workoutType === "cardio" ? "default" : "outline"}
                size="sm"
                onClick={() => setWorkoutType("cardio")}
                className="flex-1 gap-2"
              >
                <Footprints className="h-4 w-4" />
                Kondition
              </Button>
              <Button
                type="button"
                variant={workoutType === "other" ? "default" : "outline"}
                size="sm"
                onClick={() => setWorkoutType("other")}
                className="flex-1"
              >
                Annat
              </Button>
            </div>

            {/* Select from program (strength only) */}
            {workoutType === "strength" && programs.length > 0 && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Välj från program</Label>
                  <Select value={selectedProgramId} onValueChange={handleProgramSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Välj program..." />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProgram && selectedProgram.program_data?.days && (
                  <div className="space-y-2">
                    <Label className="text-sm">Välj dag</Label>
                    <Select value={selectedDayName} onValueChange={handleDaySelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj dag..." />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProgram.program_data.days.map((day) => (
                          <SelectItem key={day.name} value={day.name}>
                            {day.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm">Titel</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="t.ex. Bröst & Axlar"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm">Beskrivning (valfritt)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Anteckningar..."
                rows={2}
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Längd (minuter)
              </Label>
              <Input
                id="duration"
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="60"
              />
            </div>

            {/* Reminder */}
            <div className="space-y-3 p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="reminder" className="text-sm flex items-center gap-2 cursor-pointer">
                  <Bell className="h-4 w-4" />
                  Påminnelse
                </Label>
                <Switch
                  id="reminder"
                  checked={reminderEnabled}
                  onCheckedChange={setReminderEnabled}
                />
              </div>
              {reminderEnabled && (
                <Select value={reminderMinutes} onValueChange={setReminderMinutes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minuter innan</SelectItem>
                    <SelectItem value="30">30 minuter innan</SelectItem>
                    <SelectItem value="60">1 timme innan</SelectItem>
                    <SelectItem value="120">2 timmar innan</SelectItem>
                    <SelectItem value="1440">Dagen innan (kl 20:00)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !title.trim()}
              className="w-full"
            >
              {isLoading ? "Schemalägger..." : "Lägg till pass"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
