import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Trash2, RefreshCw, Edit } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface EmailDraft {
  id: string;
  subject: string;
  content: string;
  template: string | null;
  created_at: string;
  updated_at: string;
}

interface EmailDraftsProps {
  onLoadDraft: (draft: { subject: string; content: string; template: string }) => void;
}

export const EmailDrafts = ({ onLoadDraft }: EmailDraftsProps) => {
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDrafts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_drafts")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error("Error loading drafts:", error);
      toast.error("Kunde inte ladda utkast");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const deleteDraft = async (id: string) => {
    const confirmed = window.confirm("Är du säker på att du vill ta bort detta utkast?");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("email_drafts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setDrafts(drafts.filter((d) => d.id !== id));
      toast.success("Utkast borttaget");
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast.error("Kunde inte ta bort utkast");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoadDraft = (draft: EmailDraft) => {
    onLoadDraft({
      subject: draft.subject,
      content: draft.content,
      template: draft.template || "custom",
    });
    toast.success("Utkast laddat");
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
              <FileText className="h-5 w-5 text-primary" />
              Utkast
            </CardTitle>
            <CardDescription>
              Sparade mejlutkast
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadDrafts}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Uppdatera
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {drafts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Inga sparade utkast
          </div>
        ) : (
          <div className="space-y-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium truncate">
                      {draft.subject || "Inget ämne"}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {draft.content.substring(0, 100) || "Inget innehåll"}...
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleLoadDraft(draft)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteDraft(draft.id)}
                      disabled={deletingId === draft.id}
                    >
                      {deletingId === draft.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Uppdaterad: {format(new Date(draft.updated_at), "d MMM HH:mm", { locale: sv })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
