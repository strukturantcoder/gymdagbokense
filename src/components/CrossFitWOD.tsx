import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, RefreshCw, Timer, Dumbbell, Heart, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface WODExercise {
  name: string;
  reps: string;
}

interface WOD {
  id?: string;
  name: string;
  format: string;
  duration: string;
  exercises: WODExercise[];
  description: string;
  scaling: string;
}

export default function CrossFitWOD() {
  const { user } = useAuth();
  const [wod, setWod] = useState<WOD | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedWods, setSavedWods] = useState<WOD[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedWods();
    }
  }, [user]);

  const fetchSavedWods = async () => {
    const { data, error } = await supabase
      .from('saved_wods')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSavedWods(data.map(w => ({
        id: w.id,
        name: w.name,
        format: w.format,
        duration: w.duration,
        exercises: w.exercises as unknown as WODExercise[],
        description: w.description || '',
        scaling: w.scaling || ''
      })));
    }
  };

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

  const saveWod = async () => {
    if (!wod || !user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('saved_wods')
        .insert([{
          user_id: user.id,
          name: wod.name,
          format: wod.format,
          duration: wod.duration,
          exercises: JSON.parse(JSON.stringify(wod.exercises)),
          description: wod.description,
          scaling: wod.scaling
        }]);

      if (error) throw error;

      toast.success('WOD sparad!');
      fetchSavedWods();
    } catch (error) {
      console.error('Error saving WOD:', error);
      toast.error('Kunde inte spara WOD');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_wods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('WOD borttagen');
      fetchSavedWods();
    } catch (error) {
      console.error('Error deleting WOD:', error);
      toast.error('Kunde inte ta bort WOD');
    }
  };

  const loadSavedWod = (savedWod: WOD) => {
    setWod(savedWod);
    setShowSaved(false);
  };

  const WODDisplay = ({ wodData, showSaveButton = false }: { wodData: WOD; showSaveButton?: boolean }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-lg">{wodData.name}</h3>
          <Badge variant="secondary">{wodData.format}</Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Timer className="w-3 h-3" />
            {wodData.duration}
          </Badge>
        </div>
        {showSaveButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={saveWod}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Heart className="w-4 h-4 mr-1" />
                Spara
              </>
            )}
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{wodData.description}</p>

      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        {wodData.exercises.map((exercise, index) => (
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
        <strong>Skalning:</strong> {wodData.scaling}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
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
            <WODDisplay wodData={wod} showSaveButton={!wod.id} />
          )}
        </CardContent>
      </Card>

      {savedWods.length > 0 && (
        <Collapsible open={showSaved} onOpenChange={setShowSaved}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Heart className="w-5 h-5 text-red-500" />
                    Sparade WODs ({savedWods.length})
                  </CardTitle>
                  {showSaved ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                {savedWods.map((savedWod) => (
                  <div
                    key={savedWod.id}
                    className="p-3 bg-muted/30 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{savedWod.name}</span>
                        <Badge variant="secondary" className="text-xs">{savedWod.format}</Badge>
                        <Badge variant="outline" className="text-xs">{savedWod.duration}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => loadSavedWod(savedWod)}
                        >
                          Visa
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => savedWod.id && deleteWod(savedWod.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {savedWod.exercises.map(e => e.name).join(' • ')}
                    </p>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}
