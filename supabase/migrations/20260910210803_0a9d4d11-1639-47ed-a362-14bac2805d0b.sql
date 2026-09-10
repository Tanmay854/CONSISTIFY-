
DROP VIEW IF EXISTS public.books_teaser;
DROP VIEW IF EXISTS public.reels_teaser;

REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_premium_user(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.books_teaser()
RETURNS TABLE (
  id uuid, public_id text, title text, author text, category text,
  description text, why_read text, cover_url text, cover_url_2 text,
  price numeric, rating numeric, is_featured boolean, is_trending boolean,
  is_best_seller boolean, is_new_release boolean, is_premium boolean,
  reading_time_minutes integer, listening_time_minutes integer, created_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.public_id, b.title, b.author, b.category, b.description, b.why_read,
         b.cover_url, b.cover_url_2, b.price, b.rating, b.is_featured, b.is_trending,
         b.is_best_seller, b.is_new_release, b.is_premium,
         b.reading_time_minutes, b.listening_time_minutes, b.created_at
  FROM public.books b
  WHERE b.is_published = true;
$$;

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
  FROM public.reels r;
$$;

GRANT EXECUTE ON FUNCTION public.books_teaser() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reels_teaser() TO anon, authenticated;
