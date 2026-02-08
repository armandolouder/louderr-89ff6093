-- Create custom_tabs table for organizing conversations
CREATE TABLE public.custom_tabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT 'folder',
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add tab_id column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN tab_id UUID REFERENCES public.custom_tabs(id) ON DELETE SET NULL;

-- Enable RLS on custom_tabs
ALTER TABLE public.custom_tabs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for custom_tabs (same pattern as other tables)
CREATE POLICY "Allow all access to custom_tabs" 
ON public.custom_tabs 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create trigger for updating updated_at on custom_tabs
CREATE TRIGGER update_custom_tabs_updated_at
BEFORE UPDATE ON public.custom_tabs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for custom_tabs
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_tabs;