import { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, Copy, RotateCcw } from 'lucide-react';

interface SetDetail {
  reps: number;
  weight: number;
}

interface SwipeableSetRowProps {
  setIndex: number;
  setDetail: SetDetail;
  prevSet: SetDetail | null;
  isCompleted: boolean;
  onUpdateReps: (value: number) => void;
  onUpdateWeight: (value: number) => void;
  onToggleComplete: () => void;
}

export default function SwipeableSetRow({
  setIndex,
  setDetail,
  prevSet,
  isCompleted,
  onUpdateReps,
  onUpdateWeight,
  onToggleComplete,
}: SwipeableSetRowProps) {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const background = useTransform(
    x,
    [-100, 0, 100],
    [
      'hsl(var(--muted))',
      'hsl(var(--background) / 0.5)',
      'hsl(142 76% 36% / 0.3)'
    ]
  );
  
  const leftIconOpacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);
  const rightIconOpacity = useTransform(x, [0, 50, 100], [0, 0.5, 1]);

  const canCopyWeight = prevSet && prevSet.weight > 0 && setDetail.weight !== prevSet.weight;
  const canCopyReps = prevSet && prevSet.reps > 0 && setDetail.reps !== prevSet.reps;

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false);
    const threshold = 80;
    
    if (info.offset.x > threshold && !isCompleted) {
      onToggleComplete();
    } else if (info.offset.x < -threshold && isCompleted) {
      onToggleComplete();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-md">
      {/* Background indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
        <motion.div style={{ opacity: leftIconOpacity }} className="flex items-center gap-2 text-muted-foreground">
          <RotateCcw className="w-4 h-4" />
          <span className="text-xs">Ångra</span>
        </motion.div>
        <motion.div style={{ opacity: rightIconOpacity }} className="flex items-center gap-2 text-green-600">
          <span className="text-xs">Klar</span>
          <Check className="w-4 h-4" />
        </motion.div>
      </div>
      
      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x, background }}
        className={`flex items-center gap-2 p-2 rounded-md relative z-10 touch-pan-y ${
          isCompleted ? 'border border-green-500/50' : ''
        }`}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          {isCompleted && (
            <Check className="w-3.5 h-3.5 text-green-500" />
          )}
          <span className={`text-xs font-medium w-8 ${isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
            Set {setIndex + 1}
          </span>
        </div>
        
        <div className="flex-1 flex items-center gap-2">
          <div className="flex items-center gap-1 flex-1">
            <Input
              type="number"
              value={setDetail.reps === 0 ? '' : setDetail.reps}
              onChange={(e) => {
                e.stopPropagation();
                onUpdateReps(e.target.value === '' ? 0 : parseInt(e.target.value));
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className={`h-8 text-center ${isCompleted ? 'bg-green-500/10 border-green-500/30' : ''}`}
              placeholder="0"
              disabled={isDragging}
            />
            <span className="text-xs text-muted-foreground shrink-0">reps</span>
            {canCopyReps && !isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateReps(prevSet.reps);
                }}
                title={`Kopiera ${prevSet.reps} reps`}
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1 flex-1">
            <Input
              type="number"
              step="0.5"
              value={setDetail.weight === 0 ? '' : setDetail.weight}
              onChange={(e) => {
                e.stopPropagation();
                onUpdateWeight(e.target.value === '' ? 0 : parseFloat(e.target.value));
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className={`h-8 text-center ${isCompleted ? 'bg-green-500/10 border-green-500/30' : ''}`}
              placeholder="0"
              disabled={isDragging}
            />
            <span className="text-xs text-muted-foreground shrink-0">kg</span>
            {canCopyWeight && !isCompleted && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateWeight(prevSet.weight);
                }}
                title={`Kopiera ${prevSet.weight} kg`}
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
