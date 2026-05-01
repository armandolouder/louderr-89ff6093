-- 1. Reforçar RLS na tabela de credenciais do Instagram
ALTER TABLE public.instagram_personal_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own credentials" ON public.instagram_personal_credentials;
CREATE POLICY "Users can manage their own credentials" 
ON public.instagram_personal_credentials 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Reforçar RLS em Conversas e Mensagens
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own conversations" ON public.conversations;
CREATE POLICY "Users can manage their own conversations" 
ON public.conversations 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own messages" ON public.messages;
CREATE POLICY "Users can manage their own messages" 
ON public.messages 
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Proteção de Funções SECURITY DEFINER
-- Revoga execução pública de funções para evitar abusos via 'anon'
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Re-garante acesso apenas para funções essenciais para usuários logados
GRANT EXECUTE ON FUNCTION public.update_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_campaign_sent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_id() TO authenticated;

-- Garante acesso total para o papel de serviço (Edge Functions)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
