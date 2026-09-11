ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS is_free_preview boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS reels_one_free_long_game_idx
  ON public.reels (is_free_preview)
  WHERE is_free_preview = true AND feed IN ('long_game', 'calm_state');

DROP POLICY IF EXISTS "Anyone can view free books" ON public.books;
CREATE POLICY "Premium users can view books"
ON public.books
FOR SELECT
TO authenticated
USING (public.is_premium_user(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view free reels" ON public.reels;
CREATE POLICY "View reels by entitlement"
ON public.reels
FOR SELECT
TO public
USING (
  (feed NOT IN ('long_game', 'calm_state') AND is_premium = false)
  OR public.is_premium_user(auth.uid())
  OR auth.uid() = uploaded_by
  OR public.has_role(auth.uid(), 'uploader')
  OR (
    auth.uid() IS NOT NULL
    AND feed IN ('long_game', 'calm_state')
    AND is_free_preview = true
  )
);