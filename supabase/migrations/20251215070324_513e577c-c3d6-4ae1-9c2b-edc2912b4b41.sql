-- Create ads table for managing advertisements
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link TEXT NOT NULL,
  alt_text TEXT,
  format TEXT NOT NULL DEFAULT 'horizontal',
  placement TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add comment for formats: horizontal (banner), square_large (1200x1200), square_small (500x500), vertical (160x600)
COMMENT ON COLUMN public.ads.format IS 'Format types: horizontal, square_large, square_small, vertical';
COMMENT ON COLUMN public.ads.placement IS 'Where the ad should be displayed, e.g., dashboard_top, dashboard_bottom, training_top, etc.';

-- Enable RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active ads (public table for displaying ads)
CREATE POLICY "Anyone can view active ads"
ON public.ads
FOR SELECT
USING (is_active = true);

-- Allow admins to manage all ads
CREATE POLICY "Admins can insert ads"
ON public.ads
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ads"
ON public.ads
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ads"
ON public.ads
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all ads (including inactive)
CREATE POLICY "Admins can view all ads"
ON public.ads
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for efficient querying
CREATE INDEX idx_ads_active_format ON public.ads(is_active, format);
CREATE INDEX idx_ads_placement ON public.ads(placement) WHERE placement IS NOT NULL;