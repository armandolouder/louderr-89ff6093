UPDATE imported_customers SET region = CASE lower(trim(state))
  WHEN 'acre' THEN 'Norte' WHEN 'amapá' THEN 'Norte' WHEN 'amazonas' THEN 'Norte' WHEN 'pará' THEN 'Norte' WHEN 'rondônia' THEN 'Norte' WHEN 'roraima' THEN 'Norte' WHEN 'tocantins' THEN 'Norte'
  WHEN 'alagoas' THEN 'Nordeste' WHEN 'bahia' THEN 'Nordeste' WHEN 'ceará' THEN 'Nordeste' WHEN 'maranhão' THEN 'Nordeste' WHEN 'paraíba' THEN 'Nordeste' WHEN 'pernambuco' THEN 'Nordeste' WHEN 'piauí' THEN 'Nordeste' WHEN 'rio grande do norte' THEN 'Nordeste' WHEN 'sergipe' THEN 'Nordeste'
  WHEN 'distrito federal' THEN 'Centro-Oeste' WHEN 'goiás' THEN 'Centro-Oeste' WHEN 'mato grosso' THEN 'Centro-Oeste' WHEN 'mato grosso do sul' THEN 'Centro-Oeste'
  WHEN 'espírito santo' THEN 'Sudeste' WHEN 'minas gerais' THEN 'Sudeste' WHEN 'rio de janeiro' THEN 'Sudeste' WHEN 'são paulo' THEN 'Sudeste'
  WHEN 'paraná' THEN 'Sul' WHEN 'rio grande do sul' THEN 'Sul' WHEN 'santa catarina' THEN 'Sul'
  ELSE region END
WHERE (region IS NULL OR region = '') AND state IS NOT NULL AND trim(state) <> '';