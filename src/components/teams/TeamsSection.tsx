import { useState, memo, useMemo } from 'react';
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

// Reduce animation complexity for better performance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 } // Reduced from 0.1
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 }, // Reduced from y: 20
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2 } // Simplified animation
  }
};

export const TeamsSection = () => {
  const {
    myTeams,
    pendingInvitations,
    leaderboard,
    loading,
    createTeam,
    inviteToTeam,
    respondToInvitation,
    updateMemberRole,
    leaveTeam,
    deleteTeam
  } = useTeams();

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const handleInviteFriend = (teamId: string) => {
    setSelectedTeamId(teamId);
    setInviteDialogOpen(true);
  };

  const handleInvite = async (friendId: string) => {
    if (!selectedTeamId) return false;
    return inviteToTeam(selectedTeamId, friendId);
  };

  const selectedTeamMembers = useMemo(() => 
    selectedTeamId 
      ? myTeams.find(t => t.team.id === selectedTeamId)?.members || []
      : [],
    [selectedTeamId, myTeams]
  );

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

      {/* My Teams */}
      {myTeams.length > 0 ? (
        myTeams.map((teamData) => (
          <motion.div key={teamData.team.id} variants={itemVariants}>
            <TeamCard
              team={teamData.team}
              members={teamData.members}
              stats={teamData.stats}
              myRole={teamData.myRole}
              onLeave={() => leaveTeam(teamData.team.id)}
              onDelete={() => deleteTeam(teamData.team.id)}
              onUpdateRole={(memberId, newRole) => updateMemberRole(teamData.team.id, memberId, newRole)}
              onInviteFriend={() => handleInviteFriend(teamData.team.id)}
            />
          </motion.div>
        ))
      ) : (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Dina lag
              </CardTitle>
              <CardDescription>
                Du är inte med i något lag än. Skapa ett eget eller vänta på en inbjudan!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CreateTeamDialog onCreateTeam={createTeam} />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Create additional team button if user has teams */}
      {myTeams.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Du kan vara med i flera lag samtidigt
                </p>
                <CreateTeamDialog onCreateTeam={createTeam} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Leaderboard */}
      <motion.div variants={itemVariants}>
        <TeamLeaderboard leaderboard={leaderboard} loading={loading} />
      </motion.div>

      {/* Invite Friend Dialog */}
      <InviteFriendToTeamDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInvite}
        existingMemberIds={selectedTeamMembers.map(m => m.user_id)}
      />
    </motion.div>
  );
};
