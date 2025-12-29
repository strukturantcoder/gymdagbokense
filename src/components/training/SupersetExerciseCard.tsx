import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Check, 
  Weight, 
  Repeat, 
  X, 
  Trophy,
  Target,
  Sparkles
} from 'lucide-react';

interface SetDetail {
  reps: number;
  weight: number;
  completed?: boolean;
}

interface ExerciseLogEntry {
  exercise_name: string;
  sets_completed: number;
  reps_completed: string;
  weight_kg: string;
  notes: string;
  set_details: SetDetail[];
  programSets?: number;
  programReps?: string;
  superset_group_id?: string;
}

interface PersonalBest {
  exercise_name: string;
  best_weight_kg: number;
  best_reps: number | null;
}

interface ExerciseGoal {
  exercise_name: string;
  target_weight_kg: number | null;
  target_reps: number | null;
}

interface SupersetExerciseCardProps {
  exercise: ExerciseLogEntry;
  exerciseIndex: number;
  personalBest?: PersonalBest;
  goal?: ExerciseGoal;
  onUpdateSetDetail: (setIndex: number, field: 'reps' | 'weight', value: number) => void;
  onToggleSetComplete: (setIndex: number) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  isCompact?: boolean;
}

export function SupersetExerciseCard({
  exercise,
  exerciseIndex,
  personalBest,
  goal,
  onUpdateSetDetail,
  onToggleSetComplete,
  onAddSet,
  onRemoveSet,
  isCompact = false
}: SupersetExerciseCardProps) {
  const completedSets = exercise.set_details.filter(s => s.completed).length;
  const maxWeight = Math.max(...exercise.set_details.map(s => s.weight || 0), 0);
  const isNewPB = personalBest && maxWeight > personalBest.best_weight_kg;
  const isGoalReached = goal?.target_weight_kg && maxWeight >= goal.target_weight_kg;

  return (
    <div className={`bg-secondary/30 rounded-lg ${isCompact ? 'p-3' : 'p-4'} space-y-3`}>
      {/* Exercise header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`font-medium ${isCompact ? 'text-sm' : ''}`}>
            {exercise.exercise_name}
          </span>
          <Badge variant="outline" className="text-xs">
            {completedSets}/{exercise.set_details.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {personalBest && (
            <Badge variant="secondary" className="text-xs">
              <Trophy className="w-3 h-3 mr-1 text-gym-orange" />
              {personalBest.best_weight_kg}kg
            </Badge>
          )}
          {goal?.target_weight_kg && (
            <Badge variant="secondary" className="text-xs">
              <Target className="w-3 h-3 mr-1 text-green-500" />
              {goal.target_weight_kg}kg
            </Badge>
          )}
        </div>
      </div>

      {/* PB/Goal indicators */}
      {isNewPB && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center gap-1 text-gym-orange font-bold text-sm"
        >
          <Sparkles className="w-3 h-3" />
          NYTT PB!
        </motion.div>
      )}
      {isGoalReached && !isNewPB && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center gap-1 text-green-500 font-bold text-sm"
        >
          <Trophy className="w-3 h-3" />
          MÅL UPPNÅTT!
        </motion.div>
      )}

      {/* Sets */}
      <div className="space-y-2">
        {exercise.set_details.map((set, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
              set.completed 
                ? 'bg-green-500/10 border border-green-500/30' 
                : 'bg-background/50'
            }`}
          >
            <Button
              variant={set.completed ? "default" : "outline"}
              size="icon"
              className={`h-7 w-7 shrink-0 ${set.completed ? 'bg-green-500 hover:bg-green-600' : ''}`}
              onClick={() => onToggleSetComplete(idx)}
            >
              {set.completed ? <Check className="h-3 w-3" /> : <span className="text-xs">{idx + 1}</span>}
            </Button>

            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="relative">
                <Weight className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  type="number"
                  value={set.weight === 0 ? '' : set.weight || ''}
                  onChange={(e) => onUpdateSetDetail(idx, 'weight', parseFloat(e.target.value) || 0)}
                  className="h-8 pl-7 text-center font-mono text-sm"
                  step="0.5"
                  min="0"
                  placeholder="kg"
                />
              </div>
              <div className="relative">
                <Repeat className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  type="number"
                  value={set.reps || ''}
                  onChange={(e) => onUpdateSetDetail(idx, 'reps', parseInt(e.target.value) || 0)}
                  className="h-8 pl-7 text-center font-mono text-sm"
                  placeholder="reps"
                />
              </div>
            </div>

            {exercise.set_details.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onRemoveSet(idx)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </motion.div>
        ))}
      </div>

      <Button 
        variant="outline" 
        size="sm" 
        className="w-full h-7 text-xs"
        onClick={onAddSet}
      >
        + Lägg till set
      </Button>
    </div>
  );
}
