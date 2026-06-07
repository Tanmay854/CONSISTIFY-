
-- 1. Reports: admins only for SELECT/UPDATE
DROP POLICY IF EXISTS "Admins and uploaders can view reports" ON public.reports;
DROP POLICY IF EXISTS "Admins and uploaders can update reports" ON public.reports;

CREATE POLICY "Admins can view reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reports"
  ON public.reports FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. content_views: restrict SELECT to viewer or admin
DROP POLICY IF EXISTS "Anyone can read views" ON public.content_views;

CREATE POLICY "Viewers or admins can read views"
  ON public.content_views FOR SELECT
  TO authenticated
  USING (auth.uid() = viewer_id OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Storage UPDATE policies
CREATE POLICY "Owners or admins update videos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'videos' AND (auth.uid() = owner OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (bucket_id = 'videos' AND (auth.uid() = owner OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Owners or admins update audio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'audio' AND (auth.uid() = owner OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (bucket_id = 'audio' AND (auth.uid() = owner OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Owners or admins update quote-images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'quote-images' AND (auth.uid() = owner OR has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (bucket_id = 'quote-images' AND (auth.uid() = owner OR has_role(auth.uid(), 'admin'::app_role)));

-- 4. Revoke EXECUTE on internal trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.enforce_role_limits() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_uploader_application_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
