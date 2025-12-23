import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Check, X } from 'lucide-react';
import { TeamInvitation } from '@/hooks/useTeams';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamInvitationsProps {
  invitations: TeamInvitation[];
  onRespond: (invitationId: string, accept: boolean) => void;
}

export const TeamInvitations = ({ invitations, onRespond }: TeamInvitationsProps) => {
  if (invitations.length === 0) return null;

  return (
    <Card className="border-gym-orange/50 bg-gradient-to-r from-gym-orange/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
          >
            <Users className="h-5 w-5 text-gym-orange" />
          </motion.div>
          Laginbjudningar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence>
          {invitations.map((invitation, index) => (
            <motion.div
              key={invitation.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar className="ring-2 ring-gym-orange/50">
                  <AvatarImage src={invitation.team?.avatar_url || undefined} />
                  <AvatarFallback className="bg-gym-orange/20">
                    {invitation.team?.name?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{invitation.team?.name || 'Okänt lag'}</p>
                  <p className="text-sm text-muted-foreground">
                    Inbjuden av {invitation.inviter_profile?.display_name || 'Någon'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button 
                    size="sm" 
                    variant="hero" 
                    onClick={() => onRespond(invitation.id, true)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onRespond(invitation.id, false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
