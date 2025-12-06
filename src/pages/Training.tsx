import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, Footprints, ArrowLeft } from 'lucide-react';
import WorkoutLogContent from '@/components/training/WorkoutLogContent';
import CardioLogContent from '@/components/training/CardioLogContent';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Training() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('strength');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/dashboard')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-display font-bold">Träning</h1>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="strength" className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Styrka
            </TabsTrigger>
            <TabsTrigger value="cardio" className="flex items-center gap-2">
              <Footprints className="w-4 h-4" />
              Kondition
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="strength" className="mt-0">
            <WorkoutLogContent />
          </TabsContent>
          
          <TabsContent value="cardio" className="mt-0">
            <CardioLogContent />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
