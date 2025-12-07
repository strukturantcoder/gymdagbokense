import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Bell, Loader2, Send } from "lucide-react";

export const AdminPushNotification = () => {
  const [version, setVersion] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-app-update", {
        body: { version, message },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Push-notis skickad till ${data.sent} användare!`);
      if (data.failed > 0) {
        toast.info(`${data.failed} misslyckades, ${data.cleaned} utgångna prenumerationer rensades`);
      }
      
      setVersion("");
      setMessage("");
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Kunde inte skicka push-notis");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Skicka uppdateringsnotis
        </CardTitle>
        <CardDescription>
          Skicka push-notis till alla användare med aktiverade notiser om att en ny version är tillgänglig
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="version">Version (valfritt)</Label>
            <Input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="t.ex. 2.1.0"
              maxLength={20}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Meddelande (valfritt)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Beskriv vad som är nytt i denna version..."
              rows={3}
              maxLength={200}
            />
          </div>

          <Button type="submit" disabled={sending} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Skickar...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Skicka till alla användare
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
