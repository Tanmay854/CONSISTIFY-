
-- 1. Generator function (Crockford-ish base32, no ambiguous chars)
CREATE OR REPLACE FUNCTION public.gen_public_id6()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 2. Trigger to assign unique public_id on insert if not provided
CREATE OR REPLACE FUNCTION public.assign_public_id()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  candidate text;
  exists_count int;
  attempts int := 0;
BEGIN
  IF NEW.public_id IS NOT NULL AND length(NEW.public_id) = 6 THEN
    RETURN NEW;
  END IF;
  LOOP
    candidate := public.gen_public_id6();
    IF TG_TABLE_NAME = 'reels' THEN
      SELECT count(*) INTO exists_count FROM public.reels WHERE public_id = candidate;
    ELSIF TG_TABLE_NAME = 'quotes' THEN
      SELECT count(*) INTO exists_count FROM public.quotes WHERE public_id = candidate;
    ELSE
      exists_count := 0;
    END IF;
    EXIT WHEN exists_count = 0;
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Could not generate unique public_id';
    END IF;
  END LOOP;
  NEW.public_id := candidate;
  RETURN NEW;
END;
$$;

-- 3. reels.public_id
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS public_id text;

DO $$
DECLARE
  r record;
  candidate text;
BEGIN
  FOR r IN SELECT id FROM public.reels WHERE public_id IS NULL LOOP
    LOOP
      candidate := public.gen_public_id6();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.reels WHERE public_id = candidate);
    END LOOP;
    UPDATE public.reels SET public_id = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.reels ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reels_public_id_key ON public.reels(public_id);

DROP TRIGGER IF EXISTS trg_reels_public_id ON public.reels;
CREATE TRIGGER trg_reels_public_id
BEFORE INSERT ON public.reels
FOR EACH ROW EXECUTE FUNCTION public.assign_public_id();

-- 4. quotes.public_id
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS public_id text;

DO $$
DECLARE
  r record;
  candidate text;
BEGIN
  FOR r IN SELECT id FROM public.quotes WHERE public_id IS NULL LOOP
    LOOP
      candidate := public.gen_public_id6();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.quotes WHERE public_id = candidate);
    END LOOP;
    UPDATE public.quotes SET public_id = candidate WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.quotes ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS quotes_public_id_key ON public.quotes(public_id);

DROP TRIGGER IF EXISTS trg_quotes_public_id ON public.quotes;
CREATE TRIGGER trg_quotes_public_id
BEFORE INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.assign_public_id();

-- 5. Make title optional on reels and quotes
ALTER TABLE public.reels  ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.quotes ALTER COLUMN title DROP NOT NULL;
