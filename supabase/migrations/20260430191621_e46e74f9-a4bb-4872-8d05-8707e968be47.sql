-- Agenda fetch de DMs do Instagram pessoal a cada 2 minutos
SELECT cron.schedule(
  'instagram-personal-fetch-2m',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ynawiygjzkypuvenvroi.supabase.co/functions/v1/instagram-personal-fetch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);