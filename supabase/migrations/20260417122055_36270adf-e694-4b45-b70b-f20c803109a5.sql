-- Add uploaded_by to music and quotes
ALTER TABLE public.music ADD COLUMN IF NOT EXISTS uploaded_by uuid;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS uploaded_by uuid;

-- RLS: creators can update/delete their own; admins can delete anything
CREATE POLICY "Creators can update own music"
ON public.music FOR UPDATE
USING ((auth.uid() = uploaded_by) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() = uploaded_by) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators can delete own music"
ON public.music FOR DELETE
USING ((auth.uid() = uploaded_by) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators can update own quotes"
ON public.quotes FOR UPDATE
USING ((auth.uid() = uploaded_by) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((auth.uid() = uploaded_by) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators can delete own quotes"
ON public.quotes FOR DELETE
USING ((auth.uid() = uploaded_by) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Creators can delete own reels"
ON public.reels FOR DELETE
USING ((auth.uid() = uploaded_by) OR has_role(auth.uid(), 'admin'::app_role));

-- Storage buckets for video and audio
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read; uploaders/admins can insert; owners or admins can delete
CREATE POLICY "Public read videos" ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Uploaders can upload videos" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'uploader'::app_role)));

CREATE POLICY "Owners or admins delete videos" ON storage.objects FOR DELETE
USING (bucket_id = 'videos' AND (auth.uid() = owner OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Public read audio" ON storage.objects FOR SELECT
USING (bucket_id = 'audio');

CREATE POLICY "Uploaders can upload audio" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'uploader'::app_role)));

CREATE POLICY "Owners or admins delete audio" ON storage.objects FOR DELETE
USING (bucket_id = 'audio' AND (auth.uid() = owner OR has_role(auth.uid(), 'admin'::app_role)));

-- Allow owners or admins to delete from quote-images too
CREATE POLICY "Owners or admins delete quote-images" ON storage.objects FOR DELETE
USING (bucket_id = 'quote-images' AND (auth.uid() = owner OR has_role(auth.uid(), 'admin'::app_role)));