import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Apple, Flame, Beef, Wheat, Droplets, ArrowLeft, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import MealLogDialog from "@/components/MealLogDialog";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

interface MealLog {
  id: string;
  meal_type: string;
  description: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  logged_at: string;
}

const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "🌅 Frukost",
  lunch: "☀️ Lunch",
  dinner: "🌙 Middag",
  snack: "🍎 Mellanmål",
};

export default function Nutrition() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [goals, setGoals] = useState({ calorie_target: 2000, protein_target: 150, carb_target: 250, fat_target: 70 });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchTodayMeals();
    fetchGoals();
  }, [user]);

  const fetchTodayMeals = async () => {
    if (!user) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", today.toISOString())
      .order("logged_at", { ascending: true });
    setMeals((data as MealLog[]) || []);
  };

  const fetchGoals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("daily_nutrition_goals")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (data) setGoals(data);
  };

  const deleteMeal = async (id: string) => {
    const { error } = await supabase.from("meal_logs").delete().eq("id", id);
    if (error) {
      toast.error("Kunde inte ta bort måltid");
    } else {
      toast.success("Måltid borttagen");
      fetchTodayMeals();
    }
  };

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein_g || 0),
      carbs: acc.carbs + (m.carbs_g || 0),
      fat: acc.fat + (m.fat_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const macroItems = [
    { label: "Kalorier", value: totals.calories, target: goals.calorie_target, unit: "kcal", icon: Flame, color: "text-orange-500" },
    { label: "Protein", value: totals.protein, target: goals.protein_target, unit: "g", icon: Beef, color: "text-red-500" },
    { label: "Kolhydrater", value: totals.carbs, target: goals.carb_target, unit: "g", icon: Wheat, color: "text-amber-500" },
    { label: "Fett", value: totals.fat, target: goals.fat_target, unit: "g", icon: Droplets, color: "text-blue-500" },
  ];

  return (
    <>
      <Helmet>
        <title>Kost & Näring | Gymdagboken</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">Kost & Näring</h1>
              <p className="text-sm text-muted-foreground">Idag</p>
            </div>
          </div>

          {/* Macro overview */}
          <div className="grid grid-cols-2 gap-3">
            {macroItems.map((item) => {
              const Icon = item.icon;
              const pct = item.target > 0 ? Math.min(100, (item.value / item.target) * 100) : 0;
              return (
                <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${item.color}`} />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                      </div>
                      <p className="text-lg font-bold">
                        {Math.round(item.value)}<span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                      </p>
                      <Progress value={pct} className="h-1.5 mt-1" />
                      <p className="text-xs text-muted-foreground mt-0.5 text-right">
                        av {item.target} {item.unit}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Add meal button */}
          <Button className="w-full" onClick={() => setShowAddMeal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Logga måltid
          </Button>

          {/* Meals list */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Dagens måltider</h2>
            {meals.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Apple className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Inga måltider loggade idag</p>
                </CardContent>
              </Card>
            ) : (
              meals.map((meal) => (
                <motion.div key={meal.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">{MEAL_TYPE_LABELS[meal.meal_type] || meal.meal_type}</p>
                          <p className="text-sm font-medium truncate">{meal.description}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            {meal.calories && <span>{meal.calories} kcal</span>}
                            {meal.protein_g && <span>P: {meal.protein_g}g</span>}
                            {meal.carbs_g && <span>K: {meal.carbs_g}g</span>}
                            {meal.fat_g && <span>F: {meal.fat_g}g</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteMeal(meal.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <MealLogDialog open={showAddMeal} onOpenChange={setShowAddMeal} onMealLogged={fetchTodayMeals} />
    </>
  );
}
