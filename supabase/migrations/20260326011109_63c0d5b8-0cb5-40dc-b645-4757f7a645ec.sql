CREATE TABLE public.bot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to bot_settings" ON public.bot_settings FOR ALL TO public USING (true) WITH CHECK (true);

INSERT INTO public.bot_settings (key, value, is_active) VALUES (
  'chatbot_nuvemshop',
  '{"system_prompt": "Você é um assistente de atendimento ao cliente da loja. Seja educado, prestativo e responda de forma concisa. Responda em português brasileiro.", "model": "llama-3.3-70b-versatile", "max_tokens": 512}'::jsonb,
  false
);