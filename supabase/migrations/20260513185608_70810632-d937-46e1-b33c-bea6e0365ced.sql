
CREATE TABLE public.uploader_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uploader_applications_user_pending
  ON public.uploader_applications(user_id)
  WHERE status = 'pending';

ALTER TABLE public.uploader_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit own application"
ON public.uploader_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own application"
ON public.uploader_applications FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update applications"
ON public.uploader_applications FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete applications"
ON public.uploader_applications FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_uploader_applications_updated_at
BEFORE UPDATE ON public.uploader_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When an application is approved, grant the uploader role automatically
CREATE OR REPLACE FUNCTION public.handle_uploader_application_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'uploader')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_uploader_application_approved
AFTER UPDATE ON public.uploader_applications
FOR EACH ROW EXECUTE FUNCTION public.handle_uploader_application_approval();
