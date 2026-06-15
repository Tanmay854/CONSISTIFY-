ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS bunny_video_guid text,
  ADD COLUMN IF NOT EXISTS bunny_library_id text;

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS bunny_storage_path text;

CREATE INDEX IF NOT EXISTS idx_reels_bunny_video_guid ON public.reels (bunny_video_guid);
CREATE INDEX IF NOT EXISTS idx_quotes_bunny_storage_path ON public.quotes (bunny_storage_path);