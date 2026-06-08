
-- 1. Feed pagination indexes
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON public.reels (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_created_at ON public.music (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes (created_at DESC);

-- 2. Uploader filter indexes (My Uploads / admin lists)
CREATE INDEX IF NOT EXISTS idx_reels_uploaded_by ON public.reels (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_music_uploaded_by ON public.music (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_quotes_uploaded_by ON public.quotes (uploaded_by);

-- 3. content_views composite index for chart queries
CREATE INDEX IF NOT EXISTS idx_content_views_lookup
  ON public.content_views (content_id, content_type, created_at DESC);

-- 4. Aggregated view counts table (avoids live counting on millions of rows)
CREATE TABLE IF NOT EXISTS public.view_counts (
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  total_views bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_type, content_id)
);

GRANT SELECT ON public.view_counts TO anon, authenticated;
GRANT ALL ON public.view_counts TO service_role;

ALTER TABLE public.view_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read aggregated view counts"
  ON public.view_counts FOR SELECT
  USING (true);

-- 5. Function to refresh aggregates (callable by cron / admin)
CREATE OR REPLACE FUNCTION public.refresh_view_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.view_counts (content_type, content_id, total_views, updated_at)
  SELECT content_type, content_id, count(*)::bigint, now()
  FROM public.content_views
  GROUP BY content_type, content_id
  ON CONFLICT (content_type, content_id)
  DO UPDATE SET total_views = EXCLUDED.total_views, updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_view_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_view_counts() TO service_role;

-- Seed it once now
SELECT public.refresh_view_counts();
