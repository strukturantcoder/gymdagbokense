import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2, Users, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PublicProgramCard } from './PublicProgramCard';
import { Button } from '@/components/ui/button';

interface FollowedProgram {
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
  created_at: string;
}

interface FollowedCreatorsProgramsProps {
  likedPrograms: Set<string>;
  onLikeChange: () => void;
  onCopy: (programId: string) => void;
  onViewDetails: (programId: string) => void;
}

export function FollowedCreatorsPrograms({
  likedPrograms,
  onLikeChange,
  onCopy,
  onViewDetails
}: FollowedCreatorsProgramsProps) {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<FollowedProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchFollowedPrograms();
      fetchFollowingCount();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchFollowedPrograms = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_followed_creators_programs', {
        p_user_id: user.id,
        limit_count: 10
      });
      
      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching followed programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowingCount = async () => {
    if (!user) return;
    
    const { count } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id);
    
    setFollowingCount(count || 0);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (followingCount === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold mb-1">Du följer inga skapare än</h3>
          <p className="text-sm text-muted-foreground">
            Följ programskapare för att se deras senaste program här
          </p>
        </CardContent>
      </Card>
    );
  }

  if (programs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold mb-1">Inga nya program</h3>
          <p className="text-sm text-muted-foreground">
            Skaparna du följer har inga publika program just nu
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Från skapare du följer
        </h2>
        <span className="text-sm text-muted-foreground">
          Följer {followingCount} skapare
        </span>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {programs.map((program) => (
            <div key={program.program_id} className="w-[300px] flex-shrink-0">
              <PublicProgramCard
                program={program}
                isLiked={likedPrograms.has(program.program_id)}
                onLikeChange={onLikeChange}
                onCopy={onCopy}
                onViewDetails={onViewDetails}
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </motion.div>
  );
}
