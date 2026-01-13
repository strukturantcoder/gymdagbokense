-- Drop the overly permissive policies on teams and team_members
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
DROP POLICY IF EXISTS "Anyone can view team members" ON public.team_members;

-- Create new policies that restrict access to authenticated users
-- Teams: Authenticated users can view all teams (needed for leaderboard, team search, etc.)
CREATE POLICY "Authenticated users can view teams" 
ON public.teams 
FOR SELECT 
TO authenticated
USING (true);

-- Team members: Authenticated users can view all team members (needed for leaderboard)
CREATE POLICY "Authenticated users can view team members" 
ON public.team_members 
FOR SELECT 
TO authenticated
USING (true);