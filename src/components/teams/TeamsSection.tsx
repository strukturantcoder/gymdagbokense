import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTeams } from '@/hooks/useTeams';
import { TeamCompetitionBanner } from './TeamCompetitionBanner';
import { TeamCard } from './TeamCard';
import { TeamLeaderboard } from './TeamLeaderboard';
import { TeamInvitations } from './TeamInvitations';
import { CreateTeamDialog } from './CreateTeamDialog';
import { InviteFriendToTeamDialog } from './InviteFriendToTeamDialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring" as const, stiffness: 100 }
  }
};

export const TeamsSection = () => {
  const {
    myTeam,
    teamMembers,
    pendingInvitations,
    leaderboard,
    teamStats,
    loading,
    myRole,
    createTeam,
    inviteToTeam,
    respondToInvitation,
    updateMemberRole,
    leaveTeam,
    deleteTeam
  } = useTeams();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Competition Banner */}
      <motion.div variants={itemVariants}>
        <TeamCompetitionBanner />
      </motion.div>

      {/* Team Invitations */}
      {pendingInvitations.length > 0 && (
        <motion.div variants={itemVariants}>
          <TeamInvitations 
            invitations={pendingInvitations} 
            onRespond={respondToInvitation} 
          />
        </motion.div>
      )}

      {/* My Team or Create Team */}
      <motion.div variants={itemVariants}>
        {myTeam ? (
          <TeamCard
            team={myTeam}
            members={teamMembers}
            stats={teamStats}
            myRole={myRole}
            onLeave={leaveTeam}
            onDelete={deleteTeam}
            onUpdateRole={updateMemberRole}
            onInviteFriend={() => setInviteDialogOpen(true)}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Ditt lag
              </CardTitle>
              <CardDescription>
                Du är inte med i något lag än. Skapa ett eget eller vänta på en inbjudan!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateTeamDialog onCreateTeam={createTeam} />
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Leaderboard */}
      <motion.div variants={itemVariants}>
        <TeamLeaderboard leaderboard={leaderboard} loading={loading} />
      </motion.div>

      {/* Invite Friend Dialog */}
      <InviteFriendToTeamDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={inviteToTeam}
        existingMemberIds={teamMembers.map(m => m.user_id)}
      />
    </motion.div>
  );
};
