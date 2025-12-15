import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, Footprints, ArrowLeft, Zap, Loader2 } from 'lucide-react';
import WorkoutLogContent from '@/components/training/WorkoutLogContent';
import CardioLogContent from '@/components/training/CardioLogContent';
import CrossFitWOD from '@/components/CrossFitWOD';
import TrainingOnboardingGuide from '@/components/TrainingOnboardingGuide';
import AdBanner from '@/components/AdBanner';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
export default function Training() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'cardio' ? 'cardio' : tabParam === 'crossfit' ? 'crossfit' : 'strength');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (tabParam === 'cardio') setActiveTab('cardio');
    else if (tabParam === 'crossfit') setActiveTab('crossfit');
    else if (tabParam === 'strength') setActiveTab('strength');
  }, [tabParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TrainingOnboardingGuide />
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
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="strength" className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" />
              Styrka
            </TabsTrigger>
            <TabsTrigger value="crossfit" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              CrossFit
            </TabsTrigger>
            <TabsTrigger value="cardio" className="flex items-center gap-2">
              <Footprints className="w-4 h-4" />
              Kondition
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="strength" className="mt-0">
            <WorkoutLogContent />
          </TabsContent>

          <TabsContent value="crossfit" className="mt-0">
            <CrossFitWOD />
          </TabsContent>
          
          <TabsContent value="cardio" className="mt-0">
            <CardioLogContent />
          </TabsContent>
        </Tabs>
        
        {/* Mobile banner ad - only on mobile */}
        {isMobile && (
          <div className="mt-6">
            <AdBanner format="mobile_banner" placement="training_mobile" />
          </div>
        )}
        
        {/* Square medium ad */}
        <div className="flex justify-center my-8">
          <AdBanner format="square_medium" placement="training_square" showPremiumPrompt={false} />
        </div>
      </div>
    </div>
  );
}
