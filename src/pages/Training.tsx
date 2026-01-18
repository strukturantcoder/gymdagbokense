import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dumbbell, Footprints, ArrowLeft, Zap, Loader2, Calendar, Bell, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AdBanner from '@/components/AdBanner';
import CalendarSyncDialog from '@/components/CalendarSyncDialog';
import WorkoutReminderSettings from '@/components/WorkoutReminderSettings';
import { motion } from 'framer-motion';

const trainingTypes = [
  { 
    id: 'strength', 
    label: 'Styrka', 
    icon: Dumbbell, 
    gradient: 'from-orange-500/20 to-red-500/20',
    border: 'border-orange-500/30 hover:border-orange-500/60',
    iconColor: 'text-orange-500',
    description: 'Logga styrkepass'
  },
  { 
    id: 'crossfit', 
    label: 'CrossFit', 
    icon: Zap, 
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/30 hover:border-green-500/60',
    iconColor: 'text-green-500',
    description: 'WOD & funktionell träning'
  },
  { 
    id: 'cardio', 
    label: 'Kondition', 
    icon: Footprints, 
    gradient: 'from-pink-500/20 to-rose-500/20',
    border: 'border-pink-500/30 hover:border-pink-500/60',
    iconColor: 'text-pink-500',
    description: 'Löpning, cykling, simning'
  },
];

export default function Training() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // If a tab is specified, go directly to the workout session
  useEffect(() => {
    if (tabParam) {
      navigate(`/workout-session?type=${tabParam}`);
    }
  }, [tabParam, navigate]);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleTrainingSelect = (type: string) => {
    if (type === 'strength') {
      navigate('/workout-log');
    } else if (type === 'crossfit') {
      navigate('/workout-session?type=crossfit');
    } else if (type === 'cardio') {
      navigate('/cardio-log');
    }
  };

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
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

      {/* Main content - fixed height, no scroll */}
      <main className="flex-1 flex flex-col px-3 py-3 md:px-4 md:py-4 pb-16 md:pb-4 overflow-hidden">
        {/* Title */}
        <div className="shrink-0 mb-3">
          <h1 className="text-lg font-display font-bold">Välj träningstyp</h1>
          <p className="text-xs text-muted-foreground">Vad vill du träna idag?</p>
        </div>

        {/* Training type cards - takes remaining space */}
        <div className="flex-1 grid grid-cols-1 gap-3 min-h-0 content-start">
          {trainingTypes.map((type, index) => (
            <motion.div
              key={type.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={`cursor-pointer bg-gradient-to-br ${type.gradient} ${type.border} transition-all h-full`}
                onClick={() => handleTrainingSelect(type.id)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center`}>
                    <type.icon className={`w-6 h-6 ${type.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">{type.label}</h3>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                  <Play className="w-5 h-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Ad Banner at bottom */}
        <div className="shrink-0 mt-3">
          <AdBanner format="mobile_banner" placement="training_bottom" showPremiumPrompt={false} />
        </div>
      </main>
    </div>
  );
}
