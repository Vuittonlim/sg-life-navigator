-- Create the update function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create user_preferences table with JSONB for flexible preference storage
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymous_id UUID NOT NULL,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  confidence_level TEXT DEFAULT 'inferred' CHECK (confidence_level IN ('explicit', 'inferred', 'assumed')),
  source TEXT DEFAULT 'user_input',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(anonymous_id, preference_key)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for anonymous access
CREATE POLICY "Users can view their own preferences"
ON public.user_preferences FOR SELECT
USING (true);

CREATE POLICY "Users can create preferences"
ON public.user_preferences FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own preferences"
ON public.user_preferences FOR UPDATE
USING (true);

CREATE POLICY "Users can delete their own preferences"
ON public.user_preferences FOR DELETE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_user_preferences_anonymous_id ON public.user_preferences(anonymous_id);