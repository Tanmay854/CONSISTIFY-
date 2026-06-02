CREATE UNIQUE INDEX IF NOT EXISTS content_views_unique_per_user
ON public.content_views (content_type, content_id, viewer_id)
WHERE viewer_id IS NOT NULL;