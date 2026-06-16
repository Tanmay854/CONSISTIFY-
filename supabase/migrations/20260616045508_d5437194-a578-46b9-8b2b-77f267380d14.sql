
ALTER TABLE public.reels  ALTER COLUMN public_id SET DEFAULT public.gen_public_id6();
ALTER TABLE public.quotes ALTER COLUMN public_id SET DEFAULT public.gen_public_id6();

-- Harden new SECURITY-DEFINER-ish functions with a fixed search_path (linter warns)
ALTER FUNCTION public.gen_public_id6() SET search_path = public;
ALTER FUNCTION public.assign_public_id() SET search_path = public;
