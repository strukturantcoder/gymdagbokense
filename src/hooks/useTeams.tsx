import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Team {
  id: string;
  name: string;
  description: string | null;
  leader_id: string;
  avatar_url: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'leader' | 'admin' | 'member';
  invited_by: string | null;
  joined_at: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface TeamInvitation {
  id: string;
  team_id: string;
  invited_user_id: string;
  invited_by: string;
  status: string;
  created_at: string;
  team?: Team;
  inviter_profile?: {
    display_name: string | null;
  };
}

export interface TeamStats {
  total_members: number;
  total_xp: number;
  total_workouts: number;
  invited_count: number;
}

export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  leader_id: string;
  leader_name: string;
  avatar_url: string | null;
  member_count: number;
  invited_joined_count: number;
  total_xp: number;
}

export interface MyTeamData {
  team: Team;
  members: TeamMember[];
  stats: TeamStats | null;
  myRole: 'leader' | 'admin' | 'member';
}

export const useTeams = () => {
  const { user } = useAuth();
  const [myTeams, setMyTeams] = useState<MyTeamData[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([]);
  const [leaderboard, setLeaderboard] = useState<TeamLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeamMembersForTeam = async (teamId: string): Promise<TeamMember[]> => {
    const { data: members } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('role', { ascending: true });

    if (!members) return [];

    // Fetch profiles for each member
    const memberIds = members.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', memberIds);

    return members.map(member => ({
      ...member,
      role: member.role as 'leader' | 'admin' | 'member',
      profile: profiles?.find(p => p.user_id === member.user_id)
    }));
  };

  const fetchTeamStatsForTeam = async (teamId: string): Promise<TeamStats | null> => {
    const { data } = await supabase.rpc('get_team_stats', { team_uuid: teamId });
    if (data && data[0]) {
      return data[0] as TeamStats;
    }
    return null;
  };

  const fetchMyTeams = useCallback(async () => {
    if (!user) return;

    // Find all teams where user is a member
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id, role')
      .eq('user_id', user.id);

    if (!memberships || memberships.length === 0) {
      setMyTeams([]);
      return;
    }

    // Fetch all teams
    const teamIds = memberships.map(m => m.team_id);
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .in('id', teamIds);

    if (!teams) {
      setMyTeams([]);
      return;
    }

    // Fetch members and stats for each team
    const teamsData: MyTeamData[] = await Promise.all(
      teams.map(async (team) => {
        const membership = memberships.find(m => m.team_id === team.id);
        const members = await fetchTeamMembersForTeam(team.id);
        const stats = await fetchTeamStatsForTeam(team.id);
        
        return {
          team,
          members,
          stats,
          myRole: membership?.role as 'leader' | 'admin' | 'member'
        };
      })
    );

    setMyTeams(teamsData);
  }, [user]);

  const fetchPendingInvitations = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('invited_user_id', user.id)
      .eq('status', 'pending');

    if (data) {
      // Fetch team info for each invitation
      const teamIds = data.map(inv => inv.team_id);
      const inviterIds = data.map(inv => inv.invited_by);
      
      const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', inviterIds);

      const invitationsWithDetails = data.map(inv => ({
        ...inv,
        team: teams?.find(t => t.id === inv.team_id),
        inviter_profile: profiles?.find(p => p.user_id === inv.invited_by)
      }));

      setPendingInvitations(invitationsWithDetails);
    }
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase.rpc('get_team_competition_leaderboard', { limit_count: 10 });
    if (data) {
      setLeaderboard(data as TeamLeaderboardEntry[]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchMyTeams(),
        fetchPendingInvitations(),
        fetchLeaderboard()
      ]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user, fetchMyTeams, fetchPendingInvitations, fetchLeaderboard]);

  const createTeam = async (name: string, description?: string) => {
    if (!user) return null;

    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name, description, leader_id: user.id })
      .select()
      .single();

    if (error) {
      toast.error('Kunde inte skapa lag');
      return null;
    }

    // Add leader as first member
    await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'leader'
      });

    toast.success('Laget skapades!');
    await fetchMyTeams();
    await fetchLeaderboard();
    return team;
  };

  const inviteToTeam = async (teamId: string, friendId: string) => {
    if (!user) return false;
    
    const teamData = myTeams.find(t => t.team.id === teamId);
    if (!teamData) return false;

    // Check team size
    if (teamData.members.length >= 10) {
      toast.error('Laget har redan max antal medlemmar (10)');
      return false;
    }

    // Check if already a member
    const isMember = teamData.members.some(m => m.user_id === friendId);
    if (isMember) {
      toast.error('Användaren är redan med i laget');
      return false;
    }

    const { error } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        invited_user_id: friendId,
        invited_by: user.id
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('Användaren har redan en inbjudan');
      } else {
        toast.error('Kunde inte skicka inbjudan');
      }
      return false;
    }

    toast.success('Inbjudan skickad!');
    return true;
  };

  const respondToInvitation = async (invitationId: string, accept: boolean) => {
    if (!user) return;

    const invitation = pendingInvitations.find(inv => inv.id === invitationId);
    if (!invitation) return;

    if (accept) {
      // Check if already a member of this specific team
      const alreadyMember = myTeams.some(t => t.team.id === invitation.team_id);
      if (alreadyMember) {
        toast.error('Du är redan med i detta lag');
        return;
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          role: 'member',
          invited_by: invitation.invited_by
        });

      if (memberError) {
        toast.error('Kunde inte gå med i laget');
        return;
      }
    }

    // Update invitation status
    await supabase
      .from('team_invitations')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', invitationId);

    toast.success(accept ? 'Du gick med i laget!' : 'Inbjudan avböjd');
    await fetchMyTeams();
    await fetchPendingInvitations();
    await fetchLeaderboard();
  };

  const updateMemberRole = async (teamId: string, memberId: string, newRole: 'admin' | 'member') => {
    if (!user) return;
    
    const teamData = myTeams.find(t => t.team.id === teamId);
    if (!teamData || teamData.myRole !== 'leader') return;

    const { error } = await supabase
      .from('team_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast.error('Kunde inte uppdatera roll');
      return;
    }

    toast.success(`Roll uppdaterad till ${newRole === 'admin' ? 'admin' : 'medlem'}`);
    await fetchMyTeams();
  };

  const leaveTeam = async (teamId: string) => {
    if (!user) return;
    
    const teamData = myTeams.find(t => t.team.id === teamId);
    if (!teamData) return;

    if (teamData.myRole === 'leader') {
      toast.error('Lagledaren kan inte lämna laget. Radera laget istället.');
      return;
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.id);

    if (error) {
      toast.error('Kunde inte lämna laget');
      return;
    }

    toast.success('Du lämnade laget');
    await fetchMyTeams();
    await fetchLeaderboard();
  };

  const deleteTeam = async (teamId: string) => {
    if (!user) return;
    
    const teamData = myTeams.find(t => t.team.id === teamId);
    if (!teamData || teamData.myRole !== 'leader') return;

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) {
      toast.error('Kunde inte radera laget');
      return;
    }

    toast.success('Laget raderades');
    await fetchMyTeams();
    await fetchLeaderboard();
  };

  return {
    myTeams,
    pendingInvitations,
    leaderboard,
    loading,
    createTeam,
    inviteToTeam,
    respondToInvitation,
    updateMemberRole,
    leaveTeam,
    deleteTeam,
    refetch: () => {
      fetchMyTeams();
      fetchPendingInvitations();
      fetchLeaderboard();
    }
  };
};
