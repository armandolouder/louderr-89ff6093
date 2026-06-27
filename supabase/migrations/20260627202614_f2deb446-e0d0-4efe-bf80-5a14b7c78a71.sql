SELECT cron.schedule(
  'analyze-customers-daily',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ynawiygjzkypuvenvroi.supabase.co/functions/v1/analyze-customers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);