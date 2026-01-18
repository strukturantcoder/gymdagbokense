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
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">E-posthantering</h1>
            <p className="text-muted-foreground">
              Designa, förhandsgranska och skicka mejl
            </p>
          </div>
        </div>

        <EmailDesignerWithDrafts />
      </div>
    </div>
  );
};

export default AdminEmails;
