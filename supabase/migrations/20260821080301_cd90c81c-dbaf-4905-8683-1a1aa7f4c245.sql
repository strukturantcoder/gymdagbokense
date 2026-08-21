ALTER POLICY "Admins can view ad stats" ON public.ad_stats TO authenticated;
ALTER POLICY "Admins can delete ads" ON public.ads TO authenticated;
ALTER POLICY "Admins can insert ads" ON public.ads TO authenticated;
ALTER POLICY "Admins can view all ads" ON public.ads TO authenticated;
ALTER POLICY "Admins can update ads" ON public.ads TO authenticated;
ALTER POLICY "Admins can delete community challenges" ON public.community_challenges TO authenticated;
ALTER POLICY "Admins can create community challenges" ON public.community_challenges TO authenticated;
ALTER POLICY "Admins can update community challenges" ON public.community_challenges TO authenticated;
ALTER POLICY "Admins can manage email drafts" ON public.email_drafts TO authenticated;
ALTER POLICY "Admins can delete email logs" ON public.email_logs TO authenticated;
ALTER POLICY "Admins can view all email logs" ON public.email_logs TO authenticated;
ALTER POLICY "Admins can manage scheduled emails" ON public.scheduled_emails TO authenticated;
ALTER POLICY "Admins can view all roles" ON public.user_roles TO authenticated;

CREATE POLICY "Anon can insert anonymous ad stats" ON public.ad_stats FOR INSERT TO anon WITH CHECK (user_id IS NULL);

GRANT SELECT ON public.ads TO anon;
GRANT INSERT ON public.ad_stats TO anon;