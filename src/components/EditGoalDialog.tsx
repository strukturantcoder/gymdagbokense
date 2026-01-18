import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Target, Loader2, Trash2, Bell, Check } from 'lucide-react';

interface UserGoal {
  id: string;
  title: string;
  description: string | null;
  goal_type: string;
  target_value: number | null;
  target_unit: string | null;
  current_value: number | null;
  target_date: string | null;
  status: string;
  reminder_enabled?: boolean;
  reminder_frequency?: string;
}

interface EditGoalDialogProps {
  goal: UserGoal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export default function EditGoalDialog({ goal, open, onOpenChange, onSave }: EditGoalDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState('weekly');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (goal) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setTargetValue(goal.target_value?.toString() || '');
      setTargetUnit(goal.target_unit || '');
      setCurrentValue(goal.current_value?.toString() || '');
      setTargetDate(goal.target_date?.split('T')[0] || '');
      setReminderEnabled(goal.reminder_enabled || false);
      setReminderFrequency(goal.reminder_frequency || 'weekly');
    }
  }, [goal]);

  const handleSave = async () => {
    if (!user || !goal) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_goals')
        .update({
          title,
          description: description || null,
          target_value: targetValue ? parseFloat(targetValue) : null,
          target_unit: targetUnit || null,
          current_value: currentValue ? parseFloat(currentValue) : null,
          target_date: targetDate || null,
          reminder_enabled: reminderEnabled,
          reminder_frequency: reminderFrequency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goal.id);

      if (error) throw error;

      toast.success('Mål uppdaterat!');
      onOpenChange(false);
      onSave?.();
    } catch (error) {
      console.error('Error updating goal:', error);
      toast.error('Kunde inte uppdatera mål');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!user || !goal) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_goals')
        .update({
          status: 'completed',
          current_value: goal.target_value,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goal.id);

      if (error) throw error;

      toast.success('🎉 Grattis! Mål uppnått!');
      onOpenChange(false);
      onSave?.();
    } catch (error) {
      console.error('Error completing goal:', error);
      toast.error('Kunde inte markera mål som klart');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !goal) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('user_goals')
        .update({ status: 'abandoned', updated_at: new Date().toISOString() })
        .eq('id', goal.id);

      if (error) throw error;

      toast.success('Mål borttaget');
      onOpenChange(false);
      onSave?.();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Kunde inte ta bort mål');
    } finally {
      setDeleting(false);
    }
  };

  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Redigera mål
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currentValue">Nuvarande värde</Label>
              <Input
                id="currentValue"
                type="number"
                step="0.1"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetValue">Målvärde</Label>
              <Input
                id="targetValue"
                type="number"
                step="0.1"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetUnit">Enhet</Label>
              <Input
                id="targetUnit"
                placeholder="kg, pass, km..."
                value={targetUnit}
                onChange={(e) => setTargetUnit(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetDate">Måldatum</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {/* Reminder settings */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="reminder">Påminnelser</Label>
              </div>
              <Switch
                id="reminder"
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
              />
            </div>

            {reminderEnabled && (
              <div className="space-y-2">
                <Label htmlFor="frequency">Frekvens</Label>
                <Select value={reminderFrequency} onValueChange={setReminderFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Dagligen</SelectItem>
                    <SelectItem value="weekly">Varje vecka</SelectItem>
                    <SelectItem value="biweekly">Varannan vecka</SelectItem>
                    <SelectItem value="monthly">Varje månad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleMarkComplete}
              disabled={saving}
            >
              <Check className="w-4 h-4 mr-2" />
              Markera som klart
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving || !title}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              'Spara ändringar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
