import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Zap, RefreshCw, Timer, Dumbbell, Heart, Trash2, ChevronDown, ChevronUp, CheckCircle, History, Trophy, Sparkles, Pencil, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import confetti from 'canvas-confetti';
import WODRefineDialog from './WODRefineDialog';
import AdBanner from '@/components/AdBanner';

const WOD_DRAFT_KEY = 'gymdagboken_wod_draft';
const DRAFT_EXPIRY_HOURS = 24;

interface WODDraft {
  wod: WOD;
  logForm: {
    completionTime: string;
    roundsCompleted: string;
    repsCompleted: string;
    notes: string;
  };
  userId: string;
  createdAt: string;
}
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

interface WODLog {
  id: string;
  wod_name: string;
  wod_format: string;
  wod_duration: string;
  wod_exercises: WODExercise[];
  completion_time: string | null;
  rounds_completed: number | null;
  reps_completed: number | null;
  notes: string | null;
  completed_at: string;
}

export default function CrossFitWOD() {
  const { user } = useAuth();
  const [wod, setWod] = useState<WOD | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedWods, setSavedWods] = useState<WOD[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [wodLogs, setWodLogs] = useState<WODLog[]>([]);
  
  // Log dialog state
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [logForm, setLogForm] = useState({
    completionTime: '',
    roundsCompleted: '',
    repsCompleted: '',
    notes: ''
  });
  
  // Refine dialog state
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  
  // Draft state
  const [hasDraft, setHasDraft] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showDeleteDraftDialog, setShowDeleteDraftDialog] = useState(false);

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (!wod || !user) return;
    
    const draft: WODDraft = {
      wod,
      logForm,
      userId: user.id,
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(WOD_DRAFT_KEY, JSON.stringify(draft));
  }, [wod, logForm, user]);

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    const saved = localStorage.getItem(WOD_DRAFT_KEY);
    if (!saved || !user) return null;
    
    try {
      const draft: WODDraft = JSON.parse(saved);
      
      // Check if draft belongs to current user
      if (draft.userId !== user.id) return null;
      
      // Check if draft is expired
      const createdAt = new Date(draft.createdAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursDiff > DRAFT_EXPIRY_HOURS) {
        localStorage.removeItem(WOD_DRAFT_KEY);
        return null;
      }
      
      return draft;
    } catch {
      return null;
    }
  }, [user]);

  // Discard draft
  const discardDraft = useCallback(() => {
    localStorage.removeItem(WOD_DRAFT_KEY);
    setHasDraft(false);
  }, []);

  // Resume draft
  const resumeDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      setWod(draft.wod);
      setLogForm(draft.logForm);
      setShowLogDialog(true);
      setShowDraftDialog(false);
    }
  }, [loadDraft]);

  // Check for drafts on mount
  useEffect(() => {
    if (user) {
      fetchSavedWods();
      fetchWodLogs();
      
      const draft = loadDraft();
      if (draft) {
        setHasDraft(true);
        setShowDraftDialog(true);
      }
    }
  }, [user, loadDraft]);

  // Auto-save draft when log form changes
  useEffect(() => {
    if (showLogDialog && wod) {
      saveDraft();
    }
  }, [showLogDialog, wod, logForm, saveDraft]);

  const fetchSavedWods = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_wods')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(w => {
          const exercisesArray = Array.isArray(w.exercises) ? w.exercises : [];
          return {
            id: w.id,
            name: w.name,
            format: w.format,
            duration: w.duration,
            exercises: exercisesArray.map((ex: unknown) => {
              const exercise = ex as { name?: string; reps?: string };
              return { 
                name: exercise.name || '', 
                reps: exercise.reps || '' 
              };
            }),
            description: w.description || '',
            scaling: w.scaling || ''
          };
        });
        setSavedWods(mapped);
      }
    } catch (err) {
      console.error('Error fetching saved WODs:', err);
    }
  };

  const fetchWodLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('wod_logs')
        .select('*')
        .order('completed_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(log => ({
          id: log.id,
          wod_name: log.wod_name,
          wod_format: log.wod_format,
          wod_duration: log.wod_duration,
          wod_exercises: Array.isArray(log.wod_exercises) 
            ? log.wod_exercises.map((ex: unknown) => {
                const exercise = ex as { name?: string; reps?: string };
                return { name: exercise.name || '', reps: exercise.reps || '' };
              })
            : [],
          completion_time: log.completion_time,
          rounds_completed: log.rounds_completed,
          reps_completed: log.reps_completed,
          notes: log.notes,
          completed_at: log.completed_at
        }));
        setWodLogs(mapped);
      }
    } catch (err) {
      console.error('Error fetching WOD logs:', err);
    }
  };

  const generateWOD = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-wod');

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

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
      const exercisesJson = JSON.parse(JSON.stringify(wod.exercises));
      
      const { error } = await supabase
        .from('saved_wods')
        .insert([{
          user_id: user.id,
          name: wod.name,
          format: wod.format,
          duration: wod.duration,
          exercises: exercisesJson,
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

  const openLogDialog = () => {
    setLogForm({
      completionTime: '',
      roundsCompleted: '',
      repsCompleted: '',
      notes: ''
    });
    setShowLogDialog(true);
  };

  const logWod = async () => {
    if (!wod || !user) return;
    
    setIsLogging(true);
    const XP_PER_WOD = 50;
    
    try {
      const exercisesJson = JSON.parse(JSON.stringify(wod.exercises));
      
      const { error } = await supabase
        .from('wod_logs')
        .insert([{
          user_id: user.id,
          wod_name: wod.name,
          wod_format: wod.format,
          wod_duration: wod.duration,
          wod_exercises: exercisesJson,
          completion_time: logForm.completionTime || null,
          rounds_completed: logForm.roundsCompleted ? parseInt(logForm.roundsCompleted) : null,
          reps_completed: logForm.repsCompleted ? parseInt(logForm.repsCompleted) : null,
          notes: logForm.notes || null
        }]);

      if (error) throw error;

      // Award XP for completing WOD
      const { data: currentStats } = await supabase
        .from('user_stats')
        .select('total_xp, total_workouts')
        .eq('user_id', user.id)
        .maybeSingle();

      if (currentStats) {
        await supabase
          .from('user_stats')
          .update({
            total_xp: currentStats.total_xp + XP_PER_WOD,
            total_workouts: currentStats.total_workouts + 1
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            total_xp: XP_PER_WOD,
            total_workouts: 1
          });
      }

      // Trigger confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#00FF00', '#1E90FF']
      });

      // Clear draft after successful log
      discardDraft();

      toast.success(
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          <span>WOD loggad! +{XP_PER_WOD} XP</span>
        </div>
      );
      setShowLogDialog(false);
      fetchWodLogs();
    } catch (error) {
      console.error('Error logging WOD:', error);
      toast.error('Kunde inte logga WOD');
    } finally {
      setIsLogging(false);
    }
  };

  const deleteWodLog = async (id: string) => {
    try {
      const { error } = await supabase
        .from('wod_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Logg borttagen');
      fetchWodLogs();
    } catch (error) {
      console.error('Error deleting WOD log:', error);
      toast.error('Kunde inte ta bort logg');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Draft Resume Card */}
      {hasDraft && !showLogDialog && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-transparent">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-primary" />
                <span>Du har ett påbörjat WOD-pass</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="default" size="sm" onClick={resumeDraft}>
                  <Play className="w-4 h-4 mr-1" />
                  Fortsätt
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowDeleteDraftDialog(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              {/* Ad when WOD is displayed */}
              <AdBanner size="horizontal" />
              
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg">{wod.name}</h3>
                  <Badge variant="secondary">{wod.format}</Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    {wod.duration}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {!wod.id && (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRefineDialog(true)}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Finjustera
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={openLogDialog}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Logga
                  </Button>
                </div>
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

      {/* WOD History */}
      {wodLogs.length > 0 && (
        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="w-5 h-5 text-primary" />
                    Loggade WODs ({wodLogs.length})
                  </CardTitle>
                  {showHistory ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                {wodLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-muted/30 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">{log.wod_name}</span>
                        <Badge variant="secondary" className="text-xs">{log.wod_format}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(log.completed_at)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteWodLog(log.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {log.completion_time && (
                        <Badge variant="outline" className="text-xs">
                          <Timer className="w-3 h-3 mr-1" />
                          {log.completion_time}
                        </Badge>
                      )}
                      {log.rounds_completed && (
                        <Badge variant="outline" className="text-xs">
                          {log.rounds_completed} rundor
                        </Badge>
                      )}
                      {log.reps_completed && (
                        <Badge variant="outline" className="text-xs">
                          +{log.reps_completed} reps
                        </Badge>
                      )}
                    </div>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground mt-2">{log.notes}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Saved WODs */}
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

      {/* Log WOD Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Logga WOD: {wod?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Ad in log dialog */}
            <AdBanner size="horizontal" />
            
            <div className="space-y-2">
              <Label htmlFor="completionTime">Tid (mm:ss eller total tid)</Label>
              <Input
                id="completionTime"
                placeholder="t.ex. 12:30 eller 15 min"
                value={logForm.completionTime}
                onChange={(e) => setLogForm({ ...logForm, completionTime: e.target.value })}
              />
            </div>

            {wod?.format.toLowerCase().includes('amrap') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="roundsCompleted">Antal rundor</Label>
                  <Input
                    id="roundsCompleted"
                    type="number"
                    placeholder="t.ex. 5"
                    value={logForm.roundsCompleted}
                    onChange={(e) => setLogForm({ ...logForm, roundsCompleted: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repsCompleted">Extra reps (på sista rundan)</Label>
                  <Input
                    id="repsCompleted"
                    type="number"
                    placeholder="t.ex. 8"
                    value={logForm.repsCompleted}
                    onChange={(e) => setLogForm({ ...logForm, repsCompleted: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Anteckningar</Label>
              <Textarea
                id="notes"
                placeholder="Hur kändes det? Skalning? Tips till nästa gång?"
                value={logForm.notes}
                onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={logWod} disabled={isLogging}>
              {isLogging ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-1" />
              )}
              Spara logg
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WOD Refine Dialog */}
      {wod && (
        <WODRefineDialog
          open={showRefineDialog}
          onOpenChange={setShowRefineDialog}
          wod={wod}
          onWodUpdate={(updatedWod) => setWod(updatedWod)}
          onComplete={() => setShowRefineDialog(false)}
        />
      )}

      {/* Draft Resume Dialog */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Fortsätt WOD-pass?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Du har ett påbörjat WOD-pass sparat. Vill du fortsätta där du slutade?
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                discardDraft();
                setShowDraftDialog(false);
                toast.success('Utkast borttaget');
              }}
            >
              Kasta
            </Button>
            <Button onClick={resumeDraft}>
              <Play className="w-4 h-4 mr-1" />
              Fortsätt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete draft confirmation dialog */}
      <AlertDialog open={showDeleteDraftDialog} onOpenChange={setShowDeleteDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort utkast?</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort det påbörjade WOD-passet? Detta kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                discardDraft();
                toast.success('Sparat utkast borttaget');
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
