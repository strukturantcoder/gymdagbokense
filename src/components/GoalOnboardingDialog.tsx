import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target, Sparkles, Check, Dumbbell, Heart, Scale, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { addWeeks, format } from 'date-fns';

interface SuggestedGoal {
  title: string;
  description: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  weeks_to_complete: number;
}

interface GoalOnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const goalTypeIcons: Record<string, React.ReactNode> = {
  strength: <Dumbbell className="w-5 h-5" />,
  cardio: <Heart className="w-5 h-5" />,
  weight: <Scale className="w-5 h-5" />,
  habit: <Calendar className="w-5 h-5" />,
  custom: <Target className="w-5 h-5" />,
};

const goalTypeLabels: Record<string, string> = {
  strength: 'Styrka',
  cardio: 'Kondition',
  weight: 'Vikthållning',
  habit: 'Träningsvana',
  custom: 'Övrigt',
};

export default function GoalOnboardingDialog({ open, onOpenChange, onComplete }: GoalOnboardingDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'input' | 'suggestions' | 'saving'>('input');
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedGoal[]>([]);
  const [encouragement, setEncouragement] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<Set<number>>(new Set());

  const examplePrompts = [
    "Jag vill bli starkare och kunna ta 100kg i bänkpress",
    "Jag vill springa 5km utan att stanna",
    "Jag vill träna minst 3 gånger i veckan",
    "Jag vill gå ner 5kg till sommaren",
  ];

  const handleGetSuggestions = async () => {
    if (!userInput.trim()) {
      toast.error('Beskriv vad du vill uppnå med din träning');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-goals', {
        body: { userContext: userInput },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setSuggestions(data.goals || []);
      setEncouragement(data.encouragement || '');
      setSelectedGoals(new Set(data.goals?.map((_: SuggestedGoal, i: number) => i) || []));
      setStep('suggestions');
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast.error('Kunde inte hämta förslag, försök igen');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGoal = (index: number) => {
    const newSelected = new Set(selectedGoals);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedGoals(newSelected);
  };

  const handleSaveGoals = async () => {
    if (!user || selectedGoals.size === 0) {
      toast.error('Välj minst ett mål');
      return;
    }

    setStep('saving');
    try {
      const goalsToSave = Array.from(selectedGoals).map((index) => {
        const goal = suggestions[index];
        const targetDate = addWeeks(new Date(), goal.weeks_to_complete);
        return {
          user_id: user.id,
          title: goal.title,
          description: goal.description,
          goal_type: goal.goal_type,
          target_value: goal.target_value,
          target_unit: goal.target_unit,
          target_date: format(targetDate, 'yyyy-MM-dd'),
          ai_suggested: true,
          status: 'active',
        };
      });

      const { error: goalsError } = await supabase.from('user_goals').insert(goalsToSave);
      if (goalsError) throw goalsError;

      // Mark onboarding as complete
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ has_set_initial_goals: true })
        .eq('user_id', user.id);
      if (profileError) throw profileError;

      toast.success(`${goalsToSave.length} mål sparade!`);
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving goals:', error);
      toast.error('Kunde inte spara mål');
      setStep('suggestions');
    }
  };

  const handleSkip = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('profiles')
        .update({ has_set_initial_goals: true })
        .eq('user_id', user.id);
      onComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error skipping:', error);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gym-orange to-gym-amber flex items-center justify-center">
              <Target className="w-5 h-5 text-primary-foreground" />
            </div>
            Sätt dina träningsmål
          </DialogTitle>
          <DialogDescription>
            Berätta vad du vill uppnå så hjälper AI:n dig att formulera konkreta mål
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div>
                <Textarea
                  placeholder="Beskriv dina träningsmål... Vad vill du uppnå? Har du en tidsfrist?"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Inspiration:</p>
                <div className="flex flex-wrap gap-2">
                  {examplePrompts.map((prompt, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => setUserInput(prompt)}
                    >
                      {prompt}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={handleSkip} className="flex-1">
                  Hoppa över
                </Button>
                <Button
                  onClick={handleGetSuggestions}
                  disabled={isLoading || !userInput.trim()}
                  className="flex-1 bg-gradient-to-r from-gym-orange to-gym-amber hover:opacity-90"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Få förslag
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'suggestions' && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {encouragement && (
                <p className="text-sm text-muted-foreground italic bg-primary/5 p-3 rounded-lg">
                  "{encouragement}"
                </p>
              )}

              <div className="space-y-3">
                {suggestions.map((goal, index) => (
                  <Card
                    key={index}
                    className={`cursor-pointer transition-all ${
                      selectedGoals.has(index)
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleGoal(index)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedGoals.has(index)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          {selectedGoals.has(index) ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            goalTypeIcons[goal.goal_type] || goalTypeIcons.custom
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold truncate">{goal.title}</h4>
                            <Badge variant="secondary" className="shrink-0">
                              {goalTypeLabels[goal.goal_type] || goal.goal_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Mål: {goal.target_value} {goal.target_unit}</span>
                            <span>Tid: {goal.weeks_to_complete} veckor</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep('input')} className="flex-1">
                  Tillbaka
                </Button>
                <Button
                  onClick={handleSaveGoals}
                  disabled={selectedGoals.size === 0}
                  className="flex-1 bg-gradient-to-r from-gym-orange to-gym-amber hover:opacity-90"
                >
                  Spara {selectedGoals.size} mål
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'saving' && (
            <motion.div
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8 flex flex-col items-center gap-4"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Sparar dina mål...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
