
-- Create the timestamp function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  selected_categories TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own preferences"
ON public.user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON public.user_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
