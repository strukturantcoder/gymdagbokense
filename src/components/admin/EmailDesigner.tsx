import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Eye, Send, Users, User, Loader2, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmailPreview } from "./EmailPreview";
import { format } from "date-fns";

const emailTemplates = [
  { id: "custom", name: "Egen mall" },
  { id: "weekly_summary", name: "Veckosammanfattning" },
  { id: "motivation", name: "Motivationsmejl" },
  { id: "feature_update", name: "Ny funktion" },
  { id: "reminder", name: "Påminnelse" },
];

export const EmailDesigner = () => {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [template, setTemplate] = useState("custom");
  const [testEmail, setTestEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("16:00");

  const generateWithAI = async () => {
    if (!template || template === "custom") {
      toast.error("Välj en mall för att få AI-förslag");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-email-content", {
        body: { template, currentSubject: subject, currentContent: content },
      });

      if (error) throw error;

      if (data.subject) setSubject(data.subject);
      if (data.content) setContent(data.content);
      toast.success("AI genererade förslag!");
    } catch (error) {
      console.error("Error generating email:", error);
      toast.error("Kunde inte generera mejlförslag");
    } finally {
      setIsGenerating(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Ange en testmejladress");
      return;
    }
    if (!subject || !content) {
      toast.error("Fyll i ämne och innehåll");
      return;
    }

    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-custom-email", {
        body: { 
          to: testEmail, 
          subject, 
          content,
          isTest: true 
        },
      });

      if (error) throw error;
      toast.success(`Testmejl skickat till ${testEmail}`);
    } catch (error) {
      console.error("Error sending test email:", error);
      toast.error("Kunde inte skicka testmejl");
    } finally {
      setIsSending(false);
    }
  };

  const sendToAllUsers = async () => {
    if (!subject || !content) {
      toast.error("Fyll i ämne och innehåll");
      return;
    }

    const confirmed = window.confirm(
      "Är du säker på att du vill skicka detta mejl till ALLA användare? Detta går inte att ångra."
    );

    if (!confirmed) return;

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-custom-email", {
        body: { 
          subject, 
          content,
          sendToAll: true 
        },
      });

      if (error) throw error;
      toast.success(`Mejl skickat till ${data?.sentCount || 'alla'} användare`);
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Kunde inte skicka mejl");
    } finally {
      setIsSending(false);
    }
  };

  const scheduleEmail = async () => {
    if (!subject || !content) {
      toast.error("Fyll i ämne och innehåll");
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      toast.error("Välj datum och tid");
      return;
    }

    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (scheduledFor <= new Date()) {
      toast.error("Välj ett datum i framtiden");
      return;
    }

    setIsScheduling(true);
    try {
      const { error } = await supabase.from("scheduled_emails").insert({
        subject,
        content,
        template,
        scheduled_for: scheduledFor.toISOString(),
      });

      if (error) throw error;
      toast.success(`Mejl schemalagt för ${format(scheduledFor, "d MMM HH:mm")}`);
      setScheduleDate("");
      setScheduleTime("16:00");
    } catch (error) {
      console.error("Error scheduling email:", error);
      toast.error("Kunde inte schemalägga mejl");
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Designa mejl
          </CardTitle>
          <CardDescription>
            Skapa och anpassa mejl med AI-hjälp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mall</Label>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Välj mall" />
              </SelectTrigger>
              <SelectContent>
                {emailTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Ämne</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ange ämnesrad..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Innehåll</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Skriv ditt mejlinnehåll här... (stödjer markdown)"
              className="min-h-[200px]"
            />
          </div>

          <Button
            onClick={generateWithAI}
            disabled={isGenerating || template === "custom"}
            variant="outline"
            className="w-full"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Få AI-förslag
          </Button>

          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Testmejladress</Label>
              <div className="flex gap-2">
                <Input
                  id="testEmail"
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="din@mejl.se"
                />
                <Button
                  onClick={sendTestEmail}
                  disabled={isSending || !testEmail}
                  variant="secondary"
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Scheduling section */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schemalägg utskick
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
              <Button
                onClick={scheduleEmail}
                disabled={isScheduling || !subject || !content || !scheduleDate}
                variant="outline"
                className="w-full"
              >
                {isScheduling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 mr-2" />
                )}
                Schemalägg
              </Button>
            </div>

            <Button
              onClick={sendToAllUsers}
              disabled={isSending || !subject || !content}
              className="w-full"
              variant="destructive"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Skicka till alla NU
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Förhandsgranskning
          </CardTitle>
          <CardDescription>
            Se hur mejlet kommer att se ut
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailPreview subject={subject} content={content} />
        </CardContent>
      </Card>
    </div>
  );
};
