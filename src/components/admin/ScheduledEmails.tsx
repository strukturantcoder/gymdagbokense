import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface ScheduledEmail {
  id: string;
  subject: string;
  content: string;
  template: string | null;
  scheduled_for: string;
  sent_at: string | null;
  sent_count: number | null;
  status: string;
  created_at: string;
}

export const ScheduledEmails = () => {
  const [emails, setEmails] = useState<ScheduledEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadEmails = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("scheduled_emails")
        .select("*")
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      console.error("Error loading scheduled emails:", error);
      toast.error("Kunde inte ladda schemalagda mejl");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, []);

  const deleteEmail = async (id: string) => {
    const confirmed = window.confirm("Är du säker på att du vill ta bort detta schemalagda mejl?");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("scheduled_emails")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setEmails(emails.filter((e) => e.id !== id));
      toast.success("Schemalagt mejl borttaget");
    } catch (error) {
      console.error("Error deleting email:", error);
      toast.error("Kunde inte ta bort mejl");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (email: ScheduledEmail) => {
    switch (email.status) {
      case "sent":
        return <Badge variant="default" className="bg-emerald-500">Skickat ({email.sent_count})</Badge>;
      case "processing":
        return <Badge variant="secondary">Skickar...</Badge>;
      case "pending":
        return <Badge variant="outline">Väntar</Badge>;
      default:
        return <Badge variant="outline">{email.status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schemalagda mejl
            </CardTitle>
            <CardDescription>
              Mejl som är planerade att skickas
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadEmails}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Uppdatera
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {emails.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Inga schemalagda mejl
          </div>
        ) : (
          <div className="space-y-4">
            {emails.map((email) => (
              <div
                key={email.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium truncate">{email.subject}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {email.content.substring(0, 150)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(email)}
                    {email.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEmail(email.id)}
                        disabled={deletingId === email.id}
                      >
                        {deletingId === email.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(email.scheduled_for), "d MMM yyyy HH:mm", { locale: sv })}
                  </div>
                  {email.sent_at && (
                    <div>
                      Skickat: {format(new Date(email.sent_at), "d MMM HH:mm", { locale: sv })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
