select cron.schedule(
  'process-whatsapp-queue-cron',
  '* * * * *',
  $$
  select net.http_post(
    url:='https://ynawiygjzkypuvenvroi.supabase.co/functions/v1/process-whatsapp-queue',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYXdpeWdqemt5cHV2ZW52cm9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0OTc5MTMsImV4cCI6MjA4NjA3MzkxM30.3uMLk3HmTErHNsQJBNIgsRramTD6uGp5TiibBh-aTQ4"}'::jsonb,
    body:='{"cron": true, "limit": 20}'::jsonb
  ) as request_id;
  $$
);