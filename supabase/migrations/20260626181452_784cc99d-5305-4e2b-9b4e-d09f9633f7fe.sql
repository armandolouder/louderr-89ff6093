CREATE OR REPLACE FUNCTION public.audit_catalog()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'summary', (
      SELECT jsonb_build_object(
        'products', (SELECT count(*) FROM catalog_products),
        'variants', (SELECT count(*) FROM catalog_variants),
        'images', (SELECT count(*) FROM catalog_images),
        'categories', (SELECT count(DISTINCT category) FROM catalog_products WHERE category IS NOT NULL),
        'colors', (SELECT count(DISTINCT color) FROM catalog_variants WHERE color IS NOT NULL),
        'sizes', (SELECT count(DISTINCT size) FROM catalog_variants WHERE size IS NOT NULL)
      )
    ),
    'colors', (
      SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'count')::int DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('color', color, 'count', count(*)) t
        FROM catalog_variants WHERE color IS NOT NULL
        GROUP BY color
      ) s
    ),
    'color_inconsistencies', (
      SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'normalized', norm,
          'variants', jsonb_agg(DISTINCT color),
          'total', sum(c)
        ) t
        FROM (
          SELECT color, lower(regexp_replace(color, '[^a-zA-Z0-9]', '', 'g')) norm, count(*) c
          FROM catalog_variants WHERE color IS NOT NULL
          GROUP BY color
        ) x
        GROUP BY norm
        HAVING count(DISTINCT color) > 1
      ) s
    ),
    'sizes', (
      SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'count')::int DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('size', size, 'count', count(*)) t
        FROM catalog_variants WHERE size IS NOT NULL
        GROUP BY size
      ) s
    ),
    'categories', (
      SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'products')::int DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'category', COALESCE(category, 'Sem categoria'),
          'products', count(*),
          'variants', sum(variant_count)
        ) t
        FROM catalog_products
        GROUP BY category
      ) s
    ),
    'models', (
      SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'variant_count')::int ASC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object('variant_count', variant_count, 'products', count(*)) t
        FROM catalog_products
        GROUP BY variant_count
      ) s
    ),
    'duplicates', (
      SELECT COALESCE(jsonb_agg(t ORDER BY (t->>'count')::int DESC), '[]'::jsonb)
      FROM (
        SELECT jsonb_build_object(
          'name', max(name),
          'count', count(*),
          'ids', jsonb_agg(nuvemshop_product_id)
        ) t
        FROM catalog_products
        WHERE name IS NOT NULL
        GROUP BY lower(trim(name))
        HAVING count(*) > 1
      ) s
    ),
    'data_quality', (
      SELECT jsonb_build_object(
        'no_color', (SELECT count(*) FROM catalog_variants WHERE color IS NULL),
        'no_size', (SELECT count(*) FROM catalog_variants WHERE size IS NULL),
        'no_price', (SELECT count(*) FROM catalog_variants WHERE price IS NULL OR price = 0),
        'no_sku', (SELECT count(*) FROM catalog_variants WHERE sku IS NULL),
        'no_stock', (SELECT count(*) FROM catalog_variants WHERE stock IS NULL),
        'no_images', (SELECT count(*) FROM catalog_products WHERE image_count = 0),
        'one_image', (SELECT count(*) FROM catalog_products WHERE image_count = 1)
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_catalog() TO authenticated, service_role;