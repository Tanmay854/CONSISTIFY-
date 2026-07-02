
-- Add public profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_ci
  ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- Allow anonymous visitors to read public profile cards (avatar/username/bio)
GRANT SELECT ON public.profiles TO anon;

DROP POLICY IF EXISTS "Profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;

-- Backfill usernames from email prefix for existing uploader/admin users
UPDATE public.profiles p
SET username = COALESCE(
  p.username,
  regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9_.]', '', 'g')
)
FROM auth.users u
WHERE p.user_id = u.id AND (p.username IS NULL OR p.username = '');

-- Update new-user trigger to seed username from email prefix
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username text;
  candidate text;
  n int := 0;
BEGIN
  base_username := regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_.]', '', 'g');
  IF base_username IS NULL OR length(base_username) < 2 THEN
    base_username := 'user_' || LEFT(NEW.id::text, 6);
  END IF;
  candidate := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = lower(candidate)) LOOP
    n := n + 1;
    candidate := base_username || n::text;
  END LOOP;

  INSERT INTO public.profiles (user_id, display_name, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', base_username), candidate);
  RETURN NEW;
END;
$$;
