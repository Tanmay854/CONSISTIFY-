GRANT SELECT ON public.courses TO anon;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS hero_video_url text;