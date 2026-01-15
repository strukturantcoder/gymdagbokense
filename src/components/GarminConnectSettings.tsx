import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Link2, Unlink, Loader2, Clock, Activity, Flame, Heart, Settings2, CheckCircle2, XCircle } from "lucide-react";
import { useGarminConnect } from "@/hooks/useGarminConnect";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

// Garmin logo component per brand guidelines
const GarminLogo = ({ className = "h-6" }: { className?: string }) => (
  <img src="/logo-garmin-256.png" alt="Garmin" className={className} style={{ height: "auto" }} />
);

const GARMIN_PENDING_KEY = "garmin_oauth_pending";

interface TestResult {
  ok: boolean;
  message: string;
}

interface TestResults {
  credentials?: TestResult;
  supabase?: TestResult;
  auth?: TestResult;
  tempSession?: TestResult;
  connection?: TestResult;
}

export function GarminConnectSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const hasHandledCallback = useRef(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);

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

  const testConnection = async () => {
    if (!session?.access_token) {
      toast({ title: "Ej inloggad", variant: "destructive" });
      return;
    }
    setIsTesting(true);
    setTestResults(null);
    try {
      const response = await supabase.functions.invoke("garmin-test-config", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (response.error) throw new Error(response.error.message);
      setTestResults(response.data.results as TestResults);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Okänt fel";
      toast({ title: "Testfel", description: msg, variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  // Handle OAuth2 callback (code + state) robustly (wait for auth session)
  useEffect(() => {
    const isCallback = searchParams.get("garmin_callback");
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!isCallback || !code || !state) return;

    // Persist params so we can retry if auth session isn't ready yet
    try {
      sessionStorage.setItem(GARMIN_PENDING_KEY, JSON.stringify({ code, state }));
    } catch {
      // ignore
    }

    // Wait until auth is loaded and we have a session
    if (authLoading) return;

    if (!session?.access_token) {
      toast({
        title: "Ej inloggad",
        description: "Logga in igen och försök koppla Garmin på nytt.",
        variant: "destructive",
      });
      return;
    }

    if (hasHandledCallback.current) return;
    hasHandledCallback.current = true;

    completeConnect(code, state).then((ok) => {
      if (!ok) {
        // allow retry after a short delay if needed
        hasHandledCallback.current = false;
        return;
      }

      // Success -> clean up URL + stored pending data
      try {
        sessionStorage.removeItem(GARMIN_PENDING_KEY);
      } catch {
        // ignore
      }

      searchParams.delete("garmin_callback");
      searchParams.delete("code");
      searchParams.delete("state");
      setSearchParams(searchParams, { replace: true });
    });
  }, [authLoading, session?.access_token, searchParams, completeConnect, setSearchParams, toast]);

  // If we have stored pending OAuth params, retry once auth session is ready
  useEffect(() => {
    if (authLoading || !session?.access_token) return;
    if (hasHandledCallback.current) return;

    try {
      const raw = sessionStorage.getItem(GARMIN_PENDING_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { code?: string; state?: string };
      if (!parsed.code || !parsed.state) return;

      hasHandledCallback.current = true;
      completeConnect(parsed.code, parsed.state).then((ok) => {
        if (ok) {
          sessionStorage.removeItem(GARMIN_PENDING_KEY);
          searchParams.delete("garmin_callback");
          searchParams.delete("code");
          searchParams.delete("state");
          setSearchParams(searchParams, { replace: true });
        } else {
          hasHandledCallback.current = false;
        }
      });
    } catch {
      // ignore
    }
  }, [authLoading, session?.access_token, completeConnect, searchParams, setSearchParams]);

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
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={startConnect} disabled={isConnecting} className="w-full sm:w-auto">
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                Anslut med Garmin Connect™
              </Button>
              <Button variant="ghost" size="sm" onClick={testConnection} disabled={isTesting}>
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Settings2 className="h-4 w-4 mr-1" />}
                Testa konfiguration
              </Button>
            </div>
          </div>
        )}

        {/* Test Results Panel */}
        {testResults && (
          <div className="mt-4 p-3 rounded-lg border bg-muted/30 space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Konfigurationstest
            </h4>
            {Object.entries(testResults).map(([key, result]) => (
              <div key={key} className="flex items-start gap-2 text-xs">
                {result.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-medium capitalize">{key}: </span>
                  <span className="text-muted-foreground">{result.message}</span>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTestResults(null)}>
              Stäng
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
