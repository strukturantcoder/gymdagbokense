import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Bell, Loader2, Send, Plus, X } from "lucide-react";

export const AdminPushNotification = () => {
  const [version, setVersion] = useState("");
  const [updatePoints, setUpdatePoints] = useState<string[]>([""]);
  const [sending, setSending] = useState(false);

  const addUpdatePoint = () => {
    setUpdatePoints([...updatePoints, ""]);
  };

  const removeUpdatePoint = (index: number) => {
    if (updatePoints.length > 1) {
      setUpdatePoints(updatePoints.filter((_, i) => i !== index));
    }
  };

  const updatePoint = (index: number, value: string) => {
    const newPoints = [...updatePoints];
    newPoints[index] = value;
    setUpdatePoints(newPoints);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build message from update points
    const filledPoints = updatePoints.filter(p => p.trim());
    const message = filledPoints.length > 0 
      ? filledPoints.map(p => `• ${p}`).join("\n")
      : "";
    
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
      setUpdatePoints([""]);
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
            <Label>Nyheter i denna version</Label>
            <div className="space-y-2">
              {updatePoints.map((point, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={point}
                    onChange={(e) => updatePoint(index, e.target.value)}
                    placeholder={`Nyhet ${index + 1}...`}
                    maxLength={100}
                  />
                  {updatePoints.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUpdatePoint(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addUpdatePoint}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Lägg till punkt
            </Button>
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