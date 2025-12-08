import { Skeleton } from '@/components/ui/skeleton';
import { Weight } from 'lucide-react';

const ExerciseListSkeleton = () => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <span className="text-xs text-muted-foreground flex items-center gap-1 animate-pulse">
            <Weight className="w-3 h-3" />
            Hämtar senaste vikter...
          </span>
        </div>
        <Skeleton className="h-3 w-20" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-lg bg-secondary/30 border border-border/50 p-3"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-8" />
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-10" />
                <span className="text-[10px] text-muted-foreground">kg</span>
              </div>
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExerciseListSkeleton;
