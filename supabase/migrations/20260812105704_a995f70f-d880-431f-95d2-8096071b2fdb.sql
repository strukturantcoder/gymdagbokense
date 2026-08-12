-- Helper functions (security definer, avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_team_member(_team_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = _team_id AND tm.user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.leader_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_challenge_participant(_challenge_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_challenge_participants p
    WHERE p.challenge_id = _challenge_id AND p.user_id = _user_id
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_challenge_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_challenge_participant(uuid, uuid) TO authenticated, service_role;

-- 1. Team invite links: no public/code enumeration
DROP POLICY IF EXISTS "Anyone can view active invite links by code" ON public.team_invite_links;
DROP POLICY IF EXISTS "Team members can view invite links" ON public.team_invite_links;
CREATE POLICY "Team members can view invite links"
ON public.team_invite_links FOR SELECT TO authenticated
USING (public.is_team_member(team_id, auth.uid()));

-- 2. Community challenge participants: own row or co-participants
DROP POLICY IF EXISTS "Authenticated users can view challenge participants" ON public.community_challenge_participants;
CREATE POLICY "Participants can view co-participants"
ON public.community_challenge_participants FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR public.is_challenge_participant(challenge_id, auth.uid())
);

-- 3. Team members: only same-team members
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.team_members;
CREATE POLICY "Team members can view their teams members"
ON public.team_members FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_team_member(team_id, auth.uid()));

-- 4. Ad statistics view: admins only
ALTER VIEW public.ad_statistics SET (security_invoker = true);
REVOKE ALL ON public.ad_statistics FROM anon, authenticated;
GRANT SELECT ON public.ad_statistics TO service_role;

-- 5. Restrict EXECUTE on internal SECURITY DEFINER functions
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND (
        p.prorettype = 'trigger'::regtype
        OR p.proname IN (
          'complete_friend_challenges',
          'complete_pool_challenges',
          'draw_community_challenge_lottery',
          'notify_admins_new_user'
        )
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
  END LOOP;
END $$;
