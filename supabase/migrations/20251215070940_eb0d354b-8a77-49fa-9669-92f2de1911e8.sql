-- Drop the security definer view and recreate with SECURITY INVOKER
DROP VIEW IF EXISTS public.ad_statistics;

CREATE OR REPLACE VIEW public.ad_statistics 
WITH (security_invoker = true)
AS
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