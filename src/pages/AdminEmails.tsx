import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Mail, Send, Trash2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const AdminEmails = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  const { data: emailLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as EmailLog[];
    },
    enabled: isAdmin,
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase
        .from("email_logs")
        .delete()
        .eq("id", logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
      toast.success("Loggpost borttagen");
    },
    onError: () => {
      toast.error("Kunde inte ta bort loggpost");
    },
  });

  const clearAllLogsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("email_logs")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
      toast.success("Alla loggar borttagna");
    },
    onError: () => {
      toast.error("Kunde inte rensa loggar");
    },
  });

  const sendInactiveUserEmails = async () => {
    setIsSending(true);
    try {
      const response = await fetch(
        `https://sqsoeyvwtgkevkhpwndj.supabase.co/functions/v1/send-inactive-user-emails`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(`${data.emailsSent} mejl skickade till inaktiva användare`);
        queryClient.invalidateQueries({ queryKey: ["email-logs"] });
      } else {
        throw new Error(data.error || "Okänt fel");
      }
    } catch (error: any) {
      toast.error(`Kunde inte skicka mejl: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Laddar...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const emailTypeLabels: Record<string, string> = {
    inactive_user_reminder: "Påminnelse (inaktiv)",
    welcome: "Välkomstmejl",
    reminder: "Påminnelse",
  };

  const stats = {
    total: emailLogs?.length || 0,
    sent: emailLogs?.filter((l) => l.status === "sent").length || 0,
    failed: emailLogs?.filter((l) => l.status === "failed").length || 0,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Mejlhantering</h1>
            <p className="text-muted-foreground">
              Skicka och hantera utskick till användare
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Totalt</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.sent}</p>
                  <p className="text-xs text-muted-foreground">Skickade</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.failed}</p>
                  <p className="text-xs text-muted-foreground">Misslyckade</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Utskick</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={sendInactiveUserEmails} disabled={isSending}>
              {isSending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Skicka påminnelse till inaktiva
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Rensa alla loggar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rensa alla mejlloggar?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Detta tar bort alla {stats.total} loggposter permanent.
                    Åtgärden kan inte ångras.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearAllLogsMutation.mutate()}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Rensa alla
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mejllogg</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Laddar loggar...
              </div>
            ) : emailLogs && emailLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>E-post</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {emailLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "d MMM HH:mm", {
                            locale: sv,
                          })}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="whitespace-nowrap">
                            {emailTypeLabels[log.email_type] || log.email_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.status === "sent" ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              Skickat
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Misslyckades</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Inga mejl har skickats än
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminEmails;
