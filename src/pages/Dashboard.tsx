import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Dumbbell, Plus, Trash2, Loader2, LogOut, Sparkles, ClipboardList, BarChart3, X, Edit2, Save, Users, Footprints } from 'lucide-react';
import { InstallAppButton } from '@/components/InstallPrompt';
import SubscriptionButton from '@/components/SubscriptionButton';
import AdBanner from '@/components/AdBanner';
import ExerciseInfo from '@/components/ExerciseInfo';
import SortableExercise from '@/components/SortableExercise';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
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
}

interface WorkoutProgram {
  id: string;
  name: string;
  goal: string;
  experience_level: string;
  days_per_week: number;
  program_data: ProgramData;
  created_at: string;
}

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<WorkoutProgram | null>(null);
  
  // Form state
  const [goal, setGoal] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedProgram, setEditedProgram] = useState<WorkoutProgram | null>(null);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [addingToDay, setAddingToDay] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPrograms();
    }
  }, [user]);

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from('workout_programs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching programs:', error);
      toast.error('Kunde inte hämta program');
    } else if (data) {
      setPrograms(data.map(item => ({
        ...item,
        program_data: item.program_data as unknown as ProgramData
      })));
    }
  };

  const handleGenerateProgram = async () => {
    if (!goal || !experienceLevel || !daysPerWeek) {
      toast.error('Fyll i alla fält');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-workout', {
        body: { goal, experienceLevel, daysPerWeek: parseInt(daysPerWeek), customDescription }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const program = data.program as ProgramData;
      
      // Save to database
      const { error: insertError } = await supabase
        .from('workout_programs')
        .insert([{
          user_id: user!.id,
          name: program.name,
          goal,
          experience_level: experienceLevel,
          days_per_week: parseInt(daysPerWeek),
          program_data: JSON.parse(JSON.stringify(program))
        }]);

      if (insertError) throw insertError;

      toast.success('Träningsprogram skapat!');
      setShowGenerator(false);
      setGoal('');
      setExperienceLevel('');
      setDaysPerWeek('');
      setCustomDescription('');
      fetchPrograms();
    } catch (error) {
      console.error('Error generating program:', error);
      toast.error(error instanceof Error ? error.message : 'Kunde inte skapa program');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteProgram = async (id: string) => {
    const { error } = await supabase
      .from('workout_programs')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Kunde inte ta bort programmet');
    } else {
      toast.success('Program borttaget');
      if (selectedProgram?.id === id) {
        setSelectedProgram(null);
        setEditedProgram(null);
        setIsEditing(false);
      }
      fetchPrograms();
    }
  };

  const startEditing = () => {
    if (selectedProgram) {
      setEditedProgram(JSON.parse(JSON.stringify(selectedProgram)));
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setEditedProgram(null);
    setIsEditing(false);
    setAddingToDay(null);
    setNewExerciseName('');
  };

  const saveEdits = async () => {
    if (!editedProgram) return;
    
    try {
      const { error } = await supabase
        .from('workout_programs')
        .update({ program_data: JSON.parse(JSON.stringify(editedProgram.program_data)) })
        .eq('id', editedProgram.id);
      
      if (error) throw error;
      
      toast.success('Programmet uppdaterat!');
      setSelectedProgram(editedProgram);
      setIsEditing(false);
      setEditedProgram(null);
      fetchPrograms();
    } catch (error) {
      console.error('Error saving program:', error);
      toast.error('Kunde inte spara ändringarna');
    }
  };

  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    if (!editedProgram) return;
    const newProgram = { ...editedProgram };
    newProgram.program_data.days[dayIndex].exercises.splice(exerciseIndex, 1);
    setEditedProgram(newProgram);
  };

  const addExercise = (dayIndex: number) => {
    if (!editedProgram || !newExerciseName.trim()) return;
    const newProgram = { ...editedProgram };
    newProgram.program_data.days[dayIndex].exercises.push({
      name: newExerciseName.trim(),
      sets: 3,
      reps: '8-12',
      rest: '60-90 sek',
      notes: ''
    });
    setEditedProgram(newProgram);
    setNewExerciseName('');
    setAddingToDay(null);
  };

  const handleDragEnd = (dayIndex: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!editedProgram || !over || active.id === over.id) return;
    
    const exercises = editedProgram.program_data.days[dayIndex].exercises;
    const oldIndex = exercises.findIndex((_, i) => `${dayIndex}-${i}` === active.id);
    const newIndex = exercises.findIndex((_, i) => `${dayIndex}-${i}` === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      const newProgram = { ...editedProgram };
      newProgram.program_data.days[dayIndex].exercises = arrayMove(exercises, oldIndex, newIndex);
      setEditedProgram(newProgram);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container px-4 py-3 overflow-hidden">
          <div className="flex items-center justify-between mb-3 md:mb-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold hidden sm:block">GYMDAGBOKEN</span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <InstallAppButton />
              <SubscriptionButton variant="compact" />
              <Button variant="outline" onClick={() => navigate('/log')}>
                <ClipboardList className="w-4 h-4 mr-2" />
                Träningslogg
              </Button>
              <Button variant="outline" onClick={() => navigate('/cardio')}>
                <Footprints className="w-4 h-4 mr-2" />
                Kondition
              </Button>
              <Button variant="outline" onClick={() => navigate('/stats')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Statistik
              </Button>
              <Button variant="outline" onClick={() => navigate('/social')}>
                <Users className="w-4 h-4 mr-2" />
                Socialt
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Logga ut
              </Button>
            </div>
          </div>
          
          {/* Mobile scrollable navigation */}
          <div className="md:hidden relative">
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex items-center gap-2 pb-1 min-w-max">
              <InstallAppButton />
              <SubscriptionButton variant="compact" />
              <Button variant="outline" size="sm" onClick={() => navigate('/log')}>
                <ClipboardList className="w-4 h-4 mr-1.5" />
                Logg
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/cardio')}>
                <Footprints className="w-4 h-4 mr-1.5" />
                Kondition
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/stats')}>
                <BarChart3 className="w-4 h-4 mr-1.5" />
                Stats
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/social')}>
                <Users className="w-4 h-4 mr-1.5" />
                Socialt
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
              </div>
            </div>
            {/* Scroll indicator gradient */}
            <div className="absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none" />
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        {/* Ad Banner */}
        <AdBanner className="mb-6" />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Mina Träningsprogram</h1>
            <p className="text-muted-foreground">Skapa AI-genererade program anpassade för dig</p>
          </div>
          <Button variant="hero" onClick={() => setShowGenerator(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nytt Program
          </Button>
        </div>

        {/* Program Generator */}
        {showGenerator && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-primary/50 bg-gradient-to-b from-primary/5 to-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gym-orange" />
                  Skapa nytt AI-program
                </CardTitle>
                <CardDescription>
                  Berätta om dina mål så skapar vår AI ett skräddarsytt program åt dig
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Ditt mål</Label>
                    <Select value={goal} onValueChange={setGoal}>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj mål" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bygga muskler">Bygga muskler</SelectItem>
                        <SelectItem value="gå ner i vikt">Gå ner i vikt</SelectItem>
                        <SelectItem value="öka styrka">Öka styrka</SelectItem>
                        <SelectItem value="förbättra kondition">Förbättra kondition</SelectItem>
                        <SelectItem value="allmän fitness">Allmän fitness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Erfarenhetsnivå</Label>
                    <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj nivå" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aldrig tränat">Aldrig tränat</SelectItem>
                        <SelectItem value="nybörjare">Nybörjare</SelectItem>
                        <SelectItem value="medel">Medel</SelectItem>
                        <SelectItem value="avancerad">Avancerad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Dagar per vecka</Label>
                    <Select value={daysPerWeek} onValueChange={setDaysPerWeek}>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj dagar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 dagar</SelectItem>
                        <SelectItem value="3">3 dagar</SelectItem>
                        <SelectItem value="4">4 dagar</SelectItem>
                        <SelectItem value="5">5 dagar</SelectItem>
                        <SelectItem value="6">6 dagar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom description textarea */}
                <div className="space-y-2">
                  <Label>Beskriv dina ambitioner (valfritt)</Label>
                  <Textarea
                    placeholder="T.ex. 'Jag vill fokusera på överkropp', 'Jag har en knäskada och kan inte göra knäböj', 'Jag tränar hemma utan vikter'..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="hero"
                    onClick={handleGenerateProgram}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Genererar...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generera program
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowGenerator(false)}>
                    Avbryt
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Program list */}
          <div className="lg:col-span-1 space-y-4">
            {programs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Du har inga program än. Skapa ditt första!
                  </p>
                </CardContent>
              </Card>
            ) : (
              programs.map((program) => (
                <motion.div
                  key={program.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedProgram?.id === program.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedProgram(program)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{program.name}</CardTitle>
                          <CardDescription>{program.goal}</CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProgram(program.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span className="bg-secondary px-2 py-1 rounded">{program.experience_level}</span>
                        <span className="bg-secondary px-2 py-1 rounded">{program.days_per_week} dagar/vecka</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          {/* Program details */}
          <div className="lg:col-span-2">
            {selectedProgram ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{(isEditing ? editedProgram : selectedProgram)?.program_data.name}</CardTitle>
                      <CardDescription>{(isEditing ? editedProgram : selectedProgram)?.program_data.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button variant="hero" size="sm" onClick={saveEdits}>
                            <Save className="w-4 h-4 mr-2" />
                            Spara
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelEditing}>
                            Avbryt
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={startEditing}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Redigera
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(isEditing ? editedProgram : selectedProgram)?.program_data.days.map((day, dayIndex) => (
                    <div key={dayIndex} className="border border-border rounded-lg p-4">
                      <h3 className="font-display font-bold text-lg mb-1">{day.day}</h3>
                      <p className="text-sm text-gym-orange mb-4">{day.focus}</p>
                      
                      {isEditing ? (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd(dayIndex)}
                        >
                          <SortableContext
                            items={day.exercises.map((_, i) => `${dayIndex}-${i}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-3">
                              {day.exercises.map((exercise, exIndex) => (
                                <SortableExercise
                                  key={`${dayIndex}-${exIndex}`}
                                  id={`${dayIndex}-${exIndex}`}
                                  exercise={exercise}
                                  isEditing={true}
                                  onRemove={() => removeExercise(dayIndex, exIndex)}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      ) : (
                        <div className="space-y-3">
                          {day.exercises.map((exercise, exIndex) => (
                            <div
                              key={exIndex}
                              className="bg-secondary/50 rounded-lg p-3 flex items-center justify-between"
                            >
                              <div>
                                <ExerciseInfo exerciseName={exercise.name}>
                                  <p className="font-medium">{exercise.name}</p>
                                </ExerciseInfo>
                                {exercise.notes && (
                                  <p className="text-xs text-muted-foreground">{exercise.notes}</p>
                                )}
                              </div>
                              <div className="text-right text-sm">
                                <p className="text-foreground">{exercise.sets} x {exercise.reps}</p>
                                <p className="text-muted-foreground">Vila: {exercise.rest}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Add exercise */}
                      {isEditing && (
                        <div className="pt-4">
                          {addingToDay === dayIndex ? (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Övningsnamn"
                                value={newExerciseName}
                                onChange={(e) => setNewExerciseName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addExercise(dayIndex)}
                              />
                                <Button size="sm" onClick={() => addExercise(dayIndex)}>
                                  <Plus className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setAddingToDay(null); setNewExerciseName(''); }}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full border-dashed"
                                onClick={() => setAddingToDay(dayIndex)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Lägg till övning
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed h-full min-h-[400px] flex items-center justify-center">
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Välj ett program för att se detaljerna
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
