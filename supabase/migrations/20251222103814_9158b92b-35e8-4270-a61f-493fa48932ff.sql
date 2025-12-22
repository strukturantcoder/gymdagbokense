
-- Create table to track sent emails
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view email logs
CREATE POLICY "Admins can view all email logs"
ON public.email_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete email logs
CREATE POLICY "Admins can delete email logs"
ON public.email_logs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- System (edge functions with service role) can insert
CREATE POLICY "Service role can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_logs_email_type ON public.email_logs(email_type);
