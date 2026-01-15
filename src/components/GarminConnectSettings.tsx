import { useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RefreshCw, Link2, Unlink, Loader2, Clock, Activity, Flame, Heart } from "lucide-react";
import { useGarminConnect } from "@/hooks/useGarminConnect";
import { format, formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";

// Garmin logo component per brand guidelines
const GarminLogo = ({ className = "h-6" }: { className?: string }) => (
  <img 
    src="/logo-garmin-256.png" 
    alt="Garmin" 
    className={className}
    style={{ height: 'auto' }}
  />
);

export function GarminConnectSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const hasHandledCallback = useRef(false);
  const {
    connection,
    activities,
    isLoading,
    isConnecting,
    isSyncing,
    isConnected,
    startConnect,
    completeConnect,
    syncActivities,
    disconnect,
  } = useGarminConnect();

  // Handle OAuth2 callback (code + state) - only once
  useEffect(() => {
    const isCallback = searchParams.get("garmin_callback");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (isCallback && code && state && !hasHandledCallback.current) {
      hasHandledCallback.current = true;
      
      completeConnect(code, state).finally(() => {
        // Clean up URL params
        searchParams.delete("garmin_callback");
        searchParams.delete("code");
        searchParams.delete("state");
        setSearchParams(searchParams, { replace: true });
      });
    }
  }, [searchParams, completeConnect, setSearchParams]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters: number | null) => {
    if (!meters) return "-";
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Garmin Connect™</CardTitle>
            <CardDescription>
              Synkronisera träningsdata från din Garmin®-enhet
            </CardDescription>
          </div>
          {isConnected && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
              Kopplat
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            {/* Connection Info */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {connection?.display_name || "Garmin-konto"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Kopplat {connection?.connected_at && formatDistanceToNow(new Date(connection.connected_at), { addSuffix: true, locale: sv })}
                </p>
                {connection?.last_sync_at && (
                  <p className="text-xs text-muted-foreground">
                    Senast synkad {formatDistanceToNow(new Date(connection.last_sync_at), { addSuffix: true, locale: sv })}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncActivities()}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-2 hidden sm:inline">Synka</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Koppla bort Garmin?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Detta kommer att koppla bort ditt Garmin-konto. Du kan välja att behålla eller ta bort synkroniserade aktiviteter.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => disconnect(false)}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      >
                        Behåll aktiviteter
                      </AlertDialogAction>
                      <AlertDialogAction
                        onClick={() => disconnect(true)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
                      >
                        Ta bort allt
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Recent Activities */}
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Senaste aktiviteter</h4>
              {activities.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activities.slice(0, 5).map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {activity.activity_name || activity.activity_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.start_time), "d MMM yyyy, HH:mm", { locale: sv })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {activity.duration_seconds && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(activity.duration_seconds)}
                          </div>
                        )}
                        {activity.distance_meters && (
                          <div className="hidden sm:flex items-center gap-1">
                            {formatDistance(activity.distance_meters)}
                          </div>
                        )}
                        {activity.calories && (
                          <div className="hidden md:flex items-center gap-1">
                            <Flame className="h-3 w-3" />
                            {activity.calories}
                          </div>
                        )}
                        {activity.average_heart_rate && (
                          <div className="hidden md:flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {activity.average_heart_rate}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Inga aktiviteter hittades</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Synkronisera aktiviteter från din Garmin-enhet eller vänta på att nya aktiviteter registreras.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Synkronisera dina träningspass automatiskt från Garmin.
            </p>
            <Button variant="outline" onClick={startConnect} disabled={isConnecting} className="w-full sm:w-auto">
              {isConnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Anslut med Garmin Connect™
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
