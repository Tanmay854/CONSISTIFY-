ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS reels_is_featured_idx ON public.reels (is_featured) WHERE is_featured;