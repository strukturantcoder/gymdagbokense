-- Add email preference column to notification_preferences
ALTER TABLE public.notification_preferences 
ADD COLUMN IF NOT EXISTS weekly_summary_emails boolean NOT NULL DEFAULT true;

-- Create scheduled_emails table for admin scheduling
CREATE TABLE public.scheduled_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL,
  content text NOT NULL,
  template text DEFAULT 'custom',
  scheduled_for timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamp with time zone,
  sent_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can manage scheduled emails
CREATE POLICY "Admins can manage scheduled emails" 
ON public.scheduled_emails 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Add index for efficient querying of pending emails
CREATE INDEX idx_scheduled_emails_pending ON public.scheduled_emails (scheduled_for) WHERE status = 'pending';