-- Seed super_admin role for the existing super admin (by email)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role FROM auth.users
WHERE lower(email) = 'tanmaynimbalkar854@gmail.com'
ON CONFLICT DO NOTHING;

-- Update is_super_admin to read from user_roles instead of email
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;
