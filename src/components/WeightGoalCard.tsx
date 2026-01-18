import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Scale, Target, TrendingDown, Edit2, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface WeightGoal {
  id: string;
  target_value: number | null;
  current_value: number | null;
  description: string | null;
}

interface WeightLog {
  weight_kg: number;
  logged_at: string;
}

export default function WeightGoalCard() {
  const { user } = useAuth();
  const [weightGoal, setWeightGoal] = useState<WeightGoal | null>(null);
  const [startWeight, setStartWeight] = useState<number | null>(null);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [targetWeightInput, setTargetWeightInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch weight goal
    const { data: goalData } = await supabase
      .from('user_goals')
      .select('id, target_value, current_value, description')
      .eq('user_id', user.id)
      .eq('goal_type', 'weight')
      .eq('status', 'active')
      .maybeSingle();

    // Fetch first and latest weight logs
    const { data: weightLogs } = await supabase
      .from('weight_logs')
      .select('weight_kg, logged_at')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: true });

    if (weightLogs && weightLogs.length > 0) {
      setStartWeight(weightLogs[0].weight_kg);
      setCurrentWeight(weightLogs[weightLogs.length - 1].weight_kg);
    }

    if (goalData) {
      setWeightGoal(goalData);
      setTargetWeightInput(goalData.target_value?.toString() || '');
    }

    setIsLoading(false);
  };

  const handleSaveTargetWeight = async () => {
    if (!user) return;

    const targetWeight = parseFloat(targetWeightInput);
    if (isNaN(targetWeight) || targetWeight <= 0 || targetWeight > 500) {
      toast.error('Ange en giltig målvikt');
      return;
    }

    setSaving(true);

    try {
      if (weightGoal) {
        // Update existing goal - store target weight directly
        const { error } = await supabase
          .from('user_goals')
          .update({
            target_value: targetWeight,
            updated_at: new Date().toISOString(),
          })
          .eq('id', weightGoal.id);

        if (error) throw error;
      } else {
        // Create new weight goal with target weight
        const { error } = await supabase
          .from('user_goals')
          .insert({
            user_id: user.id,
            title: 'Viktmål',
            description: `Nå målvikten ${targetWeight} kg`,
            goal_type: 'weight',
            target_value: targetWeight,
            current_value: currentWeight ? startWeight! - currentWeight : 0,
            target_unit: 'kg',
            status: 'active',
          });

        if (error) throw error;
      }

      toast.success('Målvikt sparad!');
      setIsEditing(false);
      fetchData();
    } catch (error) {
      console.error('Error saving weight goal:', error);
      toast.error('Kunde inte spara målvikt');
    } finally {
      setSaving(false);
    }
  };

  const calculateProgress = (): number => {
    if (!startWeight || !currentWeight || !weightGoal?.target_value) return 0;
    
    const targetWeight = weightGoal.target_value;
    const totalToLose = startWeight - targetWeight;
    const actuallyLost = startWeight - currentWeight;
    
    if (totalToLose <= 0) return 100; // Already at or below target
    
    return Math.min(100, Math.max(0, Math.round((actuallyLost / totalToLose) * 100)));
  };

  const getRemainingWeight = (): number | null => {
    if (!currentWeight || !weightGoal?.target_value) return null;
    return Math.max(0, currentWeight - weightGoal.target_value);
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const progress = calculateProgress();
  const remaining = getRemainingWeight();
  const targetWeight = weightGoal?.target_value;

  return (
    <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Viktmål
          </div>
          {!isEditing && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="targetWeight">Målvikt (kg)</Label>
              <Input
                id="targetWeight"
                type="number"
                step="0.1"
                placeholder="t.ex. 75"
                value={targetWeightInput}
                onChange={(e) => setTargetWeightInput(e.target.value)}
                className="text-lg"
              />
              {currentWeight && (
                <p className="text-xs text-muted-foreground">
                  Din nuvarande vikt: {currentWeight.toFixed(1)} kg
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveTargetWeight} 
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Spara
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : targetWeight ? (
          <>
            {/* Progress display */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-bold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            {/* Weight stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-background/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Start</p>
                <p className="font-bold">{startWeight?.toFixed(1) || '-'}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <div className="bg-background/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Nu</p>
                <p className="font-bold text-primary">{currentWeight?.toFixed(1) || '-'}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <div className="bg-background/50 rounded-lg p-2">
                <p className="text-xs text-muted-foreground">Mål</p>
                <p className="font-bold text-green-500">{targetWeight.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
            </div>

            {/* Remaining info */}
            {remaining !== null && remaining > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm bg-background/50 rounded-lg p-3">
                <TrendingDown className="w-4 h-4 text-blue-500" />
                <span>
                  <span className="font-bold">{remaining.toFixed(1)} kg</span> kvar till målet
                </span>
              </div>
            )}
            
            {remaining !== null && remaining <= 0 && (
              <div className="flex items-center justify-center gap-2 text-sm bg-green-500/10 text-green-500 rounded-lg p-3">
                <Check className="w-4 h-4" />
                <span className="font-bold">🎉 Grattis! Du har nått din målvikt!</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <Scale className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Sätt en målvikt för att spåra din progress
            </p>
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Target className="w-4 h-4 mr-2" />
              Sätt målvikt
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
