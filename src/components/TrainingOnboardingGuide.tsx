import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Dumbbell, Play, ListChecks, Save, Trophy, ChevronRight, ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'training-onboarding-completed';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function TrainingOnboardingGuide() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps: Step[] = [
    {
      icon: <Play className="h-12 w-12 text-primary" />,
      title: t('training.onboarding.step1Title', 'Starta ett pass'),
      description: t('training.onboarding.step1Desc', 'Välj ett träningsprogram och tryck på "Starta pass" för att börja logga. Du kan också skapa ett nytt program med AI.')
    },
    {
      icon: <ListChecks className="h-12 w-12 text-primary" />,
      title: t('training.onboarding.step2Title', 'Logga varje set'),
      description: t('training.onboarding.step2Desc', 'För varje övning, fyll i antal reps och vikt för varje set. Tryck på ✓ för att bekräfta varje set innan du går vidare.')
    },
    {
      icon: <Dumbbell className="h-12 w-12 text-primary" />,
      title: t('training.onboarding.step3Title', 'Navigera mellan övningar'),
      description: t('training.onboarding.step3Desc', 'Använd pilarna eller dropdown-menyn för att hoppa mellan övningar. Framstegsbalken visar hur långt du kommit.')
    },
    {
      icon: <Save className="h-12 w-12 text-primary" />,
      title: t('training.onboarding.step4Title', 'Spara passet'),
      description: t('training.onboarding.step4Desc', 'När du är klar med alla övningar, tryck "Slutför träning" för att spara. Dina sets och vikter sparas i din logg.')
    },
    {
      icon: <Trophy className="h-12 w-12 text-primary" />,
      title: t('training.onboarding.step5Title', 'Få XP och nå nya rekord!'),
      description: t('training.onboarding.step5Desc', 'Du får XP för varje pass och set. Slå dina personbästa så firar vi med konfetti! 🎉')
    }
  ];

  useEffect(() => {
    const hasCompleted = localStorage.getItem(STORAGE_KEY);
    if (!hasCompleted) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            {t('training.onboarding.title', 'Så loggar du träning')}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {t('training.onboarding.subtitle', 'Steg')} {currentStep + 1} / {steps.length}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center py-6 space-y-4">
          <div className="p-4 rounded-full bg-primary/10">
            {currentStepData.icon}
          </div>
          <h3 className="text-lg font-semibold text-center">{currentStepData.title}</h3>
          <p className="text-center text-muted-foreground text-sm leading-relaxed px-2">
            {currentStepData.description}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-2">
          {steps.map((_, index) => (
            <div 
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        
        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('training.onboarding.prev', 'Föregående')}
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1"
          >
            {currentStep === steps.length - 1 
              ? t('training.onboarding.done', 'Klar!') 
              : t('training.onboarding.next', 'Nästa')}
            {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
