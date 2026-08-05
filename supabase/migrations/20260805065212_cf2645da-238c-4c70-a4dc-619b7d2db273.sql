ALTER TABLE public.daily_quotes
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'mental_health',
  ADD COLUMN IF NOT EXISTS subcategory text NOT NULL DEFAULT 'stress';

CREATE INDEX IF NOT EXISTS daily_quotes_cat_idx ON public.daily_quotes (category, subcategory);