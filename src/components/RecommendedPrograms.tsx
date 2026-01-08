import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, Heart, Copy, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface RecommendedProgram {
  program_id: string;
  program_name: string;
  program_description: string | null;
  goal: string;
  experience_level: string;
  days_per_week: number;
  author_name: string;
  author_avatar: string | null;
  author_id: string;
  likes_count: number;
  copies_count: number;
}

interface UserPreferences {
  goal: string | null;
  experience_level: string | null;
}

const goalLabels: Record<string, string> = {
  muscle_gain: 'Muskeltillväxt',
  fat_loss: 'Fettförbränning',
  strength: 'Styrka',
  endurance: 'Uthållighet',
  general_fitness: 'Allmän form'
};

const levelLabels: Record<string, string> = {
  beginner: 'Nybörjare',
  intermediate: 'Mellanliggande',
  advanced: 'Avancerad'
};

export default function RecommendedPrograms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<RecommendedProgram[]>([]);
  const [userPrefs, setUserPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchUserPreferencesAndPrograms();
    }
  }, [user]);

  const fetchUserPreferencesAndPrograms = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Fetch user's most recent program to determine their preferences
    const { data: userPrograms } = await supabase
      .from('workout_programs')
      .select('goal, experience_level')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1);
    
    let prefs: UserPreferences = { goal: null, experience_level: null };
    
    if (userPrograms && userPrograms.length > 0) {
      prefs = {
        goal: userPrograms[0].goal,
        experience_level: userPrograms[0].experience_level
      };
      setUserPrefs(prefs);
    }
    
    // Fetch all popular programs
    const { data: allPrograms, error } = await supabase.rpc('get_popular_programs', { limit_count: 50 });
    
    if (error) {
      console.error('Error fetching programs:', error);
      setLoading(false);
      return;
    }

    if (allPrograms) {
      // Filter out user's own programs
      let filtered = allPrograms.filter((p: RecommendedProgram) => p.author_id !== user.id);
      
      // Score and sort programs based on user preferences
      const scored = filtered.map((p: RecommendedProgram) => {
        let score = p.likes_count + p.copies_count * 2; // Base score from popularity
        
        // Boost score if matches user preferences
        if (prefs.goal && p.goal === prefs.goal) {
          score += 50;
        }
        if (prefs.experience_level && p.experience_level === prefs.experience_level) {
          score += 30;
        }
        
        return { ...p, score };
      });
      
      // Sort by score and take top 4
      scored.sort((a, b) => b.score - a.score);
      setPrograms(scored.slice(0, 4));
    }

    // Fetch user's likes
    const { data: likes } = await supabase
      .from('program_likes')
      .select('program_id')
      .eq('user_id', user.id);
    
    if (likes) {
      setUserLikes(new Set(likes.map(l => l.program_id)));
    }

    setLoading(false);
  };

  const handleLike = async (programId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Logga in för att gilla program');
      return;
    }

    const isLiked = userLikes.has(programId);

    if (isLiked) {
      const { error } = await supabase
        .from('program_likes')
        .delete()
        .eq('program_id', programId)
        .eq('user_id', user.id);

      if (!error) {
        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(programId);
          return newSet;
        });
        setPrograms(prev => prev.map(p => 
          p.program_id === programId ? { ...p, likes_count: p.likes_count - 1 } : p
        ));
      }
    } else {
      const { error } = await supabase
        .from('program_likes')
        .insert({ program_id: programId, user_id: user.id });

      if (!error) {
        setUserLikes(prev => new Set(prev).add(programId));
        setPrograms(prev => prev.map(p => 
          p.program_id === programId ? { ...p, likes_count: p.likes_count + 1 } : p
        ));
      }
    }
  };

  const handleCopy = async (program: RecommendedProgram, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Logga in för att kopiera program');
      return;
    }

    try {
      // Fetch the full program data
      const { data: originalProgram, error: fetchError } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('id', program.program_id)
        .single();

      if (fetchError || !originalProgram) {
        throw new Error('Kunde inte hämta programmet');
      }

      // Create a copy
      const { data: newProgram, error: insertError } = await supabase
        .from('workout_programs')
        .insert({
          user_id: user.id,
          name: `${originalProgram.name} (kopia)`,
          goal: originalProgram.goal,
          experience_level: originalProgram.experience_level,
          days_per_week: originalProgram.days_per_week,
          program_data: originalProgram.program_data,
          is_public: false
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Record the copy
      if (newProgram) {
        await supabase.from('program_copies').insert({
          original_program_id: program.program_id,
          copied_program_id: newProgram.id,
          user_id: user.id
        });
      }

      toast.success('Program kopierat till dina program!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error copying program:', error);
      toast.error('Kunde inte kopiera programmet');
    }
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (programs.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Rekommenderade program
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Inga publika program att rekommendera ännu.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Rekommenderade program
            {userPrefs?.goal && (
              <Badge variant="secondary" className="ml-2 font-normal">
                Baserat på: {goalLabels[userPrefs.goal] || userPrefs.goal}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/programs')}
            className="text-muted-foreground hover:text-foreground"
          >
            Se alla
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {programs.map(program => (
            <div
              key={program.program_id}
              className="group p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => navigate('/programs')}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm truncate">{program.program_name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {program.program_description || 'Inget beskrivning'}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge variant="outline" className="text-xs">
                  {goalLabels[program.goal] || program.goal}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {levelLabels[program.experience_level] || program.experience_level}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {program.days_per_week} dagar/vecka
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={program.author_avatar || undefined} />
                    <AvatarFallback className="text-[10px] bg-primary/10">
                      {program.author_name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {program.author_name || 'Anonym'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => handleLike(program.program_id, e)}
                  >
                    <Heart 
                      className={`w-3.5 h-3.5 ${userLikes.has(program.program_id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
                    />
                  </Button>
                  <span className="text-xs text-muted-foreground">{program.likes_count}</span>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-1"
                    onClick={(e) => handleCopy(program, e)}
                  >
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
