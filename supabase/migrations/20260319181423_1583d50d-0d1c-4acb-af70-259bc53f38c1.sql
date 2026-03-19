
-- Add unique constraint for daily recovery check-in upsert
ALTER TABLE public.recovery_logs ADD CONSTRAINT recovery_logs_user_date_unique UNIQUE (user_id, logged_at);
