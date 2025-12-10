-- Drop the security definer views that caused linter warnings
DROP VIEW IF EXISTS public.friend_profiles_view;
DROP VIEW IF EXISTS public.friend_stats_view;

-- The secure functions (get_friend_profile, get_friend_stats) are now the ONLY way
-- to access friend data, which prevents exposure of sensitive fields like birth_year and gender.

-- Verify the function was properly updated (it was already done in previous migration)
-- Now friends must use the get_friend_profile function which only returns safe fields:
-- user_id, display_name, avatar_url

-- Note: The profiles table now has:
-- 1. Users can view own profile (all fields)
-- 2. NO direct friend access policy (friends must use get_friend_profile function)
-- This ensures birth_year, gender, and social media URLs are never exposed to friends.