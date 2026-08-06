ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS thumbnail_url text;

DELETE FROM public.daily_quotes a
USING public.daily_quotes b
WHERE lower(btrim(a.text)) = lower(btrim(b.text))
  AND (a.created_at, a.id) > (b.created_at, b.id);

CREATE UNIQUE INDEX IF NOT EXISTS daily_quotes_unique_text
  ON public.daily_quotes ((lower(btrim(text))));