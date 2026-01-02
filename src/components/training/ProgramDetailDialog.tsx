import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Heart, Copy, Dumbbell, Calendar, Target, Users, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { FollowButton } from './FollowButton';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  notes?: string;
}

interface WorkoutDay {
  name: string;
  exercises: Exercise[];
}

interface ProgramDetailDialogProps {
  programId: string | null;
  programMeta: {
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
  } | null;
  isLiked: boolean;
  isFollowing?: boolean;
  isOpen: boolean;
  onClose: () => void;
  onLikeChange: () => void;
  onFollowChange?: (following: boolean) => void;
  onCopy: (programId: string) => void;
}

export function ProgramDetailDialog({
  programId,
  programMeta,
  isLiked,
  isFollowing = false,
  isOpen,
  onClose,
  onLikeChange,
  onFollowChange,
  onCopy
}: ProgramDetailDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [programData, setProgramData] = useState<WorkoutDay[] | null>(null);
  const [liked, setLiked] = useState(isLiked);
  const [likesCount, setLikesCount] = useState(programMeta?.likes_count || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [following, setFollowing] = useState(isFollowing);

  const isOwnProgram = user?.id === programMeta?.author_id;

  useEffect(() => {
    if (isOpen && programId) {
      fetchProgramData();
    }
  }, [isOpen, programId]);

  useEffect(() => {
    setLiked(isLiked);
    setLikesCount(programMeta?.likes_count || 0);
    setFollowing(isFollowing);
  }, [isLiked, programMeta?.likes_count, isFollowing]);

  const handleFollowChange = (following: boolean) => {
    setFollowing(following);
    onFollowChange?.(following);
  };

  const fetchProgramData = async () => {
    if (!programId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workout_programs')
        .select('program_data')
        .eq('id', programId)
        .single();

      if (error) throw error;
      
      // Parse program_data
      const rawData = data?.program_data as unknown;
      if (rawData && typeof rawData === 'object') {
        if ('days' in rawData && Array.isArray((rawData as { days: unknown }).days)) {
          setProgramData((rawData as { days: WorkoutDay[] }).days);
        } else if (Array.isArray(rawData)) {
          setProgramData(rawData as WorkoutDay[]);
        }
      }
    } catch (error) {
      console.error('Error fetching program:', error);
      toast.error('Kunde inte ladda programdetaljer');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user || !programId) {
      toast.error('Logga in för att gilla program');
      return;
    }

    setIsLiking(true);
    try {
      if (liked) {
        await supabase
          .from('program_likes')
          .delete()
          .eq('program_id', programId)
          .eq('user_id', user.id);
        setLikesCount(prev => prev - 1);
        setLiked(false);
      } else {
        await supabase
          .from('program_likes')
          .insert({ program_id: programId, user_id: user.id });
        setLikesCount(prev => prev + 1);
        setLiked(true);
      }
      onLikeChange();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Kunde inte uppdatera');
    } finally {
      setIsLiking(false);
    }
  };

  const handleCopy = async () => {
    if (!user || !programId || !programMeta) {
      toast.error('Logga in för att kopiera program');
      return;
    }

    if (isOwnProgram) {
      toast.error('Du kan inte kopiera ditt eget program');
      return;
    }

    setIsCopying(true);
    try {
      const { data: originalProgram, error: fetchError } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (fetchError || !originalProgram) throw fetchError;

      const { data: newProgram, error: createError } = await supabase
        .from('workout_programs')
        .insert({
          user_id: user.id,
          name: `${programMeta.program_name} (kopia)`,
          goal: originalProgram.goal,
          experience_level: originalProgram.experience_level,
          days_per_week: originalProgram.days_per_week,
          program_data: originalProgram.program_data,
          description: originalProgram.description
        })
        .select()
        .single();

      if (createError || !newProgram) throw createError;

      await supabase
        .from('program_copies')
        .insert({
          original_program_id: programId,
          copied_program_id: newProgram.id,
          user_id: user.id
        });

      toast.success('Program kopierat till ditt konto!');
      onCopy(newProgram.id);
      onClose();
    } catch (error) {
      console.error('Error copying program:', error);
      toast.error('Kunde inte kopiera programmet');
    } finally {
      setIsCopying(false);
    }
  };

  const goalLabels: Record<string, string> = {
    'strength': 'Styrka',
    'muscle': 'Muskelmassa',
    'endurance': 'Uthållighet',
    'weight_loss': 'Viktnedgång',
    'general': 'Allmän fitness'
  };

  const levelLabels: Record<string, string> = {
    'beginner': 'Nybörjare',
    'intermediate': 'Medel',
    'advanced': 'Avancerad'
  };

  if (!programMeta) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={programMeta.author_avatar || undefined} />
                <AvatarFallback>
                  {programMeta.author_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">{programMeta.program_name}</DialogTitle>
                <p className="text-sm text-muted-foreground">av {programMeta.author_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwnProgram ? (
                <Badge variant="secondary">Ditt program</Badge>
              ) : (
                <FollowButton
                  creatorId={programMeta.author_id}
                  isFollowing={following}
                  onFollowChange={handleFollowChange}
                />
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            {/* Description */}
            {programMeta.program_description && (
              <p className="text-muted-foreground">
                {programMeta.program_description}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <Target className="w-3 h-3" />
                {goalLabels[programMeta.goal] || programMeta.goal}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Dumbbell className="w-3 h-3" />
                {levelLabels[programMeta.experience_level] || programMeta.experience_level}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Calendar className="w-3 h-3" />
                {programMeta.days_per_week} dagar/vecka
              </Badge>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                {likesCount} gillningar
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {programMeta.copies_count} kopior
              </span>
            </div>

            {/* Exercises */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Dumbbell className="w-5 h-5" />
                Övningar
              </h3>

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : programData && programData.length > 0 ? (
                <Accordion type="multiple" className="w-full" defaultValue={programData.map((_, i) => `day-${i}`)}>
                  {programData.map((day, dayIndex) => (
                    <AccordionItem key={dayIndex} value={`day-${dayIndex}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono">
                            Dag {dayIndex + 1}
                          </Badge>
                          <span className="font-medium">{day.name}</span>
                          <span className="text-muted-foreground text-sm">
                            ({day.exercises?.length || 0} övningar)
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pl-4">
                          {day.exercises?.map((exercise, exIndex) => (
                            <div 
                              key={exIndex} 
                              className="flex items-center justify-between py-2 border-b last:border-0"
                            >
                              <span className="font-medium">{exercise.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {exercise.sets} x {exercise.reps}
                                {exercise.notes && (
                                  <span className="ml-2 italic">({exercise.notes})</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  Inga övningar tillgängliga
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="p-6 pt-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Stäng
          </Button>
          <Button
            variant={liked ? 'default' : 'outline'}
            onClick={handleLike}
            disabled={isLiking}
            className={liked ? 'bg-red-500 hover:bg-red-600' : ''}
          >
            <Heart className={`w-4 h-4 mr-1 ${liked ? 'fill-white' : ''}`} />
            {liked ? 'Gillat' : 'Gilla'}
          </Button>
          {!isOwnProgram && (
            <Button onClick={handleCopy} disabled={isCopying}>
              {isCopying ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Copy className="w-4 h-4 mr-1" />
              )}
              Kopiera program
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
