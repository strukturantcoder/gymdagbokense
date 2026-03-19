import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

interface MealLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMealLogged: () => void;
}

export default function MealLogDialog({ open, onOpenChange, onMealLogged }: MealLogDialogProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState("lunch");
  const [calories, setCalories] = useState<number | "">("");
  const [protein, setProtein] = useState<number | "">("");
  const [carbs, setCarbs] = useState<number | "">("");
  const [fat, setFat] = useState<number | "">("");
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleEstimate = async () => {
    if (!description.trim()) {
      toast.error("Beskriv din måltid först");
      return;
    }
    setEstimating(true);
    try {
      const { data, error } = await supabase.functions.invoke("estimate-meal-macros", {
        body: { description },
      });
      if (error) throw error;
      if (data) {
        setCalories(Math.round(data.calories || 0));
        setProtein(Math.round(data.protein_g || 0));
        setCarbs(Math.round(data.carbs_g || 0));
        setFat(Math.round(data.fat_g || 0));
        toast.success("Makros estimerade med AI!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Kunde inte estimera makros");
    } finally {
      setEstimating(false);
    }
  };

  const handleSave = async () => {
    if (!user || !description.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("meal_logs").insert({
        user_id: user.id,
        meal_type: mealType,
        description: description.trim(),
        calories: calories || null,
        protein_g: protein || null,
        carbs_g: carbs || null,
        fat_g: fat || null,
      });
      if (error) throw error;
      toast.success("Måltid loggad!");
      onMealLogged();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Kunde inte spara måltid");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDescription("");
    setMealType("lunch");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Logga måltid</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Typ</Label>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Frukost</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Middag</SelectItem>
                <SelectItem value="snack">Mellanmål</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Beskrivning</Label>
            <Textarea
              placeholder="T.ex. 'Kycklingfilé med ris och grönsaker' eller '2 ägg, 2 skivor bröd med ost'"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={handleEstimate}
              disabled={estimating || !description.trim()}
            >
              {estimating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Estimera makros med AI
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kalorier (kcal)</Label>
              <Input type="number" value={calories} onChange={(e) => setCalories(e.target.value ? Number(e.target.value) : "")} placeholder="0" />
            </div>
            <div>
              <Label>Protein (g)</Label>
              <Input type="number" value={protein} onChange={(e) => setProtein(e.target.value ? Number(e.target.value) : "")} placeholder="0" />
            </div>
            <div>
              <Label>Kolhydrater (g)</Label>
              <Input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value ? Number(e.target.value) : "")} placeholder="0" />
            </div>
            <div>
              <Label>Fett (g)</Label>
              <Input type="number" value={fat} onChange={(e) => setFat(e.target.value ? Number(e.target.value) : "")} placeholder="0" />
            </div>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving || !description.trim()}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Spara måltid
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
