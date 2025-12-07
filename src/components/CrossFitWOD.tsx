import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, RefreshCw, Timer, Dumbbell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface WODExercise {
  name: string;
  reps: string;
}

interface WOD {
  name: string;
  format: string;
  duration: string;
  exercises: WODExercise[];
  description: string;
  scaling: string;
}

export default function CrossFitWOD() {
  const { t } = useTranslation();
  const [wod, setWod] = useState<WOD | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateWOD = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-wod');

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setWod(data);
      toast.success('WOD genererad!');
    } catch (error) {
      console.error('Error generating WOD:', error);
      toast.error('Kunde inte generera WOD. Försök igen.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-primary" />
            CrossFit WOD
          </CardTitle>
          <Button
            variant={wod ? "outline" : "default"}
            size="sm"
            onClick={generateWOD}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : wod ? (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Ny WOD
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-1" />
                Generera WOD
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!wod && !isLoading && (
          <p className="text-muted-foreground text-sm text-center py-4">
            Klicka för att få dagens CrossFit-workout
          </p>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Skapar din WOD...</p>
          </div>
        )}

        {wod && !isLoading && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-lg">{wod.name}</h3>
              <Badge variant="secondary">{wod.format}</Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {wod.duration}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">{wod.description}</p>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              {wod.exercises.map((exercise, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-primary" />
                    <span className="font-medium">{exercise.name}</span>
                  </div>
                  <Badge variant="outline">{exercise.reps}</Badge>
                </div>
              ))}
            </div>

            <div className="text-xs text-muted-foreground bg-primary/5 rounded p-2">
              <strong>Skalning:</strong> {wod.scaling}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
