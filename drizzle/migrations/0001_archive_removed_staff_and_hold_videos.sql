CREATE TABLE public.removed_staff_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  former_role public.app_role NOT NULL,
  removed_by uuid NOT NULL,
  removed_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.removed_staff_accounts TO service_role;
ALTER TABLE public.removed_staff_accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS is_on_hold boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS held_at timestamptz,
  ADD COLUMN IF NOT EXISTS held_reason text;

CREATE INDEX IF NOT EXISTS reels_held_by_uploader_idx
  ON public.reels (uploaded_by, is_on_hold);

DROP POLICY IF EXISTS "View reels by entitlement" ON public.reels;
CREATE POLICY "View reels by entitlement"
ON public.reels
FOR SELECT
TO public
USING (
  is_on_hold = false
  AND (
    (feed NOT IN ('long_game', 'calm_state') AND is_premium = false)
    OR public.is_premium_user(auth.uid())
    OR auth.uid() = uploaded_by
    OR public.has_role(auth.uid(), 'uploader')
    OR (
      auth.uid() IS NOT NULL
      AND feed IN ('long_game', 'calm_state')
      AND is_free_preview = true
    )
  )
);

CREATE OR REPLACE FUNCTION public.reels_teaser()
RETURNS TABLE (
  id uuid, public_id text, title text, description text, category text, feed text,
  thumbnail_url text, thumbnail_portrait_url text, thumbnail_landscape_url text,
  is_featured boolean, is_premium boolean, uploaded_by uuid, created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.public_id, r.title, r.description, r.category, r.feed,
         r.thumbnail_url, r.thumbnail_portrait_url, r.thumbnail_landscape_url,
         r.is_featured, r.is_premium, r.uploaded_by, r.created_at
  FROM public.reels r
  WHERE r.is_on_hold = false;
$$;

GRANT EXECUTE ON FUNCTION public.reels_teaser() TO anon, authenticated;