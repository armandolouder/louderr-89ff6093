
CREATE TABLE public.variation_models (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.variation_models TO authenticated;
GRANT ALL ON public.variation_models TO service_role;
ALTER TABLE public.variation_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own variation_models" ON public.variation_models
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_user_id_variation_models BEFORE INSERT ON public.variation_models
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER update_variation_models_updated_at BEFORE UPDATE ON public.variation_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.variation_colors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  variation_model_id uuid NOT NULL REFERENCES public.variation_models(id) ON DELETE CASCADE,
  nome_cor text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.variation_colors TO authenticated;
GRANT ALL ON public.variation_colors TO service_role;
ALTER TABLE public.variation_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own variation_colors" ON public.variation_colors
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_user_id_variation_colors BEFORE INSERT ON public.variation_colors
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE INDEX idx_variation_colors_model ON public.variation_colors(variation_model_id);

CREATE TABLE public.variation_materials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  variation_model_id uuid NOT NULL REFERENCES public.variation_models(id) ON DELETE CASCADE,
  nome_malha text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.variation_materials TO authenticated;
GRANT ALL ON public.variation_materials TO service_role;
ALTER TABLE public.variation_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own variation_materials" ON public.variation_materials
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_user_id_variation_materials BEFORE INSERT ON public.variation_materials
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE INDEX idx_variation_materials_model ON public.variation_materials(variation_model_id);

CREATE TABLE public.variation_sizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  variation_model_id uuid NOT NULL REFERENCES public.variation_models(id) ON DELETE CASCADE,
  tamanho text NOT NULL,
  preco numeric(10,2),
  ativo boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.variation_sizes TO authenticated;
GRANT ALL ON public.variation_sizes TO service_role;
ALTER TABLE public.variation_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own variation_sizes" ON public.variation_sizes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_user_id_variation_sizes BEFORE INSERT ON public.variation_sizes
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE INDEX idx_variation_sizes_model ON public.variation_sizes(variation_model_id);
