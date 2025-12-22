import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Sparkles, Mail } from "lucide-react";
import { EmailDesigner } from "@/components/admin/EmailDesigner";
import { EmailLogs } from "@/components/admin/EmailLogs";

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
            onClick={() => navigate("/dashboard")}
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

        <Tabs defaultValue="designer" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="designer" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Designer
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Loggar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="designer">
            <EmailDesigner />
          </TabsContent>

          <TabsContent value="logs">
            <EmailLogs />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminEmails;
