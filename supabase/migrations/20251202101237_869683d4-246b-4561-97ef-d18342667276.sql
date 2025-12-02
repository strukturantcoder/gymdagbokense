-- Remove the public INSERT policy and replace with one that blocks direct access
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;

-- Create a new policy that blocks all direct INSERT (service role bypasses RLS)
CREATE POLICY "Block direct inserts - use edge function"
  ON public.contact_messages FOR INSERT
  WITH CHECK (false);