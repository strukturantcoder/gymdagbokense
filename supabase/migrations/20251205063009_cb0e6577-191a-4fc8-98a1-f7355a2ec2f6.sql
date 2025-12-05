-- Fix search_path for abbreviate_name function
CREATE OR REPLACE FUNCTION public.abbreviate_name(full_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  parts text[];
  first_initial text;
  last_name text;
BEGIN
  IF full_name IS NULL OR full_name = '' THEN
    RETURN 'Anonym';
  END IF;
  
  parts := string_to_array(trim(full_name), ' ');
  
  IF array_length(parts, 1) = 1 THEN
    RETURN left(parts[1], 1) || '.';
  END IF;
  
  first_initial := left(parts[1], 1);
  last_name := parts[array_length(parts, 1)];
  
  RETURN first_initial || '. ' || last_name;
END;
$$;

-- Add missing RLS policies for pool_challenges
-- Only the system (via triggers/functions) should create pool challenges, not users directly
CREATE POLICY "System can create pool challenges"
ON public.pool_challenges
FOR INSERT
WITH CHECK (false); -- Blocked - only created via match function with service role

CREATE POLICY "System can update pool challenges"
ON public.pool_challenges
FOR UPDATE
USING (false); -- Blocked - only updated via complete function with service role

CREATE POLICY "No one can delete pool challenges"
ON public.pool_challenges
FOR DELETE
USING (false);