
-- music_cache: server-side cache for Spotify recommendations
CREATE TABLE public.music_cache (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.music_cache TO anon, authenticated;
GRANT ALL ON public.music_cache TO service_role;
ALTER TABLE public.music_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read music cache" ON public.music_cache FOR SELECT USING (true);

-- user_albums
CREATE TABLE public.user_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_albums TO authenticated;
GRANT ALL ON public.user_albums TO service_role;
ALTER TABLE public.user_albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages albums" ON public.user_albums FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_user_albums_updated_at BEFORE UPDATE ON public.user_albums
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_album_tracks
CREATE TABLE public.user_album_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES public.user_albums(id) ON DELETE CASCADE,
  spotify_track_id text NOT NULL,
  name text NOT NULL,
  artist text NOT NULL DEFAULT '',
  image text,
  uri text NOT NULL,
  position int NOT NULL DEFAULT 0,
  added_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_album_tracks TO authenticated;
GRANT ALL ON public.user_album_tracks TO service_role;
ALTER TABLE public.user_album_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages album tracks" ON public.user_album_tracks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_albums a WHERE a.id = album_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_albums a WHERE a.id = album_id AND a.user_id = auth.uid()));
CREATE INDEX idx_user_album_tracks_album ON public.user_album_tracks(album_id, position);

-- spotify_connections
CREATE TABLE public.spotify_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text NOT NULL DEFAULT '',
  spotify_user_id text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spotify_connections TO authenticated;
GRANT ALL ON public.spotify_connections TO service_role;
ALTER TABLE public.spotify_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages connection" ON public.spotify_connections FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_spotify_connections_updated_at BEFORE UPDATE ON public.spotify_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
