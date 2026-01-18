import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dumbbell, Footprints, ArrowLeft, Zap, Loader2, Calendar, Bell, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CalendarSyncDialog from '@/components/CalendarSyncDialog';
import WorkoutReminderSettings from '@/components/WorkoutReminderSettings';
import StrengthBentoGrid from '@/components/training/StrengthBentoGrid';
import { motion } from 'framer-motion';

export default function Training() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'strength');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (tabParam) {
      if (tabParam === 'cardio') {
        navigate('/cardio-log');
      } else if (tabParam === 'crossfit') {
        navigate('/training/session?type=crossfit');
      } else {
        setActiveTab(tabParam);
      }
    }
  }, [tabParam, navigate]);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    if (tab === 'cardio') {
      navigate('/cardio-log');
    } else if (tab === 'crossfit') {
      navigate('/training/session?type=crossfit');
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-20 md:pb-4">
      {/* Compact Header */}
      <header className="border-b border-border bg-card shrink-0">
        <div className="px-3 py-2 md:px-4 md:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate('/dashboard')}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display text-base font-bold">TRÄNING</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <WorkoutReminderSettings
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bell className="h-4 w-4" />
                  </Button>
                }
              />
              <CalendarSyncDialog
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Calendar className="h-4 w-4" />
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs for training types */}
      <div className="px-3 py-2 md:px-4">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11 gap-1 bg-muted/50 p-1">
            <TabsTrigger value="strength" className="text-xs gap-1.5 rounded-md border border-transparent data-[state=active]:border-primary/30 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Dumbbell className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Styrka</span>
            </TabsTrigger>
            <TabsTrigger value="crossfit" className="text-xs gap-1.5 rounded-md border border-transparent data-[state=active]:border-primary/30 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">CrossFit</span>
            </TabsTrigger>
            <TabsTrigger value="cardio" className="text-xs gap-1.5 rounded-md border border-transparent data-[state=active]:border-primary/30 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Footprints className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Kondition</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="strength" className="mt-3">
            <StrengthBentoGrid />
          </TabsContent>

          <TabsContent value="crossfit" className="mt-3">
            {/* Redirect handled above */}
          </TabsContent>

          <TabsContent value="cardio" className="mt-3">
            {/* Redirect handled above */}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
