-- Create table for saved CrossFit WODs
CREATE TABLE public.saved_wods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  format text NOT NULL,
  duration text NOT NULL,
  exercises jsonb NOT NULL,
  description text,
  scaling text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_wods ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own saved WODs"
ON public.saved_wods
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved WODs"
ON public.saved_wods
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved WODs"
ON public.saved_wods
FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_saved_wods_user_id ON public.saved_wods(user_id);