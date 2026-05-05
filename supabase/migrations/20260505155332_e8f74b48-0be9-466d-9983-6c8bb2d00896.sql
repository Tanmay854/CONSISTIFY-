
CREATE TABLE public.content_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('reel','music','quote')),
  content_id UUID NOT NULL,
  viewer_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_views_lookup ON public.content_views(content_type, content_id);

ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views"
ON public.content_views
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can read views"
ON public.content_views
FOR SELECT
USING (true);
