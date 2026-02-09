import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Sparkles, Loader2, Dumbbell, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import ProgramRefineDialog from './ProgramRefineDialog';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest?: string;
  notes?: string;
  supersetGroup?: number | null;
}

interface WorkoutDay {
  day: string;
  focus: string;
  exercises: Exercise[];
}

interface ProgramData {
  name: string;
  description: string;
  weeks: number;
  days: WorkoutDay[];
  followUpQuestion?: string;
}

const goals = [
  { value: 'muscle_gain', label: 'Muskeltillväxt' },
  { value: 'fat_loss', label: 'Fettförbränning' },
  { value: 'strength', label: 'Styrka' },
  { value: 'endurance', label: 'Uthållighet' },
  { value: 'general_fitness', label: 'Allmän form' },
];

const experienceLevels = [
  { value: 'aldrig_tranat', label: 'Aldrig tränat' },
  { value: 'beginner', label: 'Nybörjare' },
  { value: 'intermediate', label: 'Motionär' },
  { value: 'advanced', label: 'Erfaren' },
];

const daysPerWeekOptions = [
  { value: '2', label: '2 dagar' },
  { value: '3', label: '3 dagar' },
  { value: '4', label: '4 dagar' },
  { value: '5', label: '5 dagar' },
  { value: '6', label: '6 dagar' },
];

interface GenerateWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProgramCreated?: () => void;
}

export default function GenerateWorkoutDialog({ open, onOpenChange, onProgramCreated }: GenerateWorkoutDialogProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedProgram, setGeneratedProgram] = useState<ProgramData | null>(null);
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [expandedDays, setExpandedDays] = useState<number[]>([0]);

  // Form state
  const [goal, setGoal] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [daysPerWeek, setDaysPerWeek] = useState('3');
  const [customDescription, setCustomDescription] = useState('');

  const resetForm = () => {
    setGeneratedProgram(null);
    setGoal('');
    setExperienceLevel('beginner');
    setDaysPerWeek('3');
    setCustomDescription('');
    setExpandedDays([0]);
  };

  const handleGenerate = async () => {
    if (!goal) {
      toast.error('Välj ett mål först');
      return;
    }

    setIsGenerating(true);
    setGeneratedProgram(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-workout', {
        body: {
          goal,
          experienceLevel,
          daysPerWeek: parseInt(daysPerWeek),
          customDescription,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setGeneratedProgram(data.program);
      setExpandedDays([0]);
      toast.success('Träningsprogram genererat!');
      
      // Show refine dialog after generation
      setTimeout(() => setShowRefineDialog(true), 500);
    } catch (error) {
      console.error('Error generating program:', error);
      toast.error('Kunde inte generera träningsprogram');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProgram = async () => {
    if (!user || !generatedProgram) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('workout_programs').insert([{
        user_id: user.id,
        name: generatedProgram.name,
        description: generatedProgram.description,
        goal: goal,
        experience_level: experienceLevel,
        days_per_week: parseInt(daysPerWeek),
        program_data: JSON.parse(JSON.stringify(generatedProgram)),
      }]);

      if (error) throw error;

      toast.success('Program sparat!');
      resetForm();
      onOpenChange(false);
      onProgramCreated?.();
    } catch (error) {
      console.error('Error saving program:', error);
      toast.error('Kunde inte spara programmet');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setExpandedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex]
    );
  };

  const handleProgramUpdate = (updatedProgram: ProgramData) => {
    setGeneratedProgram(updatedProgram);
  };

  const handleRefineComplete = () => {
    setShowRefineDialog(false);
  };

  const content = (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pb-4">
      {!generatedProgram ? (
        <>
          {/* Goal Selection */}
          <div className="space-y-2">
            <Label>Vad är ditt mål?</Label>
            <Select value={goal} onValueChange={setGoal}>
              <SelectTrigger>
                <SelectValue placeholder="Välj mål" />
              </SelectTrigger>
              <SelectContent>
                {goals.map(g => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Experience Level */}
          <div className="space-y-2">
            <Label>Erfarenhetsnivå</Label>
            <Select value={experienceLevel} onValueChange={setExperienceLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {experienceLevels.map(level => (
                  <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Days Per Week */}
          <div className="space-y-2">
            <Label>Hur ofta kan du träna?</Label>
            <Select value={daysPerWeek} onValueChange={setDaysPerWeek}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {daysPerWeekOptions.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Description */}
          <div className="space-y-2">
            <Label>Egna önskemål (valfritt)</Label>
            <Textarea
              placeholder="T.ex. 'Fokusera på överkropp' eller 'Jag har ont i ryggen'"
              value={customDescription}
              onChange={e => setCustomDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Generate Button */}
          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || !goal}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Genererar...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generera träningsprogram
              </>
            )}
          </Button>
        </>
      ) : (
        <>
          {/* Program Preview */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">{generatedProgram.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{generatedProgram.description}</p>

            {/* Days List */}
            <div className="space-y-2">
              {generatedProgram.days?.map((day, dayIndex) => (
                <Card key={dayIndex} className="overflow-hidden">
                  <button
                    onClick={() => toggleDay(dayIndex)}
                    className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {day.day}
                      </Badge>
                      <span className="text-sm font-medium">{day.focus}</span>
                    </div>
                    {expandedDays.includes(dayIndex) ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  {expandedDays.includes(dayIndex) && (
                    <CardContent className="pt-0 pb-3">
                      <div className="space-y-1.5">
                        {day.exercises?.map((ex, exIndex) => (
                          <div key={exIndex} className="flex items-center justify-between text-sm bg-muted/30 rounded px-2 py-1.5">
                            <span>{ex.name}</span>
                            <span className="text-muted-foreground text-xs">
                              {ex.sets} × {ex.reps}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowRefineDialog(true)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Finjustera
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveProgram}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Spara program
            </Button>
          </div>

          {/* Reset Button */}
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={resetForm}
          >
            Generera nytt program
          </Button>
        </>
      )}

      {/* Refine Dialog */}
      {generatedProgram && (
        <ProgramRefineDialog
          open={showRefineDialog}
          onOpenChange={setShowRefineDialog}
          program={generatedProgram}
          onProgramUpdate={handleProgramUpdate}
          onComplete={handleRefineComplete}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Skapa AI-träningsprogram
            </DrawerTitle>
            <DrawerDescription>
              Låt AI generera ett personligt styrkeprogram
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-8">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Skapa AI-träningsprogram
          </DialogTitle>
          <DialogDescription>
            Låt AI generera ett personligt styrkeprogram
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
