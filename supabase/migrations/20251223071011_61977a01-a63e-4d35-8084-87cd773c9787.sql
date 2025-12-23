-- Create team roles enum
CREATE TYPE public.team_role AS ENUM ('leader', 'admin', 'member');

-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team members table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Create team invitations table
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, invited_user_id)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Anyone can view teams"
ON public.teams FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create teams"
ON public.teams FOR INSERT
WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leaders can update their teams"
ON public.teams FOR UPDATE
USING (auth.uid() = leader_id);

CREATE POLICY "Leaders can delete their teams"
ON public.teams FOR DELETE
USING (auth.uid() = leader_id);

-- Team members policies
CREATE POLICY "Anyone can view team members"
ON public.team_members FOR SELECT
USING (true);

CREATE POLICY "Leaders and admins can add members"
ON public.team_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('leader', 'admin')
  )
  OR (
    -- Allow leader to add themselves when creating team
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.leader_id = auth.uid()
    )
    AND team_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can leave teams"
ON public.team_members FOR DELETE
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.teams t
  WHERE t.id = team_members.team_id AND t.leader_id = auth.uid()
));

CREATE POLICY "Leaders can update member roles"
ON public.team_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id AND t.leader_id = auth.uid()
  )
);

-- Team invitations policies
CREATE POLICY "Users can view their invitations"
ON public.team_invitations FOR SELECT
USING (auth.uid() = invited_user_id OR EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE tm.team_id = team_invitations.team_id AND tm.user_id = auth.uid()
));

CREATE POLICY "Leaders and admins can create invitations"
ON public.team_invitations FOR INSERT
WITH CHECK (
  auth.uid() = invited_by AND
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_invitations.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('leader', 'admin')
  )
);

CREATE POLICY "Invited users can update their invitations"
ON public.team_invitations FOR UPDATE
USING (auth.uid() = invited_user_id);

CREATE POLICY "Invitations can be deleted by inviters or invitees"
ON public.team_invitations FOR DELETE
USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);

-- Function to get team stats with summed XP
CREATE OR REPLACE FUNCTION public.get_team_stats(team_uuid UUID)
RETURNS TABLE(
  total_members INTEGER,
  total_xp BIGINT,
  total_workouts BIGINT,
  invited_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM team_members WHERE team_id = team_uuid) as total_members,
    (SELECT COALESCE(SUM(us.total_xp), 0)::BIGINT 
     FROM team_members tm 
     JOIN user_stats us ON us.user_id = tm.user_id 
     WHERE tm.team_id = team_uuid) as total_xp,
    (SELECT COALESCE(SUM(us.total_workouts), 0)::BIGINT 
     FROM team_members tm 
     JOIN user_stats us ON us.user_id = tm.user_id 
     WHERE tm.team_id = team_uuid) as total_workouts,
    (SELECT COUNT(DISTINCT tm.user_id)::INTEGER 
     FROM team_members tm 
     WHERE tm.team_id = team_uuid 
       AND tm.invited_by IS NOT NULL) as invited_count;
END;
$$;

-- Function to get team leaderboard for competition
CREATE OR REPLACE FUNCTION public.get_team_competition_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  team_id UUID,
  team_name TEXT,
  leader_id UUID,
  leader_name TEXT,
  avatar_url TEXT,
  member_count INTEGER,
  invited_joined_count INTEGER,
  total_xp BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.leader_id,
    CASE 
      WHEN t.leader_id = auth.uid() THEN p.display_name
      ELSE public.abbreviate_name(p.display_name)
    END as leader_name,
    t.avatar_url,
    (SELECT COUNT(*)::INTEGER FROM team_members WHERE team_id = t.id) as member_count,
    (SELECT COUNT(DISTINCT tm.user_id)::INTEGER 
     FROM team_members tm 
     WHERE tm.team_id = t.id 
       AND tm.invited_by = t.leader_id
       AND tm.user_id != t.leader_id) as invited_joined_count,
    (SELECT COALESCE(SUM(us.total_xp), 0)::BIGINT 
     FROM team_members tm2
     JOIN user_stats us ON us.user_id = tm2.user_id 
     WHERE tm2.team_id = t.id) as total_xp
  FROM teams t
  JOIN profiles p ON p.user_id = t.leader_id
  ORDER BY invited_joined_count DESC, total_xp DESC
  LIMIT limit_count;
END;
$$;

-- Trigger to notify users of team invitations
CREATE OR REPLACE FUNCTION public.notify_team_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  team_name TEXT;
  inviter_name TEXT;
BEGIN
  SELECT name INTO team_name FROM teams WHERE id = NEW.team_id;
  SELECT display_name INTO inviter_name FROM profiles WHERE user_id = NEW.invited_by;
  
  INSERT INTO notifications (user_id, type, title, message, related_id)
  VALUES (
    NEW.invited_user_id,
    'team_invitation',
    'Inbjudan till lag',
    COALESCE(inviter_name, 'Någon') || ' har bjudit in dig till laget ' || COALESCE(team_name, 'ett lag') || '!',
    NEW.id
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_invitation_created
AFTER INSERT ON public.team_invitations
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_invitation();