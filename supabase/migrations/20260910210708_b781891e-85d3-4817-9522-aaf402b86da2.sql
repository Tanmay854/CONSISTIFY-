
-- 1. Premium flags on content
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- 2. Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'monthly',
  status text NOT NULL DEFAULT 'expired',
  provider text NOT NULL DEFAULT 'website',
  provider_customer_id text,
  provider_subscription_id text,
  started_at timestamptz,
  expires_at timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_provider_idx
  ON public.subscriptions (user_id, provider);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own subscription" ON public.subscriptions;
CREATE POLICY "Users view own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Admin promotional premium grants
CREATE TABLE IF NOT EXISTS public.premium_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  granted_by uuid,
  reason text,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.premium_grants TO authenticated;
GRANT ALL ON public.premium_grants TO service_role;
ALTER TABLE public.premium_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own grants" ON public.premium_grants;
CREATE POLICY "Users view own grants" ON public.premium_grants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage grants" ON public.premium_grants;
CREATE POLICY "Admins manage grants" ON public.premium_grants
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));
GRANT INSERT, UPDATE, DELETE ON public.premium_grants TO authenticated;

-- 4. Entitlement functions
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN _user_id IS NULL THEN false ELSE (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _user_id
        AND s.status IN ('active','trialing')
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
    OR EXISTS (
      SELECT 1 FROM public.premium_grants g
      WHERE g.user_id = _user_id
        AND g.revoked = false
        AND g.started_at <= now()
        AND (g.expires_at IS NULL OR g.expires_at > now())
    )
  ) END;
$$;

CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_active_subscription(_user_id)
     OR public.has_role(_user_id, 'admin')
     OR public.is_super_admin(_user_id);
$$;

CREATE OR REPLACE FUNCTION public.my_entitlement()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'user_id', auth.uid(),
    'premium', COALESCE(public.is_premium_user(auth.uid()), false),
    'ad_free', COALESCE(public.is_premium_user(auth.uid()), false),
    'plan', s.plan,
    'status', s.status,
    'provider', s.provider,
    'expires_at', s.expires_at,
    'cancel_at_period_end', s.cancel_at_period_end
  )
  FROM (SELECT 1) x
  LEFT JOIN LATERAL (
    SELECT * FROM public.subscriptions
    WHERE user_id = auth.uid()
    ORDER BY (status IN ('active','trialing')) DESC, expires_at DESC NULLS LAST
    LIMIT 1
  ) s ON true;
$$;

GRANT EXECUTE ON FUNCTION public.my_entitlement() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_premium_user(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO anon, authenticated;

-- 5. Ad settings
CREATE TABLE IF NOT EXISTS public.ad_settings (
  id boolean PRIMARY KEY DEFAULT true,
  ads_enabled boolean NOT NULL DEFAULT true,
  video_pre_roll_enabled boolean NOT NULL DEFAULT true,
  video_mid_roll_enabled boolean NOT NULL DEFAULT false,
  video_mid_roll_interval integer NOT NULL DEFAULT 600,
  feed_ad_frequency integer NOT NULL DEFAULT 8,
  photo_ad_frequency integer NOT NULL DEFAULT 10,
  quote_ad_frequency integer NOT NULL DEFAULT 10,
  book_ad_frequency integer NOT NULL DEFAULT 3,
  audio_ad_frequency integer NOT NULL DEFAULT 0,
  interstitial_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ad_settings_singleton CHECK (id)
);
GRANT SELECT ON public.ad_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.ad_settings TO authenticated;
GRANT ALL ON public.ad_settings TO service_role;
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read ad settings" ON public.ad_settings;
CREATE POLICY "Anyone can read ad settings" ON public.ad_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage ad settings" ON public.ad_settings;
CREATE POLICY "Admins manage ad settings" ON public.ad_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

INSERT INTO public.ad_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS ad_settings_updated_at ON public.ad_settings;
CREATE TRIGGER ad_settings_updated_at BEFORE UPDATE ON public.ad_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Protect premium content rows
DROP POLICY IF EXISTS "Anyone can view books" ON public.books;
CREATE POLICY "Anyone can view free books" ON public.books
  FOR SELECT
  USING (is_premium = false OR public.is_premium_user(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view reels" ON public.reels;
CREATE POLICY "Anyone can view free reels" ON public.reels
  FOR SELECT
  USING (
    is_premium = false
    OR public.is_premium_user(auth.uid())
    OR auth.uid() = uploaded_by
    OR public.has_role(auth.uid(), 'uploader')
  );

-- 7. Public teasers for locked content (no protected payload)
CREATE OR REPLACE VIEW public.books_teaser AS
  SELECT id, public_id, title, author, category, description, why_read,
         cover_url, cover_url_2, price, rating, is_featured, is_trending,
         is_best_seller, is_new_release, is_published, is_premium,
         reading_time_minutes, listening_time_minutes, created_at
  FROM public.books
  WHERE is_published = true;
GRANT SELECT ON public.books_teaser TO anon, authenticated;

CREATE OR REPLACE VIEW public.reels_teaser AS
  SELECT id, public_id, title, description, category, feed,
         thumbnail_url, thumbnail_portrait_url, thumbnail_landscape_url,
         is_featured, is_premium, uploaded_by, created_at
  FROM public.reels;
GRANT SELECT ON public.reels_teaser TO anon, authenticated;
