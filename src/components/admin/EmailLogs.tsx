import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle, XCircle, Clock, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface EmailLog {
  id: string;
  user_id: string | null;
  email: string;
  email_type: string;
  subject: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface ScheduledEmail {
  id: string;
  subject: string;
  content: string;
  template: string;
  scheduled_for: string;
  status: string;
  sent_at: string | null;
  sent_count: number;
  created_at: string;
}

const emailTypeLabels: Record<string, string> = {
  weekly_summary: "Veckosammanfattning",
  reminder: "Påminnelse",
  welcome: "Välkomstmejl",
  inactive_user: "Inaktiv användare",
  custom: "Anpassat mejl",
  motivation: "Motivationsmejl",
  feature_update: "Ny funktion",
};

export const EmailLogs = () => {
  const queryClient = useQueryClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as EmailLog[];
    },
  });

  const { data: scheduledEmails } = useQuery({
    queryKey: ["scheduled-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_emails")
        .select("*")
        .order("scheduled_for", { ascending: true });

      if (error) throw error;
      return data as ScheduledEmail[];
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
      toast.success("Logg raderad");
    },
    onError: () => {
      toast.error("Kunde inte radera logg");
    },
  });

  const deleteScheduledMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_emails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-emails"] });
      toast.success("Schemalagt mejl raderat");
    },
    onError: () => {
      toast.error("Kunde inte radera");
    },
  });

  const clearAllLogsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("email_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
      toast.success("Alla loggar raderade");
    },
    onError: () => {
      toast.error("Kunde inte radera loggar");
    },
  });

  const stats = {
    total: logs?.length || 0,
    sent: logs?.filter((l) => l.status === "sent").length || 0,
    failed: logs?.filter((l) => l.status === "failed").length || 0,
  };

  const pendingScheduled = scheduledEmails?.filter(e => e.status === "pending") || [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Totalt skickade</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-sm text-muted-foreground">Lyckade</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.failed}</p>
                <p className="text-sm text-muted-foreground">Misslyckade</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled emails */}
      {pendingScheduled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schemalagda mejl
            </CardTitle>
            <CardDescription>{pendingScheduled.length} mejl väntar på att skickas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingScheduled.map((email) => (
                <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{email.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(email.scheduled_for), "d MMMM HH:mm", { locale: sv })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteScheduledMutation.mutate(email.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => {
            if (window.confirm("Är du säker på att du vill radera alla loggar?")) {
              clearAllLogsMutation.mutate();
            }
          }}
          disabled={!logs?.length}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Rensa alla loggar
        </Button>
      </div>

      {/* Logs table */}
      <Card>
        <CardHeader>
          <CardTitle>Mejlloggar</CardTitle>
          <CardDescription>Senaste 100 skickade mejl</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !logs?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Inga mejl har skickats ännu</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Mottagare</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Ämne</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), "d MMM HH:mm", { locale: sv })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {emailTypeLabels[log.email_type] || log.email_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.subject}
                      </TableCell>
                      <TableCell>
                        {log.status === "sent" ? (
                          <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Skickat
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Misslyckades
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteLogMutation.mutate(log.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
