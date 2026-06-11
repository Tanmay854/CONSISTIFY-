ALTER TABLE public.music ADD COLUMN IF NOT EXISTS spotify_id text;
CREATE INDEX IF NOT EXISTS idx_music_spotify_id ON public.music (spotify_id);