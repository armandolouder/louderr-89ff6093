-- Create quick_responses table for storing quick response templates
CREATE TABLE public.quick_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'gif', 'video', 'document')),
  shortcut TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.quick_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for access (public read for now, can be restricted later)
CREATE POLICY "Quick responses are viewable by everyone" 
ON public.quick_responses 
FOR SELECT 
USING (true);

CREATE POLICY "Quick responses can be created by everyone" 
ON public.quick_responses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Quick responses can be updated by everyone" 
ON public.quick_responses 
FOR UPDATE 
USING (true);

CREATE POLICY "Quick responses can be deleted by everyone" 
ON public.quick_responses 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates using existing function
CREATE TRIGGER update_quick_responses_updated_at
BEFORE UPDATE ON public.quick_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();