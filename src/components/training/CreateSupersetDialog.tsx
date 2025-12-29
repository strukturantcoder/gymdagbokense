import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Link2, Dumbbell } from 'lucide-react';

interface ExerciseLogEntry {
  exercise_name: string;
  sets_completed: number;
  superset_group_id?: string;
}

interface CreateSupersetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: ExerciseLogEntry[];
  currentExerciseIndex: number;
  onCreateSuperset: (exerciseIndices: number[]) => void;
}

export function CreateSupersetDialog({
  open,
  onOpenChange,
  exercises,
  currentExerciseIndex,
  onCreateSuperset
}: CreateSupersetDialogProps) {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Reset and pre-select current exercise when opening
  useEffect(() => {
    if (open) {
      setSelectedIndices([currentExerciseIndex]);
    }
  }, [open, currentExerciseIndex]);

  const toggleExercise = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleCreate = () => {
    if (selectedIndices.length >= 2) {
      onCreateSuperset(selectedIndices);
      onOpenChange(false);
    }
  };

  // Filter out exercises that are already in a superset (except current)
  const availableExercises = exercises.map((ex, idx) => ({
    exercise: ex,
    index: idx,
    isAvailable: !ex.superset_group_id || idx === currentExerciseIndex
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-primary" />
            Skapa superset
          </DialogTitle>
          <DialogDescription>
            Välj övningar som ska utföras i superset. Alla set i supersetet körs efter varandra utan vila.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {availableExercises.map(({ exercise, index, isAvailable }) => (
            <label
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                selectedIndices.includes(index)
                  ? 'border-primary bg-primary/5'
                  : isAvailable
                    ? 'border-border hover:border-primary/50'
                    : 'border-muted bg-muted/50 opacity-50 cursor-not-allowed'
              }`}
            >
              <Checkbox
                checked={selectedIndices.includes(index)}
                onCheckedChange={() => isAvailable && toggleExercise(index)}
                disabled={!isAvailable}
              />
              <div className="flex items-center gap-2 flex-1">
                <Dumbbell className="w-4 h-4 text-muted-foreground" />
                <span className={selectedIndices.includes(index) ? 'font-medium' : ''}>
                  {exercise.exercise_name}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {exercise.sets_completed} set
              </Badge>
              {!isAvailable && (
                <Badge variant="secondary" className="text-xs">
                  I superset
                </Badge>
              )}
            </label>
          ))}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={selectedIndices.length < 2}
          >
            <Link2 className="w-4 h-4 mr-2" />
            Skapa superset ({selectedIndices.length} övningar)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
