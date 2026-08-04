-- 1. Feed column on reels
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS feed text NOT NULL DEFAULT 'quick_spark';
CREATE INDEX IF NOT EXISTS reels_feed_idx ON public.reels (feed, created_at DESC);

-- 2. Rotating banner images per tab (max 5 enforced in app + trigger)
CREATE TABLE IF NOT EXISTS public.tab_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tab text NOT NULL,
  image_url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tab_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tab_banners TO authenticated;
GRANT ALL ON public.tab_banners TO service_role;
ALTER TABLE public.tab_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tab banners" ON public.tab_banners FOR SELECT USING (true);
CREATE POLICY "Admins manage tab banners" ON public.tab_banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_tab_banner_limit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM public.tab_banners WHERE tab = NEW.tab;
  IF c >= 5 THEN RAISE EXCEPTION 'Maximum 5 banner images per tab'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS tab_banners_limit ON public.tab_banners;
CREATE TRIGGER tab_banners_limit BEFORE INSERT ON public.tab_banners
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tab_banner_limit();

-- 3. Background photo library for Daily Quotes
CREATE TABLE IF NOT EXISTS public.quote_backgrounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  name text,
  position integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.quote_backgrounds TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_backgrounds TO authenticated;
GRANT ALL ON public.quote_backgrounds TO service_role;
ALTER TABLE public.quote_backgrounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view quote backgrounds" ON public.quote_backgrounds FOR SELECT USING (true);
CREATE POLICY "Admins manage quote backgrounds" ON public.quote_backgrounds FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- 4. Daily quote texts
CREATE TABLE IF NOT EXISTS public.daily_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  author text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_quotes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_quotes TO authenticated;
GRANT ALL ON public.daily_quotes TO service_role;
ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view daily quotes" ON public.daily_quotes FOR SELECT USING (true);
CREATE POLICY "Admins manage daily quotes" ON public.daily_quotes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));