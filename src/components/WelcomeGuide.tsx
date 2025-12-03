import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  Dumbbell, 
  ClipboardList, 
  BarChart3, 
  Users, 
  Trophy,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Footprints
} from 'lucide-react';

interface WelcomeGuideProps {
  userId: string;
}

const steps = [
  {
    icon: Sparkles,
    title: 'Välkommen till Gymdagboken!',
    description: 'Din personliga träningspartner som hjälper dig nå dina mål. Låt oss ta en snabb rundtur!',
    color: 'from-gym-orange to-gym-amber',
  },
  {
    icon: Dumbbell,
    title: 'AI-genererade träningsprogram',
    description: 'Skapa skräddarsydda träningsprogram baserat på dina mål och erfarenhet. Vår AI anpassar övningar, sets och reps för dig.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: ClipboardList,
    title: 'Logga dina träningspass',
    description: 'Spara varje träning med övningar, vikter och reps. Appen kommer ihåg dina senaste vikter för enkel loggning.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Footprints,
    title: 'Spåra konditionsträning',
    description: 'Logga löpning, cykling, simning och annat. Sätt mål och följ din utveckling med detaljerad statistik.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: BarChart3,
    title: 'Statistik & framsteg',
    description: 'Se din utveckling över tid med grafer och statistik. Fira dina personbästa och nå nya milstolpar!',
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: Users,
    title: 'Träna med vänner',
    description: 'Bjud in vänner, tävla i utmaningar och motivera varandra. Tillsammans når ni längre!',
    color: 'from-indigo-500 to-violet-500',
  },
  {
    icon: Trophy,
    title: 'Samla XP & achievements',
    description: 'Tjäna erfarenhetspoäng för varje träning och lås upp prestationer. Gå upp i nivå och visa upp dina framsteg!',
    color: 'from-yellow-500 to-amber-500',
  },
];

export default function WelcomeGuide({ userId }: WelcomeGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenGuide = localStorage.getItem(`welcome_guide_seen_${userId}`);
    if (!hasSeenGuide) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [userId]);

  const handleClose = () => {
    localStorage.setItem(`welcome_guide_seen_${userId}`, 'true');
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

  const handleSkip = () => {
    handleClose();
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-border">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Icon header */}
            <div className={`bg-gradient-to-br ${step.color} p-8 flex justify-center`}>
              <motion.div
                initial={{ scale: 0.8, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center"
              >
                <Icon className="w-10 h-10 text-white" />
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-6 text-center">
              <h2 className="text-xl font-display font-bold mb-3">{step.title}</h2>
              <p className="text-muted-foreground mb-6">{step.description}</p>

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 mb-6">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentStep 
                        ? 'bg-primary w-6' 
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between gap-3">
                {currentStep > 0 ? (
                  <Button variant="ghost" onClick={handlePrev}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Tillbaka
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={handleSkip}>
                    Hoppa över
                  </Button>
                )}
                
                <Button variant="hero" onClick={handleNext}>
                  {currentStep === steps.length - 1 ? (
                    'Kom igång!'
                  ) : (
                    <>
                      Nästa
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
