-- Create ad_stats table for tracking impressions and clicks
CREATE TABLE public.ad_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_stats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert stats (for tracking)
CREATE POLICY "Anyone can insert ad stats"
ON public.ad_stats
FOR INSERT
WITH CHECK (true);

-- Only admins can view stats
CREATE POLICY "Admins can view ad stats"
ON public.ad_stats
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for efficient querying
CREATE INDEX idx_ad_stats_ad_id ON public.ad_stats(ad_id);
CREATE INDEX idx_ad_stats_created_at ON public.ad_stats(created_at);
CREATE INDEX idx_ad_stats_event_type ON public.ad_stats(event_type);

-- Create a view for aggregated stats per ad
CREATE OR REPLACE VIEW public.ad_statistics AS
SELECT 
  a.id,
  a.name,
  a.format,
  a.placement,
  a.is_active,
  COALESCE(impressions.count, 0) as impressions,
  COALESCE(clicks.count, 0) as clicks,
  CASE 
    WHEN COALESCE(impressions.count, 0) > 0 
    THEN ROUND((COALESCE(clicks.count, 0)::NUMERIC / impressions.count::NUMERIC) * 100, 2)
    ELSE 0 
  END as ctr
FROM public.ads a
LEFT JOIN (
  SELECT ad_id, COUNT(*) as count 
  FROM public.ad_stats 
  WHERE event_type = 'impression' 
  GROUP BY ad_id
) impressions ON a.id = impressions.ad_id
LEFT JOIN (
  SELECT ad_id, COUNT(*) as count 
  FROM public.ad_stats 
  WHERE event_type = 'click' 
  GROUP BY ad_id
) clicks ON a.id = clicks.ad_id;