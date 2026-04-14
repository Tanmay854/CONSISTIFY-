
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-images', 'quote-images', true);

CREATE POLICY "Anyone can view quote images" ON storage.objects FOR SELECT USING (bucket_id = 'quote-images');
CREATE POLICY "Admins and uploaders can upload quote images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'quote-images' AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'uploader'::public.app_role)));
CREATE POLICY "Admins can delete quote images" ON storage.objects FOR DELETE USING (bucket_id = 'quote-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
