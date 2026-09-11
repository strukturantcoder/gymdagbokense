import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Clock, Dumbbell } from 'lucide-react';
import { STARTER_WORKOUT } from '@/data/starterWorkout';
import SpontaneousWorkoutSession from '@/components/SpontaneousWorkoutSession';

/** Lets a signed-out visitor run the starter workout straight from the landing page. */
export default function GuestStarterWorkout() {
  const [active, setActive] = useState(false);

  return (
    <>
      <section className="container px-4 pt-8">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden">
          <CardContent className="p-5 md:p-7">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
              Kör ditt första pass nu, utan konto
            </h2>
            <p className="text-muted-foreground text-sm md:text-base mb-5 max-w-xl">
              Ett helkroppspass på cirka tio minuter med fyra övningar. Du behöver ingen utrustning
              och inget konto för att köra det. Vill du spara passet i din dagbok skapar du ett
              konto efteråt.
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

            <Button size="lg" className="gap-2" onClick={() => setActive(true)}>
              <Play className="w-4 h-4" />
              Kör passet nu
            </Button>
          </CardContent>
        </Card>
      </section>

      <AnimatePresence>
        {active && (
          <SpontaneousWorkoutSession workout={STARTER_WORKOUT} onClose={() => setActive(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
