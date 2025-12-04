-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'friend_request', 'challenge', 'workout_reminder', 'workout_active'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID, -- ID of related entity (friendship_id, challenge_id, workout_log_id)
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create function to notify on friend request
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  requester_name TEXT;
BEGIN
  -- Get requester's display name
  SELECT display_name INTO requester_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  
  -- Create notification for the friend being requested
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (
    NEW.friend_id,
    'friend_request',
    'Ny vänförfrågan',
    COALESCE(requester_name, 'Någon') || ' vill bli din vän!',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for friend requests
CREATE TRIGGER on_friend_request_created
AFTER INSERT ON public.friendships
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.notify_friend_request();

-- Create function to notify on challenge
CREATE OR REPLACE FUNCTION public.notify_challenge()
RETURNS TRIGGER AS $$
DECLARE
  challenger_name TEXT;
BEGIN
  -- Get challenger's display name
  SELECT display_name INTO challenger_name
  FROM public.profiles
  WHERE user_id = NEW.challenger_id;
  
  -- Create notification for the challenged user
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (
    NEW.challenged_id,
    'challenge',
    'Ny utmaning',
    COALESCE(challenger_name, 'Någon') || ' har utmanat dig!',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for challenges
CREATE TRIGGER on_challenge_created
AFTER INSERT ON public.challenges
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.notify_challenge();