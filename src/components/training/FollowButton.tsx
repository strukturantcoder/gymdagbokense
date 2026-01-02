import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface FollowButtonProps {
  creatorId: string;
  isFollowing: boolean;
  onFollowChange: (following: boolean) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function FollowButton({ 
  creatorId, 
  isFollowing, 
  onFollowChange,
  variant = 'outline',
  size = 'sm'
}: FollowButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('Logga in för att följa skapare');
      return;
    }

    if (user.id === creatorId) {
      toast.error('Du kan inte följa dig själv');
      return;
    }

    setLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', creatorId);
        
        if (error) throw error;
        toast.success('Du följer inte längre denna skapare');
        onFollowChange(false);
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({ follower_id: user.id, following_id: creatorId });
        
        if (error) throw error;
        toast.success('Du följer nu denna skapare');
        onFollowChange(true);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Något gick fel');
    } finally {
      setLoading(false);
    }
  };

  if (user?.id === creatorId) {
    return null;
  }

  return (
    <Button
      variant={isFollowing ? 'default' : variant}
      size={size}
      onClick={handleFollow}
      disabled={loading}
      className={isFollowing ? 'bg-primary' : ''}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="w-4 h-4 mr-1" />
          Följer
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-1" />
          Följ
        </>
      )}
    </Button>
  );
}
