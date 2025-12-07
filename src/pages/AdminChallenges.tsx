import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Users, Trophy, Calendar, Sparkles, Loader2, Edit2, X, Save, BarChart3, Bell } from "lucide-react";
import { AdminStats } from "@/components/AdminStats";
import { AdminPushNotification } from "@/components/AdminPushNotification";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface CommunityChallenge {
  id: string;
  title: string;
  description: string | null;
  theme: string | null;
  goal_description: string;
  goal_unit: string;
  target_value: number | null;
  winner_type: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminChallenges() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [challenges, setChallenges] = useState<CommunityChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generatingSuggestion, setGeneratingSuggestion] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [goalUnit, setGoalUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [winnerType, setWinnerType] = useState<"highest" | "first_to_goal">("highest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      toast.error("Du har inte behörighet att visa denna sida");
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, user, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchChallenges();
    }
  }, [isAdmin]);

  const fetchChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from("community_challenges")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      toast.error("Kunde inte hämta tävlingar");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !goalDescription.trim() || !goalUnit.trim() || !startDate || !endDate) {
      toast.error("Fyll i alla obligatoriska fält");
      return;
    }

    if (winnerType === "first_to_goal" && !targetValue) {
      toast.error("Målvärde krävs för 'Först till mål'-tävlingar");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.from("community_challenges").insert({
        title: title.trim(),
        description: description.trim() || null,
        theme: theme.trim() || null,
        goal_description: goalDescription.trim(),
        goal_unit: goalUnit.trim(),
        target_value: targetValue ? parseInt(targetValue) : null,
        winner_type: winnerType,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Tävling skapad!");
      resetForm();
      fetchChallenges();
    } catch (error) {
      console.error("Error creating challenge:", error);
      toast.error("Kunde inte skapa tävling");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTheme("");
    setGoalDescription("");
    setGoalUnit("");
    setTargetValue("");
    setWinnerType("highest");
    setStartDate("");
    setEndDate("");
    setEditingId(null);
  };

  const startEditing = (challenge: CommunityChallenge) => {
    setTitle(challenge.title);
    setDescription(challenge.description || "");
    setTheme(challenge.theme || "");
    setGoalDescription(challenge.goal_description);
    setGoalUnit(challenge.goal_unit);
    setTargetValue(challenge.target_value?.toString() || "");
    setWinnerType(challenge.winner_type as "highest" | "first_to_goal");
    setStartDate(new Date(challenge.start_date).toISOString().slice(0, 16));
    setEndDate(new Date(challenge.end_date).toISOString().slice(0, 16));
    setEditingId(challenge.id);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingId) return;
    
    if (!title.trim() || !goalDescription.trim() || !goalUnit.trim() || !startDate || !endDate) {
      toast.error("Fyll i alla obligatoriska fält");
      return;
    }

    if (winnerType === "first_to_goal" && !targetValue) {
      toast.error("Målvärde krävs för 'Först till mål'-tävlingar");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("community_challenges")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          theme: theme.trim() || null,
          goal_description: goalDescription.trim(),
          goal_unit: goalUnit.trim(),
          target_value: targetValue ? parseInt(targetValue) : null,
          winner_type: winnerType,
          start_date: new Date(startDate).toISOString(),
          end_date: new Date(endDate).toISOString(),
        })
        .eq("id", editingId);

      if (error) throw error;

      toast.success("Tävling uppdaterad!");
      resetForm();
      fetchChallenges();
    } catch (error) {
      console.error("Error updating challenge:", error);
      toast.error("Kunde inte uppdatera tävling");
    } finally {
      setSaving(false);
    }
  };

  const generateAISuggestion = async () => {
    setGeneratingSuggestion(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-challenge");
      
      if (error) throw error;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Fill form with suggestion
      setTitle(data.title || "");
      setDescription(data.description || "");
      setTheme(data.theme || "");
      setGoalDescription(data.goal_description || "");
      setGoalUnit(data.goal_unit || "");
      setTargetValue(data.target_value?.toString() || "");
      setWinnerType(data.winner_type || "highest");
      
      // Format dates for datetime-local input
      if (data.start_date) {
        const start = new Date(data.start_date);
        setStartDate(start.toISOString().slice(0, 16));
      }
      if (data.end_date) {
        const end = new Date(data.end_date);
        setEndDate(end.toISOString().slice(0, 16));
      }

      toast.success("AI-förslag genererat! Granska och justera vid behov.");
    } catch (error) {
      console.error("Error generating suggestion:", error);
      toast.error("Kunde inte generera förslag");
    } finally {
      setGeneratingSuggestion(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from("community_challenges")
        .update({ is_active: !currentActive })
        .eq("id", id);

      if (error) throw error;
      
      setChallenges(prev => 
        prev.map(c => c.id === id ? { ...c, is_active: !currentActive } : c)
      );
      toast.success(currentActive ? "Tävling avaktiverad" : "Tävling aktiverad");
    } catch (error) {
      console.error("Error toggling challenge:", error);
      toast.error("Kunde inte uppdatera tävling");
    }
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm("Är du säker på att du vill ta bort denna tävling?")) return;

    try {
      const { error } = await supabase
        .from("community_challenges")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setChallenges(prev => prev.filter(c => c.id !== id));
      toast.success("Tävling borttagen");
    } catch (error) {
      console.error("Error deleting challenge:", error);
      toast.error("Kunde inte ta bort tävling");
    }
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Laddar...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Statistik och tävlingshantering</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistik
            </TabsTrigger>
            <TabsTrigger value="challenges" className="gap-2">
              <Trophy className="h-4 w-4" />
              Tävlingar
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notiser
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="mt-6">
            <AdminStats />
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <AdminPushNotification />
          </TabsContent>

          <TabsContent value="challenges" className="mt-6 space-y-6">
        {/* Create/Edit challenge form */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {editingId ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingId ? "Redigera tävling" : "Skapa ny tävling"}
                </CardTitle>
                <CardDescription>
                  {editingId 
                    ? "Ändra informationen nedan och spara" 
                    : "Fyll i informationen nedan för att skapa en ny community-tävling"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {editingId && (
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Avbryt
                  </Button>
                )}
                {!editingId && (
                  <Button
                    variant="outline"
                    onClick={generateAISuggestion}
                    disabled={generatingSuggestion}
                    className="gap-2"
                  >
                    {generatingSuggestion ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    AI-förslag
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingId ? handleSaveEdit : handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="t.ex. Sommarens träningsutmaning"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Input
                    id="theme"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="t.ex. Sommar, Jul, Nyårslöfte"
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivning</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Beskriv tävlingen och vad deltagarna ska göra..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goalDescription">Målbeskrivning *</Label>
                  <Input
                    id="goalDescription"
                    value={goalDescription}
                    onChange={(e) => setGoalDescription(e.target.value)}
                    placeholder="t.ex. Totalt antal träningspass"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goalUnit">Målenhet *</Label>
                  <Input
                    id="goalUnit"
                    value={goalUnit}
                    onChange={(e) => setGoalUnit(e.target.value)}
                    placeholder="t.ex. pass, km, minuter, kg"
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="winnerType">Vinnarlogik *</Label>
                  <Select value={winnerType} onValueChange={(v) => setWinnerType(v as "highest" | "first_to_goal")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="highest">Högsta värdet vinner</SelectItem>
                      <SelectItem value="first_to_goal">Först till mål vinner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetValue">
                    Målvärde {winnerType === "first_to_goal" ? "*" : "(valfritt)"}
                  </Label>
                  <Input
                    id="targetValue"
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="t.ex. 30"
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Startdatum *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Slutdatum *</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" disabled={creating || saving} className="w-full md:w-auto">
                {editingId 
                  ? (saving ? "Sparar..." : "Spara ändringar")
                  : (creating ? "Skapar..." : "Skapa tävling")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing challenges */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Befintliga tävlingar</h2>
          
          {challenges.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Inga tävlingar skapade än
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {challenges.map((challenge) => (
                <Card key={challenge.id} className={!challenge.is_active ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-foreground">{challenge.title}</h3>
                          {challenge.theme && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {challenge.theme}
                            </span>
                          )}
                        </div>
                        {challenge.description && (
                          <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(challenge.start_date), "d MMM", { locale: sv })} - {format(new Date(challenge.end_date), "d MMM yyyy", { locale: sv })}
                          </span>
                          <span>
                            Mål: {challenge.goal_description} ({challenge.goal_unit})
                          </span>
                          <span>
                            {challenge.winner_type === "highest" ? "Högsta vinner" : `Först till ${challenge.target_value}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${challenge.id}`} className="text-sm">
                            Aktiv
                          </Label>
                          <Switch
                            id={`active-${challenge.id}`}
                            checked={challenge.is_active}
                            onCheckedChange={() => toggleActive(challenge.id, challenge.is_active)}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(challenge)}
                          className="text-primary hover:text-primary"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteChallenge(challenge.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
