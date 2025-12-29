import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Trophy, TrendingUp, Search, Dumbbell, Loader2, Crown, Medal } from 'lucide-react';
import { PublicProgramCard } from '@/components/training/PublicProgramCard';
import { ProgramDetailDialog } from '@/components/training/ProgramDetailDialog';

interface PopularProgram {
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

export default function PublicPrograms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<PopularProgram[]>([]);
  const [likedPrograms, setLikedPrograms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  const selectedProgram = programs.find(p => p.program_id === selectedProgramId) || null;

  useEffect(() => {
    fetchPrograms();
    if (user) {
      fetchUserLikes();
    }
  }, [user]);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_popular_programs', { limit_count: 50 });
      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLikes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('program_likes')
      .select('program_id')
      .eq('user_id', user.id);
    
    if (data) {
      setLikedPrograms(new Set(data.map(l => l.program_id)));
    }
  };

  const filteredPrograms = programs.filter(p => 
    p.program_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.author_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.program_description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topPrograms = [...filteredPrograms].sort((a, b) => b.likes_count - a.likes_count).slice(0, 10);
  const newestPrograms = [...filteredPrograms].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const mostCopied = [...filteredPrograms].sort((a, b) => b.copies_count - a.copies_count);

  const handleCopy = (newProgramId: string) => {
    navigate('/training');
  };

  const handleViewDetails = (programId: string) => {
    setSelectedProgramId(programId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gym-orange to-gym-amber rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold">PROGRAM</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
            Träningsprogram
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Upptäck och kopiera de bästa träningsprogrammen från vårt community
          </p>
        </motion.div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Sök program eller skapare..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : programs.length === 0 ? (
          <Card className="max-w-md mx-auto border-dashed">
            <CardContent className="py-12 text-center">
              <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold mb-2">Inga publika program än</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Var först med att dela ditt träningsprogram!
              </p>
              <Button onClick={() => navigate('/training')}>
                Gå till träning
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="top" className="space-y-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="top" className="gap-2">
                <Trophy className="w-4 h-4" />
                Topplista
              </TabsTrigger>
              <TabsTrigger value="newest" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Nyaste
              </TabsTrigger>
              <TabsTrigger value="popular" className="gap-2">
                <Crown className="w-4 h-4" />
                Mest kopierade
              </TabsTrigger>
            </TabsList>

            <TabsContent value="top" className="space-y-6">
              {/* Top 3 Podium */}
              {topPrograms.length >= 3 && (
                <div className="flex justify-center items-end gap-4 mb-8">
                  {/* 2nd Place */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center"
                  >
                    <div className="relative">
                      <Medal className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <div className="w-20 h-20 bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center text-2xl font-bold text-white">
                        2
                      </div>
                    </div>
                    <p className="text-sm font-medium mt-2 truncate max-w-20">{topPrograms[1].program_name}</p>
                    <Badge variant="secondary" className="text-xs">{topPrograms[1].likes_count} ❤️</Badge>
                  </motion.div>

                  {/* 1st Place */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <div className="relative">
                      <Crown className="w-10 h-10 mx-auto text-yellow-500 mb-2" />
                      <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                        1
                      </div>
                    </div>
                    <p className="text-sm font-medium mt-2 truncate max-w-24">{topPrograms[0].program_name}</p>
                    <Badge className="bg-yellow-500 text-xs">{topPrograms[0].likes_count} ❤️</Badge>
                  </motion.div>

                  {/* 3rd Place */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center"
                  >
                    <div className="relative">
                      <Medal className="w-8 h-8 mx-auto text-amber-700 mb-2" />
                      <div className="w-20 h-20 bg-gradient-to-br from-amber-600 to-amber-800 rounded-lg flex items-center justify-center text-2xl font-bold text-white">
                        3
                      </div>
                    </div>
                    <p className="text-sm font-medium mt-2 truncate max-w-20">{topPrograms[2].program_name}</p>
                    <Badge variant="secondary" className="text-xs">{topPrograms[2].likes_count} ❤️</Badge>
                  </motion.div>
                </div>
              )}

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topPrograms.map((program, index) => (
                  <PublicProgramCard
                    key={program.program_id}
                    program={program}
                    isLiked={likedPrograms.has(program.program_id)}
                    onLikeChange={fetchUserLikes}
                    onCopy={handleCopy}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="newest">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {newestPrograms.map((program) => (
                  <PublicProgramCard
                    key={program.program_id}
                    program={program}
                    isLiked={likedPrograms.has(program.program_id)}
                    onLikeChange={fetchUserLikes}
                    onCopy={handleCopy}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="popular">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mostCopied.map((program) => (
                  <PublicProgramCard
                    key={program.program_id}
                    program={program}
                    isLiked={likedPrograms.has(program.program_id)}
                    onLikeChange={fetchUserLikes}
                    onCopy={handleCopy}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Program Detail Dialog */}
        <ProgramDetailDialog
          programId={selectedProgramId}
          programMeta={selectedProgram}
          isLiked={selectedProgramId ? likedPrograms.has(selectedProgramId) : false}
          isOpen={!!selectedProgramId}
          onClose={() => setSelectedProgramId(null)}
          onLikeChange={fetchUserLikes}
          onCopy={handleCopy}
        />
      </main>
    </div>
  );
}
