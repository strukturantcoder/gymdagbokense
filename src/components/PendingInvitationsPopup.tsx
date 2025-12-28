import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Users, Swords, UserPlus, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocial, Friendship, Challenge } from '@/hooks/useSocial';
import { useTeams, TeamInvitation } from '@/hooks/useTeams';
import { useTranslation } from 'react-i18next';

interface PendingInvitationsPopupProps {
  userId: string;
}

type InvitationType = 
  | { type: 'team'; data: TeamInvitation }
  | { type: 'challenge'; data: Challenge }
  | { type: 'friend'; data: Friendship };

export const PendingInvitationsPopup = ({ userId }: PendingInvitationsPopupProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);
  
  const { pendingRequests, challenges, respondToFriendRequest, respondToChallenge } = useSocial();
  const { pendingInvitations, respondToInvitation } = useTeams();
  
  // Filter pending challenges (where user is challenged and status is pending)
  const pendingChallenges = challenges.filter(
    c => c.challenged_id === userId && c.status === 'pending'
  );
  
  // Combine all invitations
  const allInvitations: InvitationType[] = [
    ...pendingInvitations.map(inv => ({ type: 'team' as const, data: inv })),
    ...pendingChallenges.map(c => ({ type: 'challenge' as const, data: c })),
    ...pendingRequests.map(fr => ({ type: 'friend' as const, data: fr }))
  ];
  
  const totalCount = allInvitations.length;
  
  // Show popup when there are pending invitations (only once per session)
  useEffect(() => {
    if (totalCount > 0 && !hasShownThisSession) {
      // Small delay to ensure smooth page load
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasShownThisSession(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [totalCount, hasShownThisSession]);
  
  const handleTeamResponse = async (invitationId: string, accept: boolean) => {
    await respondToInvitation(invitationId, accept);
  };
  
  const handleChallengeResponse = async (challengeId: string, accept: boolean) => {
    await respondToChallenge(challengeId, accept);
  };
  
  const handleFriendResponse = async (friendshipId: string, accept: boolean) => {
    await respondToFriendRequest(friendshipId, accept);
  };
  
  const getChallengeTypeLabel = (type: string) => {
    switch (type) {
      case 'workouts': return 'träningspass';
      case 'sets': return 'set';
      case 'minutes': return 'minuter';
      default: return type;
    }
  };
  
  if (totalCount === 0) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
            >
              <Bell className="h-5 w-5 text-gym-orange" />
            </motion.div>
            Väntande inbjudningar
            <Badge variant="secondary" className="ml-2">
              {totalCount}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Du har {totalCount} {totalCount === 1 ? 'inbjudan' : 'inbjudningar'} som väntar på svar
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {allInvitations.map((invitation, index) => (
                <motion.div
                  key={`${invitation.type}-${invitation.type === 'team' ? invitation.data.id : invitation.type === 'challenge' ? invitation.data.id : invitation.data.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 bg-secondary/50 rounded-lg border border-border"
                >
                  {invitation.type === 'team' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gym-orange/20 rounded-full">
                          <Users className="h-4 w-4 text-gym-orange" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Laginbjudan</p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">{invitation.data.inviter_profile?.display_name || 'Någon'}</span>
                            {' '}bjuder in dig till{' '}
                            <span className="font-medium">{invitation.data.team?.name || 'ett lag'}</span>
                          </p>
                        </div>
                        <Avatar className="ring-2 ring-gym-orange/30">
                          <AvatarImage src={invitation.data.team?.avatar_url || undefined} />
                          <AvatarFallback className="bg-gym-orange/20">
                            {invitation.data.team?.name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTeamResponse(invitation.data.id, false)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Avböj
                        </Button>
                        <Button
                          size="sm"
                          variant="hero"
                          onClick={() => handleTeamResponse(invitation.data.id, true)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Gå med
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {invitation.type === 'challenge' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gym-amber/20 rounded-full">
                          <Swords className="h-4 w-4 text-gym-amber" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Utmaning</p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">{invitation.data.challenger_profile?.display_name || 'Någon'}</span>
                            {' '}utmanar dig:{' '}
                            <span className="font-medium">
                              {invitation.data.target_value} {getChallengeTypeLabel(invitation.data.challenge_type)}
                            </span>
                          </p>
                        </div>
                        <Avatar className="ring-2 ring-gym-amber/30">
                          <AvatarImage src={invitation.data.challenger_profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-gym-amber/20">
                            {invitation.data.challenger_profile?.display_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChallengeResponse(invitation.data.id, false)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Avböj
                        </Button>
                        <Button
                          size="sm"
                          variant="hero"
                          onClick={() => handleChallengeResponse(invitation.data.id, true)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Acceptera
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {invitation.type === 'friend' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-full">
                          <UserPlus className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">Vänförfrågan</p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">{invitation.data.user_profile?.display_name || 'Någon'}</span>
                            {' '}vill bli din vän
                          </p>
                        </div>
                        <Avatar className="ring-2 ring-primary/30">
                          <AvatarImage src={invitation.data.user_profile?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20">
                            {invitation.data.user_profile?.display_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFriendResponse(invitation.data.id, false)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Avböj
                        </Button>
                        <Button
                          size="sm"
                          variant="hero"
                          onClick={() => handleFriendResponse(invitation.data.id, true)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Acceptera
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
        
        {totalCount > 0 && (
          <div className="pt-4 border-t">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setIsOpen(false)}
            >
              Svara senare
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
