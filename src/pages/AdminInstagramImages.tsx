import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
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
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Instagram Bildgenerator</h1>
        <Button variant="outline" onClick={() => navigate("/admin/challenges")}>
          ← Tillbaka
        </Button>
      </div>

      <FreeAIImageGenerator />
    </div>
  );
};

export default AdminInstagramImages;
