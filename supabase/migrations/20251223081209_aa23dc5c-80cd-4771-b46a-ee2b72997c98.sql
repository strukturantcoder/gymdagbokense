-- Create table for team invite links
CREATE TABLE public.team_invite_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  uses_count integer NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL, -- NULL means unlimited
  expires_at timestamp with time zone DEFAULT NULL, -- NULL means never expires
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_invite_links ENABLE ROW LEVEL SECURITY;

-- Leaders and admins can create invite links for their teams
CREATE POLICY "Leaders and admins can create invite links"
ON public.team_invite_links
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_invite_links.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('leader', 'admin')
  )
);

-- Team members can view their team's invite links
CREATE POLICY "Team members can view invite links"
ON public.team_invite_links
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_invite_links.team_id
      AND tm.user_id = auth.uid()
  )
);

-- Leaders can update and delete invite links
CREATE POLICY "Leaders and admins can update invite links"
ON public.team_invite_links
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_invite_links.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('leader', 'admin')
  )
);

CREATE POLICY "Leaders and admins can delete invite links"
ON public.team_invite_links
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = team_invite_links.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('leader', 'admin')
  )
);

-- Anyone can read invite link info for joining (public read for valid links)
CREATE POLICY "Anyone can view active invite links by code"
ON public.team_invite_links
FOR SELECT
USING (is_active = true);

-- Create function to validate and join team via invite link
CREATE OR REPLACE FUNCTION public.join_team_via_invite_link(invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_team RECORD;
  v_existing_member RECORD;
  v_member_count INTEGER;
BEGIN
  -- Find the invite link
  SELECT * INTO v_link
  FROM team_invite_links
  WHERE code = invite_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR uses_count < max_uses);
  
  IF v_link IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ogiltig eller utgången inbjudningslänk');
  END IF;
  
  -- Get team info
  SELECT * INTO v_team FROM teams WHERE id = v_link.team_id;
  
  IF v_team IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Laget finns inte längre');
  END IF;
  
  -- Check if user is already a member of this specific team
  SELECT * INTO v_existing_member
  FROM team_members
  WHERE team_id = v_link.team_id AND user_id = auth.uid();
  
  IF v_existing_member IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Du är redan med i detta lag');
  END IF;
  
  -- Check team size
  SELECT COUNT(*) INTO v_member_count FROM team_members WHERE team_id = v_link.team_id;
  
  IF v_member_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Laget har redan max antal medlemmar (10)');
  END IF;
  
  -- Add user to team
  INSERT INTO team_members (team_id, user_id, role, invited_by)
  VALUES (v_link.team_id, auth.uid(), 'member', v_link.created_by);
  
  -- Increment uses count
  UPDATE team_invite_links
  SET uses_count = uses_count + 1
  WHERE id = v_link.id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'team_id', v_team.id,
    'team_name', v_team.name
  );
END;
$$;

-- Create function to get team info from invite code (for preview)
CREATE OR REPLACE FUNCTION public.get_team_by_invite_code(invite_code text)
RETURNS TABLE(team_id uuid, team_name text, team_description text, member_count integer, is_valid boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as team_id,
    t.name as team_name,
    t.description as team_description,
    (SELECT COUNT(*)::integer FROM team_members WHERE team_id = t.id) as member_count,
    (til.is_active AND (til.expires_at IS NULL OR til.expires_at > now()) AND (til.max_uses IS NULL OR til.uses_count < til.max_uses)) as is_valid
  FROM team_invite_links til
  JOIN teams t ON t.id = til.team_id
  WHERE til.code = invite_code;
END;
$$;