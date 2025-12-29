import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Link2, 
  Unlink,
  Timer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { SupersetExerciseCard } from './SupersetExerciseCard';

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

interface SupersetGroupProps {
  groupId: string;
  exercises: { exercise: ExerciseLogEntry; originalIndex: number }[];
  personalBests: Map<string, PersonalBest>;
  exerciseGoals: Map<string, ExerciseGoal>;
  onUpdateSetDetail: (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => void;
  onToggleSetComplete: (exerciseIndex: number, setIndex: number) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onUnlinkFromSuperset: (exerciseIndex: number) => void;
  onStartRestTimer?: () => void;
}

export function SupersetGroup({
  groupId,
  exercises,
  personalBests,
  exerciseGoals,
  onUpdateSetDetail,
  onToggleSetComplete,
  onAddSet,
  onRemoveSet,
  onUnlinkFromSuperset,
  onStartRestTimer
}: SupersetGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Check if all sets in all exercises are complete
  const allComplete = exercises.every(({ exercise }) => 
    exercise.set_details.every(s => s.completed)
  );
  
  // Calculate total completed sets across all exercises
  const totalSets = exercises.reduce((sum, { exercise }) => 
    sum + exercise.set_details.length, 0
  );
  const completedSets = exercises.reduce((sum, { exercise }) => 
    sum + exercise.set_details.filter(s => s.completed).length, 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <Card className={`border-2 ${allComplete ? 'border-green-500/50' : 'border-primary/30'}`}>
        <CardContent className="p-4 space-y-4">
          {/* Superset header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Superset</span>
              <Badge variant="secondary" className="text-xs">
                {exercises.length} övningar
              </Badge>
              <Badge variant="outline" className="text-xs">
                {completedSets}/{totalSets} set
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              {onStartRestTimer && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={onStartRestTimer}
                >
                  <Timer className="w-3 h-3" />
                  Vila
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3"
              >
                {exercises.map(({ exercise, originalIndex }, idx) => (
                  <div key={originalIndex} className="relative">
                    {/* Connection line between exercises */}
                    {idx < exercises.length - 1 && (
                      <div className="absolute left-1/2 -bottom-3 w-0.5 h-3 bg-primary/30" />
                    )}
                    
                    <SupersetExerciseCard
                      exercise={exercise}
                      exerciseIndex={originalIndex}
                      personalBest={personalBests.get(exercise.exercise_name)}
                      goal={exerciseGoals.get(exercise.exercise_name)}
                      onUpdateSetDetail={(setIdx, field, value) => 
                        onUpdateSetDetail(originalIndex, setIdx, field, value)
                      }
                      onToggleSetComplete={(setIdx) => 
                        onToggleSetComplete(originalIndex, setIdx)
                      }
                      onAddSet={() => onAddSet(originalIndex)}
                      onRemoveSet={(setIdx) => onRemoveSet(originalIndex, setIdx)}
                      isCompact
                    />
                    
                    {/* Unlink button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-background border shadow-sm hover:text-destructive"
                      onClick={() => onUnlinkFromSuperset(originalIndex)}
                      title="Ta bort från superset"
                    >
                      <Unlink className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Rest timer prompt when all complete */}
          {allComplete && onStartRestTimer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center"
            >
              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={onStartRestTimer}
              >
                <Timer className="w-4 h-4" />
                Starta vila (gemensam för supersetet)
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
