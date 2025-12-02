import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { X, GripVertical } from 'lucide-react';
import ExerciseInfo from '@/components/ExerciseInfo';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
}

interface SortableExerciseProps {
  id: string;
  exercise: Exercise;
  isEditing: boolean;
  onRemove: () => void;
}

const SortableExercise = ({ id, exercise, isEditing, onRemove }: SortableExerciseProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-secondary/50 rounded-lg p-3 flex items-center justify-between ${
        isDragging ? 'ring-2 ring-primary' : ''
      }`}
    >
      {isEditing && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 mr-2 text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      <div className="flex-1">
        <ExerciseInfo exerciseName={exercise.name}>
          <p className="font-medium">{exercise.name}</p>
        </ExerciseInfo>
        {exercise.notes && (
          <p className="text-xs text-muted-foreground">{exercise.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-sm">
          <p className="text-foreground">{exercise.sets} x {exercise.reps}</p>
          <p className="text-muted-foreground">Vila: {exercise.rest}</p>
        </div>
        {isEditing && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default SortableExercise;
