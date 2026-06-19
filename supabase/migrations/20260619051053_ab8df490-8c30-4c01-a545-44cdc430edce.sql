CREATE OR REPLACE FUNCTION public.get_uploader_emails(_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid())) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE u.id = ANY(_user_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.get_uploader_emails(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_uploader_emails(uuid[]) TO authenticated;