-- Fix ambiguous reference to output column name program_id inside get_popular_programs
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
AS $function$
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
    (
      SELECT COUNT(*)
      FROM program_likes pl
      WHERE pl.program_id = wp.id
    ) as likes_count,
    (
      SELECT COUNT(*)
      FROM program_copies pc
      WHERE pc.original_program_id = wp.id
    ) as copies_count,
    wp.created_at
  FROM workout_programs wp
  JOIN profiles p ON p.user_id = wp.user_id
  WHERE wp.is_public = true AND wp.deleted_at IS NULL
  ORDER BY likes_count DESC, copies_count DESC, wp.created_at DESC
  LIMIT limit_count;
END;
$function$;
