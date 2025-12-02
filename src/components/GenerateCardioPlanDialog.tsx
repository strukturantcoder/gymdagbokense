import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Loader2, Calendar, Clock, MapPin, Zap, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CardioPlanSession {
  day: string;
  type: string;
  activity: string;
  duration: number;
  distance?: number;
  intensity: string;
  description: string;
  heartRateZone?: string;
}

interface CardioPlanWeek {
  weekNumber: number;
  theme: string;
  totalDistance?: number;
  sessions: CardioPlanSession[];
}

interface CardioPlan {
  name: string;
  description: string;
  totalWeeks: number;
  goalSummary: string;
  tips: string[];
  weeks: CardioPlanWeek[];
}

const goalTypes = [
  { value: 'marathon', label: 'Maraton (42.195 km)' },
  { value: 'half_marathon', label: 'Halvmaraton (21.1 km)' },
  { value: '10k', label: '10 km lopp' },
  { value: '5k', label: '5 km lopp' },
  { value: 'distance_weekly', label: 'Veckodistans' },
  { value: 'duration_weekly', label: 'Träningstid per vecka' },
  { value: 'weight_loss', label: 'Viktnedgång & fettförbränning' },
  { value: 'general_fitness', label: 'Allmän kondition' },
];

const experienceLevels = [
  { value: 'beginner', label: 'Nybörjare' },
  { value: 'intermediate', label: 'Motionär' },
  { value: 'advanced', label: 'Erfaren' },
  { value: 'competitive', label: 'Tävlingsinriktad' },
];

const fitnessLevels = [
  { value: 'sedentary', label: 'Stillasittande (tränar sällan)' },
  { value: 'basic', label: 'Grundläggande (1-2 pass/vecka)' },
  { value: 'moderate', label: 'Måttlig (3-4 pass/vecka)' },
  { value: 'good', label: 'God (5+ pass/vecka)' },
];

const activities = [
  { value: 'running', label: 'Löpning' },
  { value: 'walking', label: 'Promenad' },
  { value: 'cycling', label: 'Cykling' },
  { value: 'swimming', label: 'Simning' },
];

const getIntensityColor = (intensity: string) => {
  switch (intensity.toLowerCase()) {
    case 'låg': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'medel': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'hög': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

export default function GenerateCardioPlanDialog() {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<CardioPlan | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([1]);

  // Form state
  const [goalType, setGoalType] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [currentFitness, setCurrentFitness] = useState('basic');
  const [preferredActivities, setPreferredActivities] = useState<string[]>(['running']);
  const [daysPerWeek, setDaysPerWeek] = useState('3');
  const [customDescription, setCustomDescription] = useState('');

  const toggleWeek = (weekNumber: number) => {
    setExpandedWeeks(prev => 
      prev.includes(weekNumber) 
        ? prev.filter(w => w !== weekNumber)
        : [...prev, weekNumber]
    );
  };

  const toggleActivity = (activity: string) => {
    setPreferredActivities(prev => 
      prev.includes(activity)
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const handleGenerate = async () => {
    if (!goalType) {
      toast.error('Välj ett mål först');
      return;
    }

    setIsGenerating(true);
    setGeneratedPlan(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-cardio-plan', {
        body: {
          goalType,
          targetValue,
          targetDate,
          experienceLevel,
          currentFitness,
          preferredActivities,
          daysPerWeek: parseInt(daysPerWeek),
          customDescription,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setGeneratedPlan(data.plan);
      setExpandedWeeks([1]);
      toast.success('Träningsplan genererad!');
    } catch (error) {
      console.error('Error generating plan:', error);
      toast.error('Kunde inte generera träningsplan');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setGeneratedPlan(null);
    setGoalType('');
    setTargetValue('');
    setTargetDate('');
    setExperienceLevel('beginner');
    setCurrentFitness('basic');
    setPreferredActivities(['running']);
    setDaysPerWeek('3');
    setCustomDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="w-4 h-4" />
          AI-träningsplan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gym-orange" />
            AI Konditionsplanerare
          </DialogTitle>
          <DialogDescription>
            Låt AI:n skapa en personlig träningsplan för att nå dina konditionsmål
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {!generatedPlan ? (
            <div className="space-y-6 py-4">
              {/* Goal Type */}
              <div className="space-y-2">
                <Label>Vad är ditt mål?</Label>
                <Select value={goalType} onValueChange={setGoalType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj mål..." />
                  </SelectTrigger>
                  <SelectContent>
                    {goalTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Value based on goal */}
              {goalType && ['marathon', 'half_marathon', '10k', '5k'].includes(goalType) && (
                <div className="space-y-2">
                  <Label>Måltid (t.ex. 4:30:00 för maraton)</Label>
                  <Input
                    placeholder="HH:MM:SS eller MM:SS"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  />
                </div>
              )}

              {goalType === 'distance_weekly' && (
                <div className="space-y-2">
                  <Label>Målveckodistans (km)</Label>
                  <Input
                    type="number"
                    placeholder="50"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  />
                </div>
              )}

              {goalType === 'duration_weekly' && (
                <div className="space-y-2">
                  <Label>Målträningstid per vecka (minuter)</Label>
                  <Input
                    type="number"
                    placeholder="300"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  />
                </div>
              )}

              {/* Target Date */}
              {['marathon', 'half_marathon', '10k', '5k'].includes(goalType) && (
                <div className="space-y-2">
                  <Label>Tävlingsdatum (valfritt)</Label>
                  <Input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                  />
                </div>
              )}

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

              {/* Current Fitness */}
              <div className="space-y-2">
                <Label>Nuvarande konditionsnivå</Label>
                <Select value={currentFitness} onValueChange={setCurrentFitness}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fitnessLevels.map(level => (
                      <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Activities */}
              <div className="space-y-2">
                <Label>Föredragna aktiviteter</Label>
                <div className="flex flex-wrap gap-2">
                  {activities.map(activity => (
                    <Badge
                      key={activity.value}
                      variant={preferredActivities.includes(activity.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleActivity(activity.value)}
                    >
                      {activity.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Days Per Week */}
              <div className="space-y-2">
                <Label>Träningsdagar per vecka</Label>
                <Select value={daysPerWeek} onValueChange={setDaysPerWeek}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6].map(days => (
                      <SelectItem key={days} value={days.toString()}>{days} dagar</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Description */}
              <div className="space-y-2">
                <Label>Egna önskemål eller begränsningar (valfritt)</Label>
                <Textarea
                  placeholder="T.ex. jag har ont i knäet, vill undvika tidiga morgnar, har tillgång till gym..."
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !goalType}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Genererar plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generera träningsplan
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Plan Header */}
              <div className="space-y-2">
                <h3 className="text-xl font-display font-bold">{generatedPlan.name}</h3>
                <p className="text-muted-foreground">{generatedPlan.description}</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">
                    <Calendar className="w-3 h-3 mr-1" />
                    {generatedPlan.totalWeeks} veckor
                  </Badge>
                  <Badge variant="outline">
                    <Zap className="w-3 h-3 mr-1" />
                    {generatedPlan.goalSummary}
                  </Badge>
                </div>
              </div>

              {/* Tips */}
              {generatedPlan.tips && generatedPlan.tips.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-display">Tips för att lyckas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {generatedPlan.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-gym-orange">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Weekly Schedule */}
              <div className="space-y-3">
                <h4 className="font-display font-semibold">Veckoschema</h4>
                {generatedPlan.weeks.map((week) => (
                  <Card key={week.weekNumber}>
                    <CardHeader 
                      className="py-3 cursor-pointer"
                      onClick={() => toggleWeek(week.weekNumber)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-sm font-display">
                            Vecka {week.weekNumber}: {week.theme}
                          </CardTitle>
                          {week.totalDistance && (
                            <Badge variant="secondary" className="text-xs">
                              <MapPin className="w-3 h-3 mr-1" />
                              {week.totalDistance} km
                            </Badge>
                          )}
                        </div>
                        {expandedWeeks.includes(week.weekNumber) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </CardHeader>
                    {expandedWeeks.includes(week.weekNumber) && (
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {week.sessions.map((session, idx) => (
                            <div 
                              key={idx} 
                              className="p-3 rounded-lg bg-muted/50 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{session.day}</span>
                                <Badge 
                                  variant="outline" 
                                  className={getIntensityColor(session.intensity)}
                                >
                                  {session.intensity}
                                </Badge>
                              </div>
                              <div className="text-sm font-medium text-gym-orange">
                                {session.type}
                              </div>
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {session.duration} min
                                </span>
                                {session.distance && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {session.distance} km
                                  </span>
                                )}
                                {session.heartRateZone && (
                                  <span className="flex items-center gap-1">
                                    <Heart className="w-3 h-3" />
                                    {session.heartRateZone}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {session.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm} className="flex-1">
                  Skapa ny plan
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}