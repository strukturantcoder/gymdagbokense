import { WifiOff, RefreshCw, Cloud } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncPendingLogs } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={cn(
      "fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all",
      isOnline 
        ? "bg-primary text-primary-foreground" 
        : "bg-destructive text-destructive-foreground"
    )}>
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline</span>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {pendingCount} väntande
            </Badge>
          )}
        </>
      ) : pendingCount > 0 ? (
        <>
          <Cloud className="h-4 w-4" />
          <span className="text-sm font-medium">
            {pendingCount} att synka
          </span>
          <Button
            size="sm"
            variant="secondary"
            className="h-6 px-2"
            onClick={() => syncPendingLogs()}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
          </Button>
        </>
      ) : null}
    </div>
  );
}
