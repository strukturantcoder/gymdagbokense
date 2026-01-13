import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useGarminConnect } from "@/hooks/useGarminConnect";

export default function GarminCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeConnect, isConnecting } = useGarminConnect();

  const code = searchParams.get("code") ?? "";
  const state = searchParams.get("state") ?? "";
  const error = searchParams.get("error") ?? "";
  const errorDescription = searchParams.get("error_description") ?? "";

  const readableError = useMemo(() => {
    if (!error) return "";
    return errorDescription ? `${error}: ${errorDescription}` : error;
  }, [error, errorDescription]);

  const [status, setStatus] = useState<"idle" | "working" | "success" | "failed">("idle");
  const [details, setDetails] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (readableError) {
        setStatus("failed");
        setDetails(readableError);
        return;
      }

      if (!code || !state) {
        setStatus("failed");
        setDetails("Saknar 'code' eller 'state' i callback-URL:en.");
        return;
      }

      setStatus("working");
      const ok = await completeConnect(code, state);
      if (cancelled) return;

      if (ok) {
        setStatus("success");
        // Ta bort code/state från URL och skicka tillbaka användaren
        navigate("/account", { replace: true });
      } else {
        setStatus("failed");
        setDetails("Kunde inte slutföra Garmin-anslutningen. Försök igen.");
      }
    };

    // kör en gång
    if (status === "idle") run();

    return () => {
      cancelled = true;
    };
  }, [code, state, readableError, completeConnect, navigate, status]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Garmin Connect™</CardTitle>
          <CardDescription>Slutför anslutningen…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "working" || isConnecting ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifierar och kopplar ditt konto.
            </div>
          ) : null}

          {status === "failed" ? (
            <div className="space-y-3">
              <p className="text-sm">Anslutningen misslyckades.</p>
              {details ? <p className="text-xs text-muted-foreground break-words">{details}</p> : null}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate("/account", { replace: true })}>
                  Tillbaka
                </Button>
              </div>
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Du kan stänga denna sida när anslutningen är klar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
