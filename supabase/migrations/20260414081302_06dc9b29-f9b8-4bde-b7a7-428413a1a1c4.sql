
-- Create music table
CREATE TABLE public.music (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  artist text NOT NULL DEFAULT 'Unknown',
  duration text,
  category text NOT NULL DEFAULT 'Focus',
  audio_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.music ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view music" ON public.music FOR SELECT USING (true);
CREATE POLICY "Admins and uploaders can add music" ON public.music FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'uploader'::app_role));
CREATE POLICY "Admins can delete music" ON public.music FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create quotes table
CREATE TABLE public.quotes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'ENERGY',
  image_url text NOT NULL,
  is_pro boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quotes" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "Admins and uploaders can add quotes" ON public.quotes FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'uploader'::app_role));
CREATE POLICY "Admins can delete quotes" ON public.quotes FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));
