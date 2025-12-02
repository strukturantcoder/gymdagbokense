-- User friendships/connections
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- User XP and levels
CREATE TABLE public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  total_workouts INTEGER NOT NULL DEFAULT 0,
  total_sets INTEGER NOT NULL DEFAULT 0,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Challenge types enum
CREATE TYPE public.challenge_type AS ENUM ('workouts', 'sets', 'minutes');

-- Challenges between users
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL,
  challenged_id UUID NOT NULL,
  challenge_type challenge_type NOT NULL,
  target_value INTEGER NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'declined')),
  winner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Challenge progress tracking
CREATE TABLE public.challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Achievements/badges
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL
);

-- User achievements
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Friendships policies
CREATE POLICY "Users can view their friendships" ON public.friendships
FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests" ON public.friendships
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendship status" ON public.friendships
FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);

CREATE POLICY "Users can delete their friendships" ON public.friendships
FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- User stats policies
CREATE POLICY "Users can view all stats" ON public.user_stats
FOR SELECT USING (true);

CREATE POLICY "Users can insert own stats" ON public.user_stats
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.user_stats
FOR UPDATE USING (auth.uid() = user_id);

-- Challenges policies
CREATE POLICY "Users can view their challenges" ON public.challenges
FOR SELECT USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

CREATE POLICY "Users can create challenges" ON public.challenges
FOR INSERT WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Users can update their challenges" ON public.challenges
FOR UPDATE USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

-- Challenge progress policies
CREATE POLICY "Users can view challenge progress" ON public.challenge_progress
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.challenges c 
  WHERE c.id = challenge_id 
  AND (c.challenger_id = auth.uid() OR c.challenged_id = auth.uid())
));

CREATE POLICY "Users can update own progress" ON public.challenge_progress
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert progress" ON public.challenge_progress
FOR INSERT WITH CHECK (true);

-- Achievements policies (public read)
CREATE POLICY "Anyone can view achievements" ON public.achievements
FOR SELECT USING (true);

-- User achievements policies
CREATE POLICY "Users can view all user achievements" ON public.user_achievements
FOR SELECT USING (true);

CREATE POLICY "Users can earn achievements" ON public.user_achievements
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Make profiles searchable (update existing policy)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
FOR SELECT USING (true);

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
('Första passet', 'Slutför ditt första träningspass', '🎯', 50, 'workouts', 1),
('Träningsvecka', 'Slutför 7 träningspass', '📅', 100, 'workouts', 7),
('Månadsmästare', 'Slutför 30 träningspass', '🏆', 500, 'workouts', 30),
('Set-maskin', 'Genomför 100 sets', '💪', 150, 'sets', 100),
('Set-legend', 'Genomför 500 sets', '🔥', 500, 'sets', 500),
('Timme-krigare', 'Träna i totalt 60 minuter', '⏱️', 100, 'minutes', 60),
('Maratonlöpare', 'Träna i totalt 600 minuter', '🏃', 400, 'minutes', 600),
('Social fjäril', 'Lägg till din första vän', '🤝', 50, 'friends', 1),
('Utmanare', 'Vinn din första tävling', '🥇', 200, 'challenges_won', 1);

-- Create trigger to auto-create user_stats on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created_stats
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_stats();