import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Dumbbell, Plus, Trash2, Loader2, LogOut, Sparkles, ClipboardList, BarChart3, X, Edit2, Save, Users, Footprints, Link2, Shield, Trophy, RotateCcw, Trash, UserCircle } from 'lucide-react';
import { InstallAppButton } from '@/components/InstallPrompt';
import { PushNotificationSettings } from '@/components/PushNotificationSettings';
import SubscriptionButton from '@/components/SubscriptionButton';
import AdBanner from '@/components/AdBanner';
import ExerciseInfo from '@/components/ExerciseInfo';
import WelcomeGuide from '@/components/WelcomeGuide';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import ProgramRefineDialog from '@/components/ProgramRefineDialog';
import SortableExercise from '@/components/SortableExercise';
import { NotificationBell } from '@/components/NotificationBell';
import QuickActions from '@/components/QuickActions';
import GamificationHero from '@/components/GamificationHero';
import NextMilestoneWidget from '@/components/NextMilestoneWidget';
import DailyStreakBonus from '@/components/DailyStreakBonus';
import InviteFriendNudge from '@/components/InviteFriendNudge';
import { PendingInvitationsPopup } from '@/components/PendingInvitationsPopup';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import RecommendedPrograms from '@/components/RecommendedPrograms';
import RecentActivity from '@/components/RecentActivity';
import NextWorkoutSuggestion from '@/components/NextWorkoutSuggestion';
import { WeeklySummary } from '@/components/WeeklySummary';
import { WorkoutHistoryChart } from '@/components/WorkoutHistoryChart';
import { StrengthProgressChart } from '@/components/StrengthProgressChart';
import { NewChallengePopup } from '@/components/NewChallengePopup';
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
  const { isAdmin } = useAdmin();
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
  
  // Refine dialog state
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [pendingProgram, setPendingProgram] = useState<ProgramData | null>(null);
  const [refiningProgramId, setRefiningProgramId] = useState<string | null>(null);
  
  // Trash state
  const [showTrash, setShowTrash] = useState(false);
  const [trashPrograms, setTrashPrograms] = useState<WorkoutProgram[]>([]);
  const [programToDelete, setProgramToDelete] = useState<WorkoutProgram | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPrograms();
      fetchTrashPrograms();
    }
  }, [user]);

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from('workout_programs')
      .select('*')
      .is('deleted_at', null)
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

  const fetchTrashPrograms = async () => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { data, error } = await supabase
      .from('workout_programs')
      .select('*')
      .not('deleted_at', 'is', null)
      .gte('deleted_at', ninetyDaysAgo.toISOString())
      .order('deleted_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching trash:', error);
    } else if (data) {
      setTrashPrograms(data.map(item => ({
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
      
      // Show refine dialog instead of saving immediately
      setPendingProgram(program);
      setShowRefineDialog(true);
      setShowGenerator(false);
    } catch (error) {
      console.error('Error generating program:', error);
      toast.error(error instanceof Error ? error.message : 'Kunde inte skapa program');
    } finally {
      setIsGenerating(false);
    }
  };

  const savePendingProgram = async () => {
    if (!pendingProgram || !user) return;
    
    try {
      if (refiningProgramId) {
        // Update existing program
        const { error: updateError } = await supabase
          .from('workout_programs')
          .update({ program_data: JSON.parse(JSON.stringify(pendingProgram)) })
          .eq('id', refiningProgramId);

        if (updateError) throw updateError;
        
        toast.success('Programmet uppdaterat!');
        setRefiningProgramId(null);
      } else {
        // Insert new program
        const { error: insertError } = await supabase
          .from('workout_programs')
          .insert([{
            user_id: user.id,
            name: pendingProgram.name,
            goal,
            experience_level: experienceLevel,
            days_per_week: parseInt(daysPerWeek),
            program_data: JSON.parse(JSON.stringify(pendingProgram))
          }]);

        if (insertError) throw insertError;

        toast.success('Träningsprogram sparat!');
        setGoal('');
        setExperienceLevel('');
        setDaysPerWeek('');
        setCustomDescription('');
      }
      
      setPendingProgram(null);
      fetchPrograms();
    } catch (error) {
      console.error('Error saving program:', error);
      toast.error('Kunde inte spara programmet');
    }
  };

  const openRefineDialogForProgram = (program: WorkoutProgram) => {
    setPendingProgram(program.program_data);
    setRefiningProgramId(program.id);
    setShowRefineDialog(true);
  };

  const handleDeleteProgram = async (id: string) => {
    const { error } = await supabase
      .from('workout_programs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) {
      toast.error('Kunde inte ta bort programmet');
    } else {
      toast.success('Program flyttat till papperskorgen', {
        description: 'Du kan återställa det inom 90 dagar'
      });
      if (selectedProgram?.id === id) {
        setSelectedProgram(null);
        setEditedProgram(null);
        setIsEditing(false);
      }
      fetchPrograms();
    }
  };

  const restoreProgram = async (id: string) => {
    const { error } = await supabase
      .from('workout_programs')
      .update({ deleted_at: null })
      .eq('id', id);
    
    if (error) {
      toast.error('Kunde inte återställa programmet');
    } else {
      toast.success('Program återställt!');
      fetchPrograms();
      fetchTrashPrograms();
    }
  };

  const permanentlyDeleteProgram = async (id: string) => {
    const { error } = await supabase
      .from('workout_programs')
      .delete()
      .eq('id', id);
    
    if (error) {
      toast.error('Kunde inte ta bort programmet permanent');
    } else {
      toast.success('Program borttaget permanent');
      fetchTrashPrograms();
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Welcome Guide for new users */}
      {user && <WelcomeGuide userId={user.id} />}
      
      {/* Pending Invitations Popup */}
      {user && <PendingInvitationsPopup userId={user.id} />}
      
      {/* Invite Friend Nudge */}
      {user && <InviteFriendNudge userId={user.id} />}
      
      {/* Program Refine Dialog */}
      {pendingProgram && (
        <ProgramRefineDialog
          open={showRefineDialog}
          onOpenChange={setShowRefineDialog}
          program={pendingProgram}
          onProgramUpdate={setPendingProgram}
          onComplete={savePendingProgram}
        />
      )}
      
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
              <PushNotificationSettings />
              <SubscriptionButton variant="compact" />
              <Button variant="outline" onClick={() => navigate('/training')}>
                <ClipboardList className="w-4 h-4 mr-2" />
                Träning
              </Button>
              <Button variant="outline" onClick={() => navigate('/stats')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Statistik
              </Button>
              <Button variant="outline" onClick={() => navigate('/social')}>
                <Users className="w-4 h-4 mr-2" />
                Socialt
              </Button>
              {isAdmin && (
                <Button variant="outline" onClick={() => navigate('/admin/challenges')}>
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}
              <NotificationBell />
              <Button variant="outline" onClick={() => navigate('/account')}>
                <UserCircle className="w-4 h-4 mr-2" />
                Konto
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
              <PushNotificationSettings />
              <SubscriptionButton variant="compact" />
              <Button variant="outline" size="sm" onClick={() => navigate('/training')}>
                <ClipboardList className="w-4 h-4 mr-1.5" />
                Träning
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/stats')}>
                <BarChart3 className="w-4 h-4 mr-1.5" />
                Stats
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate('/social')}>
                <Users className="w-4 h-4 mr-1.5" />
                Socialt
              </Button>
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/challenges')}>
                  <Shield className="w-4 h-4 mr-1.5" />
                  Admin
                </Button>
              )}
              <NotificationBell />
              <Button variant="outline" size="sm" onClick={() => navigate('/account')}>
                <UserCircle className="w-4 h-4" />
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
        {/* Ad Banner - horizontal on top */}
        <AdBanner format="horizontal" placement="dashboard_top" className="mb-6" />

        {/* Onboarding Checklist for new users */}
        {user && <OnboardingChecklist userId={user.id} />}

        {/* Daily Streak Bonus */}
        <DailyStreakBonus />

        {/* Gamification Hero - XP, Level, Achievements */}
        <GamificationHero />

        {/* Quick Actions with Streak and Weekly Stats */}
        <QuickActions />

        {/* Weekly Summary */}
        <div className="mb-6">
          <WeeklySummary />
        </div>

        {/* Workout History Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <WorkoutHistoryChart />
          <StrengthProgressChart />
        </div>

        {/* Next Workout Suggestion */}
        <NextWorkoutSuggestion />

        {/* Next Milestone Widget */}
        <div className="mb-6">
          <NextMilestoneWidget />
        </div>

        {/* Weekly Calendar */}
        <div className="mb-6">
          <WeeklyCalendar />
        </div>

        {/* Recent Activity */}
        <RecentActivity />

        {/* Recommended Programs */}
        <RecommendedPrograms />
        
        {/* Quick link to challenges */}
        <Card 
          className="mb-6 cursor-pointer hover:border-primary/50 transition-colors bg-gradient-to-r from-gym-orange/10 to-amber-500/10"
          onClick={() => navigate('/social')}
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-amber-500 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Community-tävlingar</h3>
                <p className="text-sm text-muted-foreground">Tävla mot andra och vinn XP!</p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Se tävlingar
            </Button>
          </CardContent>
        </Card>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-display font-bold truncate">Mina Träningsprogram</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Skapa AI-genererade program anpassade för dig</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="hero" size="sm" className="sm:size-default" onClick={() => setShowGenerator(true)}>
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nytt Program</span>
              <span className="sm:hidden">Nytt</span>
            </Button>
            <Button 
              variant={showTrash ? "default" : "outline"} 
              size="icon"
              onClick={() => {
                setShowTrash(!showTrash);
                if (!showTrash) fetchTrashPrograms();
              }}
              className="relative flex-shrink-0"
            >
              <Trash className="w-4 h-4" />
              {trashPrograms.length > 0 && !showTrash && (
                <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {trashPrograms.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Trash View */}
        {showTrash && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash className="w-5 h-5 text-muted-foreground" />
                  Papperskorg
                </CardTitle>
                <CardDescription>
                  Borttagna program sparas i 90 dagar innan de raderas permanent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trashPrograms.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Papperskorgen är tom</p>
                ) : (
                  <div className="space-y-3">
                    {trashPrograms.map(program => (
                      <div 
                        key={program.id}
                        className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{program.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Borttaget: {new Date((program as any).deleted_at).toLocaleDateString('sv-SE')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => restoreProgram(program.id)}
                          >
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Återställ
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => setProgramToDelete(program)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

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
              <Card className="overflow-hidden">
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-lg sm:text-xl break-words">{(isEditing ? editedProgram : selectedProgram)?.program_data.name}</CardTitle>
                      <CardDescription className="mt-1 text-sm break-words">{(isEditing ? editedProgram : selectedProgram)?.program_data.description}</CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {isEditing ? (
                        <>
                          <Button variant="hero" size="sm" onClick={saveEdits}>
                            <Save className="w-4 h-4 mr-1.5" />
                            Spara
                          </Button>
                          <Button variant="ghost" size="sm" onClick={cancelEditing}>
                            Avbryt
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="hero" size="sm" onClick={() => openRefineDialogForProgram(selectedProgram)}>
                            <Sparkles className="w-4 h-4 mr-1.5" />
                            Finjustera
                          </Button>
                          <Button variant="outline" size="sm" onClick={startEditing}>
                            <Edit2 className="w-4 h-4 mr-1.5" />
                            Redigera
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground lg:hidden"
                            onClick={() => setSelectedProgram(null)}
                          >
                            <X className="w-4 h-4 mr-1.5" />
                            Stäng
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(isEditing ? editedProgram : selectedProgram)?.program_data.days.map((day, dayIndex) => (
                    <div key={dayIndex} className="border border-border rounded-lg p-4">
                      <h3 className="font-display font-bold text-base sm:text-lg mb-1 break-words">{day.day}</h3>
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
        
        {/* Square medium ad */}
        <div className="flex justify-center my-8">
          <AdBanner format="square_medium" placement="dashboard_square" showPremiumPrompt={false} />
        </div>
        
        {/* Bottom Ad Banner - horizontal */}
        <AdBanner format="horizontal" placement="dashboard_bottom" className="mt-8" />
      </main>

      {/* Confirm permanent delete dialog */}
      <AlertDialog open={!!programToDelete} onOpenChange={() => setProgramToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Radera permanent?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill radera "{programToDelete?.name}" permanent? 
              Detta går inte att ångra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (programToDelete) {
                  permanentlyDeleteProgram(programToDelete.id);
                  setProgramToDelete(null);
                }
              }}
            >
              Radera permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Challenge Popup */}
      <NewChallengePopup />
    </div>
  );
}
