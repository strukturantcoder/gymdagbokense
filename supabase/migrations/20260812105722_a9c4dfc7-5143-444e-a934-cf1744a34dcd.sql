DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.prorettype <> 'trigger'::regtype
      AND p.proname IN (
        'claim_daily_bonus',
        'get_community_challenge_participants',
        'get_followed_creators_programs',
        'get_friend_profile',
        'get_friend_stats',
        'get_lottery_qualified_participants',
        'get_pool_challenge_participants',
        'get_team_competition_leaderboard',
        'get_team_stats',
        'join_team_via_invite_link',
        'search_users_by_name',
        'validate_invite_code',
        'has_role'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
  END LOOP;
END $$;
