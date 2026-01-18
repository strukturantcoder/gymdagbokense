import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Scale, Edit2, Trash2, Check, X, Loader2, ListOrdered } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'sonner';

interface WeightLog {
  id: string;
  weight_kg: number;
  logged_at: string;
  notes: string | null;
}

interface WeightLogsListProps {
  onDataChange?: () => void;
}

export default function WeightLogsList({ onDataChange }: WeightLogsListProps) {
  const { user } = useAuth();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingLog, setEditingLog] = useState<WeightLog | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteLog, setDeleteLog] = useState<WeightLog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWeightLogs();
    }
  }, [user]);

  const fetchWeightLogs = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false });

    if (!error && data) {
      setWeightLogs(data);
    }
    setIsLoading(false);
  };

  const handleEditClick = (log: WeightLog) => {
    setEditingLog(log);
    setEditWeight(log.weight_kg.toString());
    setEditNotes(log.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editingLog) return;

    const weightNum = parseFloat(editWeight.replace(',', '.'));
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
      toast.error('Ange en giltig vikt');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('weight_logs')
        .update({
          weight_kg: weightNum,
          notes: editNotes || null,
        })
        .eq('id', editingLog.id);

      if (error) throw error;

      toast.success('Vikt uppdaterad!');
      setEditingLog(null);
      fetchWeightLogs();
      onDataChange?.();
    } catch (error) {
      console.error('Error updating weight:', error);
      toast.error('Kunde inte uppdatera vikt');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteLog) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('weight_logs')
        .delete()
        .eq('id', deleteLog.id);

      if (error) throw error;

      toast.success('Viktlogg raderad');
      setDeleteLog(null);
      fetchWeightLogs();
      onDataChange?.();
    } catch (error) {
      console.error('Error deleting weight:', error);
      toast.error('Kunde inte radera viktlogg');
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (weightLogs.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-muted-foreground">
          <Scale className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Ingen viktdata än</p>
        </CardContent>
      </Card>
    );
  }

  const displayedLogs = showAll ? weightLogs : weightLogs.slice(0, 5);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListOrdered className="w-5 h-5" />
            Viktloggar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {displayedLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{log.weight_kg.toFixed(1)} kg</span>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(log.logged_at), 'd MMM yyyy', { locale: sv })}
                  </span>
                </div>
                {log.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEditClick(log)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => setDeleteLog(log)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {weightLogs.length > 5 && (
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Visa färre' : `Visa alla (${weightLogs.length})`}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingLog} onOpenChange={(open) => !open && setEditingLog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              Redigera vikt
            </DialogTitle>
            <DialogDescription>
              {editingLog && format(parseISO(editingLog.logged_at), 'd MMMM yyyy', { locale: sv })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Vikt (kg)</label>
              <Input
                type="number"
                step="0.1"
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value)}
                className="text-xl font-bold text-center"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Anteckningar</label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Valfritt..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Spara
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingLog(null)}
                disabled={saving}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLog} onOpenChange={(open) => !open && setDeleteLog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera viktlogg?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill radera viktloggen från{' '}
              {deleteLog && format(parseISO(deleteLog.logged_at), 'd MMMM yyyy', { locale: sv })}?
              <br />
              <span className="font-bold">{deleteLog?.weight_kg.toFixed(1)} kg</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Radera'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
