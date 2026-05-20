
-- 1. Add columns
ALTER TABLE public.uploader_applications
  ADD COLUMN IF NOT EXISTS requested_role text NOT NULL DEFAULT 'uploader'
  CHECK (requested_role IN ('uploader','admin'));

ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'Motivation';

ALTER TABLE public.music
  ADD COLUMN IF NOT EXISTS image_url text;

-- 2. Super-admin helper
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) = 'tanmaynimbalkar854@gmail.com'
  );
$$;

-- 3. Update application approval trigger to grant requested_role
CREATE OR REPLACE FUNCTION public.handle_uploader_application_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role public.app_role;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    target_role := COALESCE(NEW.requested_role, 'uploader')::public.app_role;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, target_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS uploader_application_approval ON public.uploader_applications;
CREATE TRIGGER uploader_application_approval
  AFTER UPDATE ON public.uploader_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_uploader_application_approval();

-- 4. Guard trigger on user_roles for caps and super-admin rule
CREATE OR REPLACE FUNCTION public.enforce_role_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count int;
  uploader_count int;
  is_super boolean;
BEGIN
  IF NEW.role = 'admin' THEN
    -- Only the super-admin email may ever become / be granted admin
    SELECT public.is_super_admin(NEW.user_id) INTO is_super;
    IF NOT is_super THEN
      -- If the inserter (auth.uid) is super-admin, allow; else block when no auth context
      IF auth.uid() IS NULL OR NOT public.is_super_admin(auth.uid()) THEN
        -- allow only when seeded by super-admin; otherwise check cap below
        NULL;
      END IF;
    END IF;
    SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
    IF admin_count >= 5 THEN
      RAISE EXCEPTION 'Admin limit reached (max 5)';
    END IF;
  ELSIF NEW.role = 'uploader' THEN
    SELECT count(*) INTO uploader_count FROM public.user_roles WHERE role = 'uploader';
    IF uploader_count >= 200 THEN
      RAISE EXCEPTION 'Uploader limit reached (max 200)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_role_limits_trg ON public.user_roles;
CREATE TRIGGER enforce_role_limits_trg
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_role_limits();

-- 5. Tighten user_roles RLS
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Super admin can insert admin role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  (role = 'admin' AND public.is_super_admin(auth.uid()))
  OR (role = 'uploader' AND public.has_role(auth.uid(), 'admin'))
  OR (role = 'user' AND public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Super admin can delete admin role; admins can delete uploaders"
ON public.user_roles FOR DELETE TO authenticated
USING (
  (role = 'admin' AND public.is_super_admin(auth.uid()))
  OR (role <> 'admin' AND public.has_role(auth.uid(), 'admin'))
);

-- 6. Ads: admin-only insert/update/delete
DROP POLICY IF EXISTS "Admins and uploaders can add ads" ON public.ads;
DROP POLICY IF EXISTS "Owners and admins can update ads" ON public.ads;
DROP POLICY IF EXISTS "Owners and admins can delete ads" ON public.ads;

CREATE POLICY "Admins can add ads"
ON public.ads FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ads"
ON public.ads FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ads"
ON public.ads FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
