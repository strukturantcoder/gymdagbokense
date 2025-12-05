-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create a new policy that only allows users to insert notifications for themselves
-- System-generated notifications (from SECURITY DEFINER triggers like notify_friend_request, notify_challenge) 
-- will bypass RLS and still work correctly
CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);