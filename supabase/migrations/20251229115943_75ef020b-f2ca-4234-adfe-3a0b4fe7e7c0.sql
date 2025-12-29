
-- Create user_follows table for following program creators
CREATE TABLE public.user_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own follows"
ON public.user_follows FOR SELECT
USING (auth.uid() = follower_id);

CREATE POLICY "Anyone can see follower counts"
ON public.user_follows FOR SELECT
USING (true);

CREATE POLICY "Users can follow others"
ON public.user_follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON public.user_follows FOR DELETE
USING (auth.uid() = follower_id);

-- Function to get programs from followed creators
CREATE OR REPLACE FUNCTION public.get_followed_creators_programs(p_user_id UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  program_id UUID,
  program_name TEXT,
  program_description TEXT,
  goal TEXT,
  experience_level TEXT,
  days_per_week INTEGER,
  author_name TEXT,
  author_avatar TEXT,
  author_id UUID,
  likes_count BIGINT,
  copies_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wp.id as program_id,
    wp.name as program_name,
    wp.description as program_description,
    wp.goal,
    wp.experience_level,
    wp.days_per_week,
    p.display_name as author_name,
    p.avatar_url as author_avatar,
    wp.user_id as author_id,
    (SELECT COUNT(*) FROM program_likes WHERE program_id = wp.id) as likes_count,
    (SELECT COUNT(*) FROM program_copies WHERE original_program_id = wp.id) as copies_count,
    wp.created_at
  FROM workout_programs wp
  JOIN profiles p ON p.user_id = wp.user_id
  JOIN user_follows uf ON uf.following_id = wp.user_id
  WHERE uf.follower_id = p_user_id
    AND wp.is_public = true 
    AND wp.deleted_at IS NULL
  ORDER BY wp.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Function to get follower/following counts
CREATE OR REPLACE FUNCTION public.get_creator_stats(creator_id UUID)
RETURNS TABLE (
  followers_count BIGINT,
  following_count BIGINT,
  programs_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM user_follows WHERE following_id = creator_id) as followers_count,
    (SELECT COUNT(*) FROM user_follows WHERE follower_id = creator_id) as following_count,
    (SELECT COUNT(*) FROM workout_programs WHERE user_id = creator_id AND is_public = true AND deleted_at IS NULL) as programs_count;
END;
$$;
