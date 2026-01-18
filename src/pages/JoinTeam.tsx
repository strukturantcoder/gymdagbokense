import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Loader2, CheckCircle, XCircle, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface TeamInfo {
  team_id: string;
  team_name: string;
  team_description: string | null;
  member_count: number;
  is_valid: boolean;
}

const JoinTeam = () => {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchTeamInfo = async () => {
      if (!code) {
        setError('Ingen inbjudningskod angiven');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .rpc('get_team_by_invite_code', { invite_code: code });

      if (fetchError || !data || data.length === 0) {
        setError('Inbjudningslänken är ogiltig eller har gått ut');
        setLoading(false);
        return;
      }

      const team = data[0] as TeamInfo;
      if (!team.is_valid) {
        setError('Inbjudningslänken är ogiltig eller har gått ut');
        setLoading(false);
        return;
      }

      setTeamInfo(team);
      setLoading(false);
    };

    fetchTeamInfo();
  }, [code]);

  const handleJoin = async () => {
    if (!code || !user) return;

    setJoining(true);
    const { data, error: joinError } = await supabase
      .rpc('join_team_via_invite_link', { invite_code: code });

    setJoining(false);

    if (joinError) {
      toast.error('Kunde inte gå med i laget');
      return;
    }

    const result = data as { success: boolean; error?: string; team_name?: string };

    if (!result.success) {
      toast.error(result.error || 'Kunde inte gå med i laget');
      return;
    }

    setSuccess(true);
    toast.success(`Du gick med i ${result.team_name}!`);
    
    // Redirect to social page after a short delay
    setTimeout(() => {
      navigate('/social?tab=teams');
    }, 2000);
  };

  const handleLogin = () => {
    // Store the invite code in session storage to use after login
    sessionStorage.setItem('pendingTeamInvite', code || '');
    navigate('/auth');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Laddar...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
              <CardTitle>Ogiltig inbjudan</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => navigate('/')} variant="outline">
                Gå till startsidan
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <CardTitle>Välkommen till laget!</CardTitle>
              <CardDescription>
                Du är nu med i {teamInfo?.team_name}. Omdirigerar...
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Du har blivit inbjuden!</CardTitle>
            <CardDescription>
              Du har fått en inbjudan att gå med i ett lag
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {teamInfo && (
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <h3 className="text-xl font-bold">{teamInfo.team_name}</h3>
                {teamInfo.team_description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {teamInfo.team_description}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {teamInfo.member_count}/10 medlemmar
                </p>
              </div>
            )}

            {user ? (
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Gå med i laget
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  Du måste vara inloggad för att gå med i laget
                </p>
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleLogin}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Logga in / Skapa konto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default JoinTeam;
