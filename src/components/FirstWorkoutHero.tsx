import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Sparkles, Dumbbell, Clock, ChevronRight } from 'lucide-react';
import SpontaneousWorkout from './SpontaneousWorkout';
import SpontaneousWorkoutSession from './SpontaneousWorkoutSession';

interface GeneratedWorkout {
  name: string;
  focus: string;
  estimatedDuration: number;
  exercises: {
    name: string;
    sets: number;
    reps: string;
    rest: string;
    notes?: string;
    supersetGroup?: number | null;
  }[];
}

/** Ready-to-run 10 minute starter workout — no equipment, no setup. */
const STARTER_WORKOUT: GeneratedWorkout = {
  name: 'Ditt första pass',
  focus: 'Helkropp',
  estimatedDuration: 10,
  exercises: [
    { name: 'Knäböj (kroppsvikt)', sets: 3, reps: '12', rest: '45 sek', notes: 'Håll ryggen rak och gå så djupt du kan.' },
    { name: 'Armhävningar', sets: 3, reps: '8-12', rest: '45 sek', notes: 'Gå på knä om det behövs.' },
    { name: 'Utfall', sets: 3, reps: '10 per ben', rest: '45 sek' },
    { name: 'Planka', sets: 3, reps: '30 sek', rest: '30 sek', notes: 'Spänn magen, håll höften i linje.' },
  ],
};

interface FirstWorkoutHeroProps {
  onLogged?: () => void;
}

export default function FirstWorkoutHero({ onLogged }: FirstWorkoutHeroProps) {
  const navigate = useNavigate();
  const [showSpontaneous, setShowSpontaneous] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<GeneratedWorkout | null>(null);

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden">
          <CardContent className="p-5 md:p-7">
            <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wide mb-2">
              <Sparkles className="w-4 h-4" />
              Kom igång
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
              Starta ditt första pass
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mb-5 max-w-xl">
              Allt är redan förberett. Ett helkroppspass på cirka 10 minuter – ingen utrustning behövs.
              Logga det så låser du upp statistik, streaks och utmaningar.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {STARTER_WORKOUT.estimatedDuration} min
              </span>
              <span className="flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5" /> {STARTER_WORKOUT.exercises.length} övningar
              </span>
              <span>{STARTER_WORKOUT.exercises.map((e) => e.name).join(' · ')}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button size="lg" className="gap-2" onClick={() => setActiveWorkout(STARTER_WORKOUT)}>
                <Play className="w-4 h-4" />
                Kör passet nu
              </Button>
              <Button size="lg" variant="outline" className="gap-2" onClick={() => setShowSpontaneous(true)}>
                <Sparkles className="w-4 h-4" />
                Låt AI föreslå ett pass
              </Button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/training')}
              className="mt-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Jag vill hellre bygga ett eget program
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {showSpontaneous && (
          <SpontaneousWorkout
            onClose={() => setShowSpontaneous(false)}
            onStartWorkout={(workout) => {
              setActiveWorkout(workout);
              setShowSpontaneous(false);
            }}
          />
        )}
        {activeWorkout && (
          <SpontaneousWorkoutSession
            workout={activeWorkout}
            onClose={() => {
              setActiveWorkout(null);
              onLogged?.();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
