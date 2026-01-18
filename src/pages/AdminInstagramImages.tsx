import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Image } from "lucide-react";
import FreeAIImageGenerator from "@/components/admin/FreeAIImageGenerator";

const AdminInstagramImages = () => {
  const { isAdmin, loading: isLoading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
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
            <div className="w-8 h-8 bg-gradient-to-br from-fuchsia-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Image className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Instagram</h1>
              <p className="text-xs text-muted-foreground">AI-bilder</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-6 px-4">
        <FreeAIImageGenerator />
      </main>
    </div>
  );
};

export default AdminInstagramImages;
