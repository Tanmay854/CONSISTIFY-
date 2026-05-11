
CREATE TABLE public.ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'video',
  link_url TEXT,
  placement TEXT NOT NULL DEFAULT 'reels',
  active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ads" ON public.ads FOR SELECT USING (active = true OR has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = uploaded_by);
CREATE POLICY "Admins and uploaders can add ads" ON public.ads FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'uploader'::app_role));
CREATE POLICY "Owners and admins can update ads" ON public.ads FOR UPDATE USING (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners and admins can delete ads" ON public.ads FOR DELETE USING (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin'::app_role));
