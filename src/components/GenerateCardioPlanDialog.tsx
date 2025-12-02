import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Sparkles, Loader2, Calendar, Clock, MapPin, Zap, Heart, ChevronDown, ChevronUp, Save, Trash2, Play, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

interface SavedCardioPlan {
  id: string;
  name: string;
  description: string | null;
  goal_type: string;
  target_value: string | null;
  total_weeks: number;
  plan_data: CardioPlan;
  created_at: string;
  is_active: boolean;
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

const getGoalLabel = (goalType: string) => {
  return goalTypes.find(g => g.value === goalType)?.label || goalType;
};

export default function GenerateCardioPlanDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<CardioPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedCardioPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SavedCardioPlan | null>(null);
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([1]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  // Form state
  const [goalType, setGoalType] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('beginner');
  const [currentFitness, setCurrentFitness] = useState('basic');
  const [preferredActivities, setPreferredActivities] = useState<string[]>(['running']);
  const [daysPerWeek, setDaysPerWeek] = useState('3');
  const [customDescription, setCustomDescription] = useState('');

  useEffect(() => {
    if (open && user) {
      fetchSavedPlans();
    }
  }, [open, user]);

  const fetchSavedPlans = async () => {
    if (!user) return;
    
    setIsLoadingPlans(true);
    try {
      const { data, error } = await supabase
        .from('cardio_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedPlans((data || []).map(item => ({
        ...item,
        plan_data: item.plan_data as unknown as CardioPlan
      })) as SavedCardioPlan[]);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

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

  const handleSavePlan = async () => {
    if (!user || !generatedPlan) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('cardio_plans').insert([{
        user_id: user.id,
        name: generatedPlan.name,
        description: generatedPlan.description,
        goal_type: goalType,
        target_value: targetValue || null,
        total_weeks: generatedPlan.totalWeeks,
        plan_data: JSON.parse(JSON.stringify(generatedPlan)),
      }]);

      if (error) throw error;

      toast.success('Plan sparad!');
      fetchSavedPlans();
      setActiveTab('saved');
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Kunde inte spara planen');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('cardio_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast.success('Plan borttagen');
      setSavedPlans(prev => prev.filter(p => p.id !== planId));
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Kunde inte ta bort planen');
    }
  };

  const handleSetActive = async (planId: string) => {
    if (!user) return;

    try {
      // First, deactivate all other plans
      await supabase
        .from('cardio_plans')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Then activate the selected plan
      const { error } = await supabase
        .from('cardio_plans')
        .update({ is_active: true })
        .eq('id', planId);

      if (error) throw error;

      toast.success('Plan aktiverad!');
      fetchSavedPlans();
    } catch (error) {
      console.error('Error activating plan:', error);
      toast.error('Kunde inte aktivera planen');
    }
  };

  const resetForm = () => {
    setGeneratedPlan(null);
    setSelectedPlan(null);
    setGoalType('');
    setTargetValue('');
    setTargetDate('');
    setExperienceLevel('beginner');
    setCurrentFitness('basic');
    setPreferredActivities(['running']);
    setDaysPerWeek('3');
    setCustomDescription('');
  };

  const viewSavedPlan = (plan: SavedCardioPlan) => {
    setSelectedPlan(plan);
    setExpandedWeeks([1]);
  };

  const renderPlanDetails = (plan: CardioPlan, canSave: boolean = false) => (
    <div className="space-y-6 py-4">
      {/* Plan Header */}
      <div className="space-y-2">
        <h3 className="text-xl font-display font-bold">{plan.name}</h3>
        <p className="text-muted-foreground">{plan.description}</p>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline">
            <Calendar className="w-3 h-3 mr-1" />
            {plan.totalWeeks} veckor
          </Badge>
          <Badge variant="outline">
            <Zap className="w-3 h-3 mr-1" />
            {plan.goalSummary}
          </Badge>
        </div>
      </div>

      {/* Tips */}
      {plan.tips && plan.tips.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Tips för att lyckas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {plan.tips.map((tip, index) => (
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
        {plan.weeks.map((week) => (
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

      {canSave && (
        <div className="flex gap-2">
          <Button onClick={handleSavePlan} disabled={isSaving} className="flex-1">
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Spara plan
          </Button>
          <Button variant="outline" onClick={resetForm} className="flex-1">
            Skapa ny plan
          </Button>
        </div>
      )}
    </div>
  );

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
            Skapa eller visa dina sparade träningsplaner
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Skapa ny
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Sparade ({savedPlans.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4">
            <TabsContent value="generate" className="mt-4">
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
                renderPlanDetails(generatedPlan, true)
              )}
            </TabsContent>

            <TabsContent value="saved" className="mt-4">
              {selectedPlan ? (
                <div className="space-y-4">
                  <Button variant="ghost" onClick={() => setSelectedPlan(null)} className="mb-2">
                    ← Tillbaka till listan
                  </Button>
                  {renderPlanDetails(selectedPlan.plan_data)}
                  <div className="flex gap-2">
                    {!selectedPlan.is_active && (
                      <Button onClick={() => handleSetActive(selectedPlan.id)} className="flex-1">
                        <Play className="w-4 h-4 mr-2" />
                        Aktivera plan
                      </Button>
                    )}
                    <Button 
                      variant="destructive" 
                      onClick={() => handleDeletePlan(selectedPlan.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : isLoadingPlans ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : savedPlans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Inga sparade planer ännu.</p>
                  <p className="text-sm">Skapa en ny plan för att komma igång!</p>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  {savedPlans.map((plan) => (
                    <Card 
                      key={plan.id} 
                      className={`cursor-pointer hover:bg-muted/50 transition-colors ${plan.is_active ? 'ring-2 ring-gym-orange' : ''}`}
                      onClick={() => viewSavedPlan(plan)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-display font-semibold">{plan.name}</h4>
                              {plan.is_active && (
                                <Badge className="bg-gym-orange text-white">Aktiv</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {plan.description}
                            </p>
                            <div className="flex gap-2 pt-1">
                              <Badge variant="outline" className="text-xs">
                                {getGoalLabel(plan.goal_type)}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {plan.total_weeks} veckor
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}