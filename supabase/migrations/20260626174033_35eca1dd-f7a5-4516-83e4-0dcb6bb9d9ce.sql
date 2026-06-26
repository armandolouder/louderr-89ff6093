CREATE TABLE public.catalog_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  nuvemshop_product_id TEXT NOT NULL,
  name TEXT,
  description TEXT,
  category TEXT,
  brand TEXT,
  status TEXT,
  handle TEXT,
  image_count INTEGER NOT NULL DEFAULT 0,
  variant_count INTEGER NOT NULL DEFAULT 0,
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (nuvemshop_product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_products TO authenticated;
GRANT ALL ON public.catalog_products TO service_role;
ALTER TABLE public.catalog_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own catalog products" ON public.catalog_products
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_catalog_products_user_id BEFORE INSERT ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE TRIGGER update_catalog_products_updated_at BEFORE UPDATE ON public.catalog_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.catalog_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  product_id UUID NOT NULL REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  nuvemshop_variant_id TEXT NOT NULL,
  name TEXT,
  size TEXT,
  color TEXT,
  price NUMERIC,
  stock INTEGER,
  sku TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (nuvemshop_variant_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_variants TO authenticated;
GRANT ALL ON public.catalog_variants TO service_role;
ALTER TABLE public.catalog_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own catalog variants" ON public.catalog_variants
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_catalog_variants_user_id BEFORE INSERT ON public.catalog_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE INDEX idx_catalog_variants_product ON public.catalog_variants(product_id);

CREATE TABLE public.catalog_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  product_id UUID NOT NULL REFERENCES public.catalog_products(id) ON DELETE CASCADE,
  nuvemshop_image_id TEXT,
  image_url TEXT NOT NULL,
  position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.catalog_images TO authenticated;
GRANT ALL ON public.catalog_images TO service_role;
ALTER TABLE public.catalog_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own catalog images" ON public.catalog_images
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_catalog_images_user_id BEFORE INSERT ON public.catalog_images
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();
CREATE INDEX idx_catalog_images_product ON public.catalog_images(product_id);