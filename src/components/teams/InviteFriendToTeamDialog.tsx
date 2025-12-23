import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Loader2, Check } from 'lucide-react';
import { useSocial, Friendship } from '@/hooks/useSocial';

interface InviteFriendToTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (friendId: string) => Promise<boolean>;
  existingMemberIds: string[];
}

export const InviteFriendToTeamDialog = ({ 
  open, 
  onOpenChange, 
  onInvite,
  existingMemberIds
}: InviteFriendToTeamDialogProps) => {
  const { friends } = useSocial();
  const [inviting, setInviting] = useState<string | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());

  const availableFriends = friends.filter(
    f => !existingMemberIds.includes(f.friend_profile?.user_id || '')
  );

  const handleInvite = async (friendId: string) => {
    setInviting(friendId);
    const success = await onInvite(friendId);
    if (success) {
      setInvited(prev => new Set([...prev, friendId]));
    }
    setInviting(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Bjud in vän till laget
          </DialogTitle>
        </DialogHeader>
        
        {availableFriends.length === 0 ? (
          <div className="text-center py-8">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Alla dina vänner är redan med i laget eller du har inga vänner att bjuda in.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {availableFriends.map(friend => {
              const friendId = friend.friend_profile?.user_id;
              const isInvited = friendId ? invited.has(friendId) : false;
              const isInviting = inviting === friendId;

              return (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={friend.friend_profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {friend.friend_profile?.display_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {friend.friend_profile?.display_name || 'Anonym'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant={isInvited ? 'secondary' : 'default'}
                    disabled={isInviting || isInvited || !friendId}
                    onClick={() => friendId && handleInvite(friendId)}
                  >
                    {isInviting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isInvited ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Inbjuden
                      </>
                    ) : (
                      'Bjud in'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
