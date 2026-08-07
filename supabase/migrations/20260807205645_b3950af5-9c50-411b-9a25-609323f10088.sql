ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS thumbnail_portrait_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_landscape_url text;