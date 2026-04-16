
-- Add uploaded_by and trim columns to reels
ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS uploaded_by uuid,
  ADD COLUMN IF NOT EXISTS trim_start numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trim_end numeric DEFAULT NULL;

-- Allow creators to update their own reels
CREATE POLICY "Creators can update own reels"
  ON public.reels
  FOR UPDATE
  USING (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin'::app_role));
