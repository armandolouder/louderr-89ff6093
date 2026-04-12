DELETE FROM public.page_views 
WHERE country != 'BR' 
AND LOWER(TRIM(city)) IN (
  'prineville', 'forest city', 'luleå', 'lulea', 'clonee',
  'fort worth', 'altoona', 'new albany', 'papillion',
  'council bluffs', 'the dalles', 'lenoir', 'maiden',
  'gallatin', 'springfield'
);