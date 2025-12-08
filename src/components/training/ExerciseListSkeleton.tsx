import { Skeleton } from '@/components/ui/skeleton';

const ExerciseListSkeleton = () => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-lg bg-secondary/30 border border-border/50 p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ExerciseListSkeleton;
