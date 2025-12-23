import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Trophy, Dumbbell, Crown, Shield, UserMinus, Trash2, UserPlus } from 'lucide-react';
import { Team, TeamMember, TeamStats } from '@/hooks/useTeams';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TeamInviteLinkDialog } from './TeamInviteLinkDialog';

interface TeamCardProps {
  team: Team;
  members: TeamMember[];
  stats: TeamStats | null;
  myRole: 'leader' | 'admin' | 'member' | null;
  onLeave: () => void;
  onDelete: () => void;
  onUpdateRole: (memberId: string, newRole: 'admin' | 'member') => void;
  onInviteFriend: () => void;
}

export const TeamCard = ({ 
  team, 
  members, 
  stats, 
  myRole, 
  onLeave, 
  onDelete,
  onUpdateRole,
  onInviteFriend
}: TeamCardProps) => {
  const { user } = useAuth();
  const canInvite = myRole === 'leader' || myRole === 'admin';

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'admin':
        return <Shield className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'leader':
        return <Badge variant="secondary" className="text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30">Ledare</Badge>;
      case 'admin':
        return <Badge variant="secondary" className="text-blue-600 bg-blue-100 dark:bg-blue-900/30">Admin</Badge>;
      default:
        return <Badge variant="outline">Medlem</Badge>;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {team.name}
          </CardTitle>
          <Badge variant="secondary">{members.length}/10 medlemmar</Badge>
        </div>
        {team.description && (
          <p className="text-sm text-muted-foreground">{team.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 p-3 bg-secondary/50 rounded-lg">
            <div className="text-center">
              <Trophy className="h-5 w-5 mx-auto text-gym-orange mb-1" />
              <p className="text-lg font-bold">{stats.total_xp.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
            <div className="text-center">
              <Dumbbell className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-lg font-bold">{stats.total_workouts}</p>
              <p className="text-xs text-muted-foreground">Träningspass</p>
            </div>
            <div className="text-center">
              <UserPlus className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-lg font-bold">{stats.invited_count}</p>
              <p className="text-xs text-muted-foreground">Inbjudna</p>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Medlemmar
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {members.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {member.profile?.display_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      {getRoleIcon(member.role)}
                      <span className="text-sm font-medium">
                        {member.profile?.display_name || 'Anonym'}
                        {member.user_id === user?.id && ' (du)'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getRoleBadge(member.role)}
                  {myRole === 'leader' && member.user_id !== user?.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onUpdateRole(
                        member.id, 
                        member.role === 'admin' ? 'member' : 'admin'
                      )}
                    >
                      {member.role === 'admin' ? 'Ta bort admin' : 'Gör admin'}
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {canInvite && (
            <TeamInviteLinkDialog teamId={team.id} teamName={team.name} />
          )}
          
          {canInvite && members.length < 10 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={onInviteFriend}>
              <UserPlus className="h-4 w-4" />
              Bjud in vän
            </Button>
          )}
          
          {myRole === 'leader' ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Radera lag?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Detta kommer permanent radera laget och ta bort alla medlemmar. Denna åtgärd kan inte ångras.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                    Radera
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <UserMinus className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Lämna lag?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Är du säker på att du vill lämna {team.name}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction onClick={onLeave}>Lämna</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
