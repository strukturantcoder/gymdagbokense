import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck, FileText, Users, Loader2, Instagram, Facebook, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PublicProgramCard } from '@/components/training/PublicProgramCard';
import { ProgramDetailDialog } from '@/components/training/ProgramDetailDialog';
import { FollowButton } from '@/components/training/FollowButton';

interface CreatorStats {
  followers_count: number;
  following_count: number;
  programs_count: number;
}

interface CreatorProgram {
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

const CreatorProfile = () => {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [creator, setCreator] = useState<{ display_name: string; avatar_url: string | null; bio: string | null; instagram_username: string | null; facebook_url: string | null; youtube_url: string | null; cover_image_url: string | null; show_instagram: boolean; show_facebook: boolean; show_youtube: boolean } | null>(null);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [programs, setPrograms] = useState<CreatorProgram[]>([]);
  const [userLikes, setUserLikes] = useState<string[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  const isOwnProfile = user?.id === creatorId;

  const selectedProgram = programs.find(p => p.program_id === selectedProgramId) || null;

  useEffect(() => {
    if (creatorId) {
      fetchCreatorData();
    }
  }, [creatorId, user]);

  const fetchCreatorData = async () => {
    if (!creatorId) return;
    
    setLoading(true);
    
    // Fetch creator profile, stats, and programs in parallel
    const [profileRes, statsRes, programsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, avatar_url, bio, instagram_username, facebook_url, youtube_url, cover_image_url, show_instagram, show_facebook, show_youtube')
        .eq('user_id', creatorId)
        .single(),
      supabase.rpc('get_creator_stats', { creator_id: creatorId }),
      supabase.rpc('get_popular_programs', { limit_count: 100 })
    ]);

    if (profileRes.data) {
      setCreator(profileRes.data);
    }

    if (statsRes.data && statsRes.data[0]) {
      setStats(statsRes.data[0]);
    }

    if (programsRes.data) {
      // Filter programs by this creator
      const creatorPrograms = programsRes.data.filter(
        (p: CreatorProgram) => p.author_id === creatorId
      );
      setPrograms(creatorPrograms);
    }

    // Fetch user-specific data if logged in
    if (user) {
      const [likesRes, followRes] = await Promise.all([
        supabase
          .from('program_likes')
          .select('program_id')
          .eq('user_id', user.id),
        supabase
          .from('user_follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', creatorId)
          .single()
      ]);

      if (likesRes.data) {
        setUserLikes(likesRes.data.map(l => l.program_id));
      }

      setIsFollowing(!!followRes.data);
    }

    setLoading(false);
  };

  const handleFollowChange = (following: boolean) => {
    setIsFollowing(following);
    if (stats) {
      setStats({
        ...stats,
        followers_count: following ? stats.followers_count + 1 : stats.followers_count - 1
      });
    }
  };

  const handleLikeChange = () => {
    fetchCreatorData();
  };

  const handleCopy = () => {
    fetchCreatorData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka
        </Button>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Skaparen hittades inte</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Cover Image */}
      <div className="relative h-32 sm:h-48 bg-gradient-to-br from-primary/20 to-primary/5">
        {creator.cover_image_url && (
          <img 
            src={creator.cover_image_url} 
            alt="Omslagsbild" 
            className="w-full h-full object-cover"
          />
        )}
        {/* Back button overlay */}
        <div className="absolute top-4 left-4">
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)} className="shadow-md">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Creator Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 -mt-12 sm:-mt-16">
          <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
            <AvatarImage src={creator.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {creator.display_name?.charAt(0)?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold mb-2">{creator.display_name || 'Anonym'}</h1>
            
            {creator.bio && (
              <p className="text-muted-foreground mb-4 max-w-lg">{creator.bio}</p>
            )}

            {((creator.instagram_username && creator.show_instagram) || (creator.facebook_url && creator.show_facebook) || (creator.youtube_url && creator.show_youtube)) && (
              <div className="flex flex-wrap gap-3 mb-4 justify-center sm:justify-start">
                {creator.instagram_username && creator.show_instagram && (
                  <a
                    href={`https://instagram.com/${creator.instagram_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                    <span className="text-sm">@{creator.instagram_username}</span>
                  </a>
                )}
                {creator.facebook_url && creator.show_facebook && (
                  <a
                    href={creator.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Facebook className="w-5 h-5" />
                    <span className="text-sm">Facebook</span>
                  </a>
                )}
                {creator.youtube_url && creator.show_youtube && (
                  <a
                    href={creator.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Youtube className="w-5 h-5" />
                    <span className="text-sm">YouTube</span>
                  </a>
                )}
              </div>
            )}
            
            {stats && (
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 mb-4">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <UserCheck className="w-4 h-4" />
                  <span className="font-medium text-foreground">{stats.followers_count}</span>
                  <span>följare</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="font-medium text-foreground">{stats.following_count}</span>
                  <span>följer</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium text-foreground">{stats.programs_count}</span>
                  <span>program</span>
                </div>
              </div>
            )}

            {!isOwnProfile && creatorId && (
              <FollowButton
                creatorId={creatorId}
                isFollowing={isFollowing}
                onFollowChange={handleFollowChange}
              />
            )}
          </div>
        </div>

        {/* Programs Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Program ({programs.length})
          </h2>

          {programs.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                {isOwnProfile 
                  ? 'Du har inga publika program ännu' 
                  : 'Inga publika program att visa'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {programs.map(program => (
                <PublicProgramCard
                  key={program.program_id}
                  program={program}
                  isLiked={userLikes.includes(program.program_id)}
                  onLikeChange={handleLikeChange}
                  onCopy={handleCopy}
                  onViewDetails={() => setSelectedProgramId(program.program_id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Program Detail Dialog */}
      <ProgramDetailDialog
        programId={selectedProgramId}
        programMeta={selectedProgram ? {
          program_name: selectedProgram.program_name,
          program_description: selectedProgram.program_description,
          goal: selectedProgram.goal,
          experience_level: selectedProgram.experience_level,
          days_per_week: selectedProgram.days_per_week,
          author_name: selectedProgram.author_name,
          author_avatar: selectedProgram.author_avatar,
          author_id: selectedProgram.author_id,
          likes_count: selectedProgram.likes_count,
          copies_count: selectedProgram.copies_count
        } : null}
        isOpen={!!selectedProgramId}
        onClose={() => setSelectedProgramId(null)}
        isLiked={selectedProgramId ? userLikes.includes(selectedProgramId) : false}
        onLikeChange={handleLikeChange}
        isFollowing={isFollowing}
        onFollowChange={() => handleFollowChange(!isFollowing)}
        onCopy={handleCopy}
      />
    </div>
  );
};

export default CreatorProfile;
