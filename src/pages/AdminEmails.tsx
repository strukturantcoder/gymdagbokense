import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, Mail, Calendar, FileText } from "lucide-react";
import { EmailDesigner } from "@/components/admin/EmailDesigner";
import { EmailLogs } from "@/components/admin/EmailLogs";
import { ScheduledEmails } from "@/components/admin/ScheduledEmails";
import { EmailDrafts } from "@/components/admin/EmailDrafts";

const EmailDesignerWithDrafts = () => {
  const [draftToLoad, setDraftToLoad] = useState<{ subject: string; content: string; template: string } | null>(null);

  return (
    <Tabs defaultValue="designer" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4 max-w-2xl">
        <TabsTrigger value="designer" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Designer
        </TabsTrigger>
        <TabsTrigger value="drafts" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Utkast
        </TabsTrigger>
        <TabsTrigger value="scheduled" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Schemalagda
        </TabsTrigger>
        <TabsTrigger value="logs" className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Loggar
        </TabsTrigger>
      </TabsList>

      <TabsContent value="designer">
        <EmailDesigner initialDraft={draftToLoad} onDraftLoaded={() => setDraftToLoad(null)} />
      </TabsContent>

      <TabsContent value="drafts">
        <EmailDrafts onLoadDraft={(draft) => setDraftToLoad(draft)} />
      </TabsContent>

      <TabsContent value="scheduled">
        <ScheduledEmails />
      </TabsContent>

      <TabsContent value="logs">
        <EmailLogs />
      </TabsContent>
    </Tabs>
  );
};

const AdminEmails = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Mejl</h1>
              <p className="text-xs text-muted-foreground">E-postkampanjer</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <EmailDesignerWithDrafts />
      </main>
    </div>
  );
};

export default AdminEmails;
