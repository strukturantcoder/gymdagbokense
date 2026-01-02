import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Copy, Dumbbell, Calendar, Target, Users, Loader2, Eye, UserCheck, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface PublicProgramCardProps {
  program: {
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
  };
  isLiked: boolean;
  onLikeChange: () => void;
  onCopy: (programId: string) => void;
  onViewDetails?: (programId: string) => void;
}

export function PublicProgramCard({ program, isLiked, onLikeChange, onCopy, onViewDetails }: PublicProgramCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [likesCount, setLikesCount] = useState(program.likes_count);
  const [isLiking, setIsLiking] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [liked, setLiked] = useState(isLiked);
  const [creatorStats, setCreatorStats] = useState<{ followers_count: number; programs_count: number } | null>(null);

  const isOwnProgram = user?.id === program.author_id;

  useEffect(() => {
    const fetchCreatorStats = async () => {
      const { data } = await supabase.rpc('get_creator_stats', { creator_id: program.author_id });
      if (data && data[0]) {
        setCreatorStats({ followers_count: data[0].followers_count, programs_count: data[0].programs_count });
      }
    };
    fetchCreatorStats();
  }, [program.author_id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Logga in för att gilla program');
      return;
    }

    setIsLiking(true);
    try {
      if (liked) {
        await supabase
          .from('program_likes')
          .delete()
          .eq('program_id', program.program_id)
          .eq('user_id', user.id);
        setLikesCount(prev => prev - 1);
        setLiked(false);
      } else {
        await supabase
          .from('program_likes')
          .insert({ program_id: program.program_id, user_id: user.id });
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

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Logga in för att kopiera program');
      return;
    }

    if (isOwnProgram) {
      toast.error('Du kan inte kopiera ditt eget program');
      return;
    }

    setIsCopying(true);
    try {
      // Fetch the full program data
      const { data: originalProgram, error: fetchError } = await supabase
        .from('workout_programs')
        .select('*')
        .eq('id', program.program_id)
        .single();

      if (fetchError || !originalProgram) throw fetchError;

      // Create a copy
      const { data: newProgram, error: createError } = await supabase
        .from('workout_programs')
        .insert({
          user_id: user.id,
          name: `${program.program_name} (kopia)`,
          goal: originalProgram.goal,
          experience_level: originalProgram.experience_level,
          days_per_week: originalProgram.days_per_week,
          program_data: originalProgram.program_data,
          description: originalProgram.description
        })
        .select()
        .single();

      if (createError || !newProgram) throw createError;

      // Record the copy
      await supabase
        .from('program_copies')
        .insert({
          original_program_id: program.program_id,
          copied_program_id: newProgram.id,
          user_id: user.id
        });

      toast.success('Program kopierat till ditt konto!');
      onCopy(newProgram.id);
    } catch (error) {
      console.error('Error copying program:', error);
      toast.error('Kunde inte kopiera programmet');
    } finally {
      setIsCopying(false);
    }
  };

  const handleCardClick = () => {
    if (onViewDetails) {
      onViewDetails(program.program_id);
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <Card 
        className="h-full hover:border-primary/50 transition-colors cursor-pointer"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/creator/${program.author_id}`);
              }}
            >
              <Avatar className="h-10 w-10 group-hover:ring-2 ring-primary transition-all">
                <AvatarImage src={program.author_avatar || undefined} />
                <AvatarFallback>
                  {program.author_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{program.program_name}</CardTitle>
                <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">av {program.author_name}</p>
                {creatorStats && (
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3" />
                      {creatorStats.followers_count} följare
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {creatorStats.programs_count} program
                    </span>
                  </div>
                )}
              </div>
            </div>
            {isOwnProgram && (
              <Badge variant="secondary">Ditt program</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {program.program_description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {program.program_description}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1">
              <Target className="w-3 h-3" />
              {goalLabels[program.goal] || program.goal}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Dumbbell className="w-3 h-3" />
              {levelLabels[program.experience_level] || program.experience_level}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar className="w-3 h-3" />
              {program.days_per_week} dagar/vecka
            </Badge>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className={`w-4 h-4 ${liked ? 'fill-red-500 text-red-500' : ''}`} />
                {likesCount}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {program.copies_count} kopior
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCardClick}
                className="text-muted-foreground"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant={liked ? 'default' : 'outline'}
                size="sm"
                onClick={handleLike}
                disabled={isLiking}
                className={liked ? 'bg-red-500 hover:bg-red-600' : ''}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-white' : ''}`} />
              </Button>
              {!isOwnProgram && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={isCopying}
                >
                  {isCopying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Kopiera
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
