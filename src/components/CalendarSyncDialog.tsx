import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Calendar, Download, Link2, Copy, Check, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface CalendarSyncDialogProps {
  trigger?: React.ReactNode;
}

export default function CalendarSyncDialog({ trigger }: CalendarSyncDialogProps) {
  const { user, session } = useAuth();
  const [includeStrength, setIncludeStrength] = useState(true);
  const [includeCardio, setIncludeCardio] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-export`;
  
  const getCalendarUrl = (format: "download" | "subscribe") => {
    const params = new URLSearchParams({
      strength: includeStrength.toString(),
      cardio: includeCardio.toString(),
      format,
    });
    return `${baseUrl}?${params.toString()}`;
  };

  const subscriptionUrl = getCalendarUrl("subscribe");

  const handleDownload = async () => {
    if (!user || !session) {
      toast.error("Du måste vara inloggad");
      return;
    }

    setIsDownloading(true);
    try {
      // Use authenticated request with session token
      const response = await fetch(getCalendarUrl("download"), {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Kunde inte generera kalender");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gymdagboken-schema.ics";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Kalenderfil nedladdad!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error(error instanceof Error ? error.message : "Kunde inte ladda ner kalender");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyUrl = async () => {
    toast.info("Prenumeration via URL kräver att kalenderappar stöder autentisering. Använd nedladdning istället för bästa kompatibilitet.");
  };

  const handleAddToGoogleCalendar = () => {
    toast.info("Google Kalender-prenumeration stöds inte med autentisering. Ladda ner .ics-filen och importera den manuellt istället.");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            Synka kalender
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Synka till kalender
          </DialogTitle>
          <DialogDescription>
            Lägg till dina träningspass i din favoritkalender
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Options */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Välj vad som ska synkas</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="strength" className="text-sm text-muted-foreground cursor-pointer">
                  Styrketräningsprogram
                </Label>
                <Switch
                  id="strength"
                  checked={includeStrength}
                  onCheckedChange={setIncludeStrength}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="cardio" className="text-sm text-muted-foreground cursor-pointer">
                  Kardio-planer
                </Label>
                <Switch
                  id="cardio"
                  checked={includeCardio}
                  onCheckedChange={setIncludeCardio}
                />
              </div>
            </div>
          </div>

          {/* Download option - Primary method */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Ladda ner kalender</Label>
            <Button
              onClick={handleDownload}
              disabled={isDownloading || (!includeStrength && !includeCardio) || !session}
              className="w-full gap-2"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? "Laddar ner..." : "Ladda ner .ics-fil"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Importera filen till din kalender-app (Apple, Google, Outlook m.fl.)
            </p>
          </div>

          {/* Instructions */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Smartphone className="h-4 w-4" />
              Så importerar du
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>iPhone:</strong> Öppna filen → välj "Lägg till alla"</li>
              <li><strong>Google Kalender:</strong> Inställningar → Importera → välj filen</li>
              <li><strong>Outlook:</strong> Arkiv → Importera → välj filen</li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Ladda ner en ny fil när du uppdaterar ditt schema
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
