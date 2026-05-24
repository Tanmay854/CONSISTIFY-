ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS video_fit text NOT NULL DEFAULT 'cover';
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reporter_email text;