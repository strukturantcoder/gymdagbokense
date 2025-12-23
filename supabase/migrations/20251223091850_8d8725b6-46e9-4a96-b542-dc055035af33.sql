-- Create email_drafts table for saving drafts
CREATE TABLE public.email_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  template text DEFAULT 'custom',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage drafts
CREATE POLICY "Admins can manage email drafts"
  ON public.email_drafts
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_email_drafts_updated_at
  BEFORE UPDATE ON public.email_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();