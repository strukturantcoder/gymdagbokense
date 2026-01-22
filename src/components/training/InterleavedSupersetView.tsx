import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Link2, 
  Dumbbell,
  Weight,
  Repeat,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trophy
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

interface InterleavedSupersetViewProps {
  exercises: { exercise: ExerciseLogEntry; originalIndex: number }[];
  personalBests: Map<string, PersonalBest>;
  exerciseGoals: Map<string, ExerciseGoal>;
  onUpdateSetDetail: (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => void;
  onToggleSetComplete: (exerciseIndex: number, setIndex: number) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
}

export function InterleavedSupersetView({
  exercises,
  personalBests,
  exerciseGoals,
  onUpdateSetDetail,
  onToggleSetComplete,
  onAddSet,
  onRemoveSet
}: InterleavedSupersetViewProps) {
  // Determine max number of sets across all exercises
  const maxSets = Math.max(...exercises.map(({ exercise }) => exercise.set_details.length));
  
  // Calculate total progress
  const totalSets = exercises.reduce((sum, { exercise }) => sum + exercise.set_details.length, 0);
  const completedSets = exercises.reduce((sum, { exercise }) => 
    sum + exercise.set_details.filter(s => s.completed).length, 0);
  const allComplete = completedSets === totalSets && totalSets > 0;

  // Build interleaved rounds
  const rounds: Array<{
    roundNumber: number;
    sets: Array<{
      exercise: ExerciseLogEntry;
      originalIndex: number;
      setIndex: number;
      set: SetDetail;
      isNewPB: boolean;
      isGoalReached: boolean;
    } | null>;
  }> = [];

  for (let setIdx = 0; setIdx < maxSets; setIdx++) {
    const roundSets = exercises.map(({ exercise, originalIndex }) => {
      if (setIdx >= exercise.set_details.length) return null;
      
      const set = exercise.set_details[setIdx];
      const pb = personalBests.get(exercise.exercise_name);
      const goal = exerciseGoals.get(exercise.exercise_name);
      const currentMaxWeight = Math.max(...exercise.set_details.map(s => s.weight), 0);
      const isNewPB = pb ? currentMaxWeight > pb.best_weight_kg : false;
      const isGoalReached = goal?.target_weight_kg ? currentMaxWeight >= goal.target_weight_kg : false;
      
      return {
        exercise,
        originalIndex,
        setIndex: setIdx,
        set,
        isNewPB,
        isGoalReached
      };
    });
    
    rounds.push({
      roundNumber: setIdx + 1,
      sets: roundSets
    });
  }

  return (
    <div className="space-y-4">
      {/* Superset header */}
      <Card className={`border-2 ${allComplete ? 'border-green-500/50' : 'border-primary/30'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              <span className="font-bold text-base">Superset</span>
              <Badge variant="secondary" className="text-xs">
                {exercises.length} övningar
              </Badge>
            </div>
            <Badge variant={allComplete ? "default" : "outline"} className={`text-sm ${allComplete ? 'bg-green-500' : ''}`}>
              {completedSets}/{totalSets} set
            </Badge>
          </div>
          
          {/* Exercise names */}
          <div className="flex flex-wrap gap-2">
            {exercises.map(({ exercise, originalIndex }) => (
              <Badge 
                key={originalIndex} 
                variant="outline"
                className="text-sm px-3 py-1"
              >
                <Dumbbell className="w-3 h-3 mr-1" />
                {exercise.exercise_name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interleaved rounds */}
      {rounds.map((round, roundIdx) => (
        <motion.div
          key={round.roundNumber}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: roundIdx * 0.05 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Round header */}
              <div className="bg-muted/50 px-4 py-2 border-b">
                <span className="text-sm font-medium text-muted-foreground">
                  Runda {round.roundNumber}
                </span>
              </div>
              
              {/* Sets in this round */}
              <div className="divide-y">
                {round.sets.map((setData, idx) => {
                  if (!setData) return null;
                  
                  const { exercise, originalIndex, setIndex, set, isNewPB, isGoalReached } = setData;
                  
                  return (
                    <div 
                      key={`${originalIndex}-${setIndex}`}
                      className={`p-3 transition-colors ${
                        set.completed 
                          ? 'bg-green-500/10' 
                          : 'bg-background'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Complete button */}
                        <Button
                          variant={set.completed ? "default" : "outline"}
                          size="icon"
                          className={`h-10 w-10 shrink-0 ${set.completed ? 'bg-green-500 hover:bg-green-600' : ''}`}
                          onClick={() => onToggleSetComplete(originalIndex, setIndex)}
                        >
                          {set.completed ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <span className="text-sm font-bold">{setIndex + 1}</span>
                          )}
                        </Button>
                        
                        {/* Exercise name */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {exercise.exercise_name}
                            </span>
                            {isNewPB && (
                              <Sparkles className="w-4 h-4 text-gym-orange shrink-0" />
                            )}
                            {isGoalReached && !isNewPB && (
                              <Trophy className="w-4 h-4 text-green-500 shrink-0" />
                            )}
                          </div>
                        </div>
                        
                        {/* Weight input */}
                        <div className="w-20">
                          <Input
                            type="number"
                            value={set.weight === 0 ? '' : set.weight}
                            onChange={(e) => onUpdateSetDetail(originalIndex, setIndex, 'weight', parseFloat(e.target.value) || 0)}
                            className="h-10 text-center font-mono"
                            step="0.5"
                            min="0"
                            placeholder="kg"
                          />
                        </div>
                        
                        {/* Reps input */}
                        <div className="w-16">
                          <Input
                            type="number"
                            value={set.reps || ''}
                            onChange={(e) => onUpdateSetDetail(originalIndex, setIndex, 'reps', parseInt(e.target.value) || 0)}
                            className="h-10 text-center font-mono"
                            placeholder="reps"
                          />
                        </div>
                        
                        {/* Remove button */}
                        {exercise.set_details.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => onRemoveSet(originalIndex, setIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
      
      {/* Add set buttons */}
      <div className="flex flex-wrap gap-2 justify-center">
        {exercises.map(({ exercise, originalIndex }) => (
          <Button
            key={originalIndex}
            variant="outline"
            size="sm"
            onClick={() => onAddSet(originalIndex)}
            className="text-xs"
          >
            + Set: {exercise.exercise_name}
          </Button>
        ))}
      </div>
    </div>
  );
}
