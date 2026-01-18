import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Scale, Loader2 } from 'lucide-react';

interface WeightLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function WeightLogDialog({ open, onOpenChange, onSuccess }: WeightLogDialogProps) {
  const { user } = useAuth();
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !weight) {
      toast.error('Ange din vikt');
      return;
    }

    const weightNum = parseFloat(weight.replace(',', '.'));
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
      toast.error('Ange en giltig vikt');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('weight_logs')
        .insert({
          user_id: user.id,
          weight_kg: weightNum,
          notes: notes || null,
        });

      if (error) throw error;

      // Update any weight goals
      await updateWeightGoals(weightNum);

      toast.success('Vikt loggad!');
      setWeight('');
      setNotes('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error logging weight:', error);
      toast.error('Kunde inte logga vikt');
    } finally {
      setSaving(false);
    }
  };

  const updateWeightGoals = async (currentWeight: number) => {
    if (!user) return;

    // Get active weight goals
    const { data: goals } = await supabase
      .from('user_goals')
      .select('id, target_value')
      .eq('user_id', user.id)
      .eq('goal_type', 'weight')
      .eq('status', 'active');

    if (!goals?.length) return;

    // Update current_value for weight goals
    for (const goal of goals) {
      await supabase
        .from('user_goals')
        .update({ current_value: currentWeight, updated_at: new Date().toISOString() })
        .eq('id', goal.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-500" />
            Logga vikt
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weight">Vikt (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              placeholder="75.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="text-2xl font-bold text-center"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anteckningar (valfritt)</Label>
            <Textarea
              id="notes"
              placeholder="T.ex. 'Efter frukost', 'Morgonvikt'..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving || !weight}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              <>
                <Scale className="w-4 h-4 mr-2" />
                Spara vikt
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
