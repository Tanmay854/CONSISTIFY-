
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text,
  instructor text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Self Improvement',
  cover_image text NOT NULL DEFAULT '',
  hero_image text,
  duration text,
  lessons_count integer DEFAULT 0,
  level text DEFAULT 'Beginner',
  rating numeric(3,1) DEFAULT 0,
  affiliate_link text NOT NULL DEFAULT '',
  what_youll_learn text,
  curriculum text,
  requirements text,
  featured boolean NOT NULL DEFAULT false,
  trending boolean NOT NULL DEFAULT false,
  is_new_release boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published courses"
  ON public.courses FOR SELECT
  USING (published = true OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can insert courses"
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can update courses"
  ON public.courses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can delete courses"
  ON public.courses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_courses_published ON public.courses(published);
CREATE INDEX idx_courses_category ON public.courses(category);
CREATE INDEX idx_courses_featured ON public.courses(featured) WHERE featured = true;
