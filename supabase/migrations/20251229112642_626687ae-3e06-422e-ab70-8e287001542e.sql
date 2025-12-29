-- Add public sharing fields to workout_programs
ALTER TABLE public.workout_programs
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS share_code text UNIQUE,
ADD COLUMN IF NOT EXISTS description text;

-- Create index for public programs
CREATE INDEX IF NOT EXISTS idx_workout_programs_is_public ON public.workout_programs(is_public) WHERE is_public = true AND deleted_at IS NULL;

-- Create program_likes table
CREATE TABLE public.program_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(program_id, user_id)
);

-- Create program_copies table to track copies
CREATE TABLE public.program_copies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_program_id uuid NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
  copied_program_id uuid NOT NULL REFERENCES public.workout_programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.program_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_copies ENABLE ROW LEVEL SECURITY;

-- RLS for program_likes
CREATE POLICY "Anyone can view likes count" ON public.program_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like public programs" ON public.program_likes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM workout_programs WHERE id = program_id AND is_public = true)
  );

CREATE POLICY "Users can unlike" ON public.program_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS for program_copies
CREATE POLICY "Users can view own copies" ON public.program_copies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert copies" ON public.program_copies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update workout_programs RLS to allow viewing public programs
CREATE POLICY "Anyone can view public programs" ON public.workout_programs
  FOR SELECT USING (is_public = true AND deleted_at IS NULL);

-- Create function to get popular programs
CREATE OR REPLACE FUNCTION public.get_popular_programs(limit_count integer DEFAULT 10)
RETURNS TABLE(
  program_id uuid,
  program_name text,
  program_description text,
  goal text,
  experience_level text,
  days_per_week integer,
  author_name text,
  author_avatar text,
  author_id uuid,
  likes_count bigint,
  copies_count bigint,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    CASE 
      WHEN wp.user_id = auth.uid() THEN p.display_name
      ELSE public.abbreviate_name(p.display_name)
    END as author_name,
    p.avatar_url as author_avatar,
    wp.user_id as author_id,
    (SELECT COUNT(*) FROM program_likes WHERE program_id = wp.id) as likes_count,
    (SELECT COUNT(*) FROM program_copies WHERE original_program_id = wp.id) as copies_count,
    wp.created_at
  FROM workout_programs wp
  JOIN profiles p ON p.user_id = wp.user_id
  WHERE wp.is_public = true AND wp.deleted_at IS NULL
  ORDER BY likes_count DESC, copies_count DESC, wp.created_at DESC
  LIMIT limit_count;
END;
$$;