-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for admin access
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create community challenges table
CREATE TABLE public.community_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  theme TEXT,
  goal_description TEXT NOT NULL,
  goal_unit TEXT NOT NULL,
  target_value INTEGER,
  winner_type TEXT NOT NULL DEFAULT 'highest' CHECK (winner_type IN ('highest', 'first_to_goal')),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on community_challenges
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can view active community challenges
CREATE POLICY "Anyone can view active community challenges"
ON public.community_challenges FOR SELECT
USING (is_active = true);

-- Only admins can create community challenges
CREATE POLICY "Admins can create community challenges"
ON public.community_challenges FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update community challenges
CREATE POLICY "Admins can update community challenges"
ON public.community_challenges FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete community challenges
CREATE POLICY "Admins can delete community challenges"
ON public.community_challenges FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create participants table
CREATE TABLE public.community_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.community_challenges(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_value INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);

-- Enable RLS on participants
ALTER TABLE public.community_challenge_participants ENABLE ROW LEVEL SECURITY;

-- Users can view all participants in challenges they've joined
CREATE POLICY "Users can view challenge participants"
ON public.community_challenge_participants FOR SELECT
USING (true);

-- Users can join challenges
CREATE POLICY "Users can join challenges"
ON public.community_challenge_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own progress
CREATE POLICY "Users can update own progress"
ON public.community_challenge_participants FOR UPDATE
USING (auth.uid() = user_id);

-- Users can leave challenges
CREATE POLICY "Users can leave challenges"
ON public.community_challenge_participants FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_community_challenge_participants_updated_at
BEFORE UPDATE ON public.community_challenge_participants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();