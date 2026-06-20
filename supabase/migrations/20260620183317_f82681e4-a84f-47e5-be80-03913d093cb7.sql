-- Fix content_views table: add unique constraint for upsert and proper grants

-- Add unique constraint required for onConflict upsert
ALTER TABLE public.content_views
  ADD CONSTRAINT content_views_unique_view
  UNIQUE (content_type, content_id, viewer_id);

-- Grant access (required — Supabase no longer grants default privileges on public schema)
GRANT SELECT, INSERT ON public.content_views TO anon;
GRANT SELECT, INSERT ON public.content_views TO authenticated;
GRANT ALL ON public.content_views TO service_role;
