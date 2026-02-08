# Guia Completo de Migração - Lovable Cloud para Supabase Externo

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Parte 1: Configuração do Supabase Externo](#parte-1-configuração-do-supabase-externo)
4. [Parte 2: Schema do Banco de Dados](#parte-2-schema-do-banco-de-dados)
5. [Parte 3: Políticas RLS](#parte-3-políticas-rls)
6. [Parte 4: Funções e Triggers](#parte-4-funções-e-triggers)
7. [Parte 5: Storage Buckets](#parte-5-storage-buckets)
8. [Parte 6: Edge Functions](#parte-6-edge-functions)
9. [Parte 7: Migração de Dados](#parte-7-migração-de-dados)
10. [Parte 8: Configuração do Novo Projeto Lovable](#parte-8-configuração-do-novo-projeto-lovable)
11. [Parte 9: Secrets e Variáveis de Ambiente](#parte-9-secrets-e-variáveis-de-ambiente)
12. [Parte 10: Checklist Final](#parte-10-checklist-final)

---

## Visão Geral

Este guia detalha o processo completo para migrar o projeto CRM WhatsApp do Lovable Cloud para uma instância externa do Supabase. A migração preserva todas as funcionalidades, incluindo:

- Inbox de conversas (WhatsApp)
- Sistema de campanhas com clusters
- Importação de clientes
- Respostas rápidas
- Abas personalizadas
- Autenticação de usuários

**Tempo estimado:** 2-4 horas

---

## Pré-requisitos

### Conta Supabase
1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto (anote a senha do banco de dados)
3. Aguarde o projeto inicializar (~2 minutos)

### Ferramentas Necessárias
- Navegador moderno
- Editor de código (VS Code recomendado)
- Supabase CLI (opcional, para deploy de Edge Functions)

### Dados para Backup
Exporte os seguintes dados do Lovable Cloud antes de começar:
- `contacts`
- `conversations`
- `messages`
- `custom_tabs`
- `profiles`
- `quick_responses`
- `imported_customers`
- `customer_clusters`
- `campaigns`
- `campaign_messages`
- `whatsapp_queue`
- `send_logs`
- `import_batches`

---

## Parte 1: Configuração do Supabase Externo

### 1.1 Criar Projeto

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard)
2. Clique em **New Project**
3. Preencha:
   - **Name:** `crm-whatsapp` (ou nome de sua preferência)
   - **Database Password:** (guarde em local seguro!)
   - **Region:** South America (São Paulo) - `sa-east-1`
4. Clique em **Create new project**

### 1.2 Obter Credenciais

Após o projeto inicializar, vá em **Settings > API** e copie:

| Credencial | Onde encontrar | Uso |
|------------|----------------|-----|
| `Project URL` | Project URL | `VITE_SUPABASE_URL` |
| `anon public` | Project API keys | `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `service_role` | Project API keys | Edge Functions (secreto!) |

---

## Parte 2: Schema do Banco de Dados

Execute o seguinte SQL no **SQL Editor** do Supabase:

### 2.1 Tabela: contacts

```sql
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  instagram_id TEXT,
  avatar_url TEXT,
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_email ON public.contacts(email);
```

### 2.2 Tabela: custom_tabs

```sql
CREATE TABLE public.custom_tabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT 'folder',
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 2.3 Tabela: conversations

```sql
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'novo',
  assignee_id UUID,
  assignee_name TEXT,
  unread_count INTEGER DEFAULT 0,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  tab_id UUID REFERENCES public.custom_tabs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX idx_conversations_contact ON public.conversations(contact_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_tab ON public.conversations(tab_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
```

### 2.4 Tabela: messages

```sql
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  sender_id UUID,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
```

### 2.5 Tabela: profiles

```sql
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
```

### 2.6 Tabela: quick_responses

```sql
CREATE TABLE public.quick_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  shortcut TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 2.7 Tabela: customer_clusters

```sql
CREATE TABLE public.customer_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  objective TEXT,
  recommendation TEXT,
  color TEXT DEFAULT '#6366f1',
  criteria JSONB DEFAULT '{}'::jsonb,
  customer_count INTEGER DEFAULT 0,
  percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 2.8 Tabela: import_batches

```sql
CREATE TABLE public.import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  status TEXT DEFAULT 'processing',
  total_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  invalid_rows INTEGER DEFAULT 0,
  valid_phones INTEGER DEFAULT 0,
  invalid_phones INTEGER DEFAULT 0,
  absent_phones INTEGER DEFAULT 0,
  valid_emails INTEGER DEFAULT 0,
  invalid_emails INTEGER DEFAULT 0,
  absent_emails INTEGER DEFAULT 0,
  column_mapping JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 2.9 Tabela: imported_customers

```sql
CREATE TABLE public.imported_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
  cluster_id UUID REFERENCES public.customer_clusters(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  phone_status TEXT DEFAULT 'pending',
  email TEXT,
  email_status TEXT DEFAULT 'pending',
  city TEXT,
  state TEXT,
  region TEXT,
  favorite_product TEXT,
  favorite_category TEXT,
  source TEXT,
  total_spent NUMERIC DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  first_purchase_at TIMESTAMP WITH TIME ZONE,
  last_purchase_at TIMESTAMP WITH TIME ZONE,
  rfm_recency INTEGER,
  rfm_frequency INTEGER,
  rfm_monetary INTEGER,
  rfm_score TEXT,
  ticket_level TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_imported_customers_cluster ON public.imported_customers(cluster_id);
CREATE INDEX idx_imported_customers_batch ON public.imported_customers(import_batch_id);
CREATE INDEX idx_imported_customers_phone ON public.imported_customers(phone);
```

### 2.10 Tabela: campaigns

```sql
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  channel TEXT DEFAULT 'whatsapp',
  status TEXT DEFAULT 'draft',
  cluster_ids UUID[] DEFAULT '{}'::uuid[],
  daily_limit INTEGER DEFAULT 50,
  delay_min_seconds INTEGER DEFAULT 180,
  delay_max_seconds INTEGER DEFAULT 480,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 2.11 Tabela: campaign_messages

```sql
CREATE TABLE public.campaign_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice
CREATE INDEX idx_campaign_messages_campaign ON public.campaign_messages(campaign_id);
```

### 2.12 Tabela: whatsapp_queue

```sql
CREATE TABLE public.whatsapp_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.imported_customers(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.campaign_messages(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_whatsapp_queue_campaign ON public.whatsapp_queue(campaign_id);
CREATE INDEX idx_whatsapp_queue_status ON public.whatsapp_queue(status);
CREATE INDEX idx_whatsapp_queue_scheduled ON public.whatsapp_queue(scheduled_at);
```

### 2.13 Tabela: send_logs

```sql
CREATE TABLE public.send_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.imported_customers(id) ON DELETE SET NULL,
  queue_id UUID REFERENCES public.whatsapp_queue(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  content TEXT,
  cluster_name TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  response_data JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_send_logs_campaign ON public.send_logs(campaign_id);
CREATE INDEX idx_send_logs_status ON public.send_logs(status);
CREATE INDEX idx_send_logs_sent ON public.send_logs(sent_at DESC);
```

---

## Parte 3: Políticas RLS

Execute o seguinte SQL para habilitar RLS e criar políticas:

### 3.1 Tabelas Públicas (acesso total)

```sql
-- Contacts
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to contacts" ON public.contacts FOR ALL USING (true) WITH CHECK (true);

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- Custom Tabs
ALTER TABLE public.custom_tabs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to custom_tabs" ON public.custom_tabs FOR ALL USING (true) WITH CHECK (true);

-- Quick Responses
ALTER TABLE public.quick_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Quick responses are viewable by everyone" ON public.quick_responses FOR SELECT USING (true);
CREATE POLICY "Quick responses can be created by everyone" ON public.quick_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Quick responses can be updated by everyone" ON public.quick_responses FOR UPDATE USING (true);
CREATE POLICY "Quick responses can be deleted by everyone" ON public.quick_responses FOR DELETE USING (true);

-- Customer Clusters
ALTER TABLE public.customer_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to customer_clusters" ON public.customer_clusters FOR ALL USING (true) WITH CHECK (true);

-- Import Batches
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to import_batches" ON public.import_batches FOR ALL USING (true) WITH CHECK (true);

-- Imported Customers
ALTER TABLE public.imported_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to imported_customers" ON public.imported_customers FOR ALL USING (true) WITH CHECK (true);

-- Campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

-- Campaign Messages
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to campaign_messages" ON public.campaign_messages FOR ALL USING (true) WITH CHECK (true);

-- WhatsApp Queue
ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to whatsapp_queue" ON public.whatsapp_queue FOR ALL USING (true) WITH CHECK (true);

-- Send Logs
ALTER TABLE public.send_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to send_logs" ON public.send_logs FOR ALL USING (true) WITH CHECK (true);
```

### 3.2 Profiles (acesso restrito por usuário)

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = user_id);
```

---

## Parte 4: Funções e Triggers

### 4.1 Função: update_updated_at

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

### 4.2 Função: handle_new_user

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, phone)
  VALUES (NEW.id, NEW.phone);
  RETURN NEW;
END;
$$;
```

### 4.3 Triggers de updated_at

```sql
-- Contacts
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Custom Tabs
CREATE TRIGGER update_custom_tabs_updated_at
  BEFORE UPDATE ON public.custom_tabs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Quick Responses
CREATE TRIGGER update_quick_responses_updated_at
  BEFORE UPDATE ON public.quick_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Customer Clusters
CREATE TRIGGER update_customer_clusters_updated_at
  BEFORE UPDATE ON public.customer_clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Imported Customers
CREATE TRIGGER update_imported_customers_updated_at
  BEFORE UPDATE ON public.imported_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Campaigns
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### 4.4 Trigger: Criar profile para novos usuários

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Parte 5: Storage Buckets

### 5.1 Criar Bucket

No Supabase Dashboard, vá em **Storage** e crie:

| Bucket Name | Public | Descrição |
|-------------|--------|-----------|
| `whatsapp-media` | ✅ Sim | Mídias recebidas/enviadas no WhatsApp |

### 5.2 Políticas de Storage

```sql
-- Bucket whatsapp-media (público para leitura)
CREATE POLICY "Public read access for whatsapp-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Authenticated users can upload to whatsapp-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'whatsapp-media');

CREATE POLICY "Authenticated users can update whatsapp-media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Authenticated users can delete from whatsapp-media"
ON storage.objects FOR DELETE
USING (bucket_id = 'whatsapp-media');
```

---

## Parte 6: Edge Functions

As Edge Functions precisam ser deployadas manualmente no Supabase externo. Copie os arquivos da pasta `supabase/functions/`:

### Lista de Edge Functions

| Função | Arquivo | Descrição |
|--------|---------|-----------|
| `whatsapp-webhook` | `supabase/functions/whatsapp-webhook/index.ts` | Recebe mensagens do WhatsApp |
| `send-whatsapp` | `supabase/functions/send-whatsapp/index.ts` | Envia mensagens para WhatsApp |
| `send-reaction` | `supabase/functions/send-reaction/index.ts` | Envia reações a mensagens |
| `delete-message` | `supabase/functions/delete-message/index.ts` | Deleta mensagens |
| `fetch-link-preview` | `supabase/functions/fetch-link-preview/index.ts` | Busca preview de links |
| `groq-chat` | `supabase/functions/groq-chat/index.ts` | Integração com Groq AI |
| `check-uazapi-status` | `supabase/functions/check-uazapi-status/index.ts` | Verifica status da UAZAPI |
| `analyze-customers` | `supabase/functions/analyze-customers/index.ts` | Analisa clientes com IA |
| `generate-campaign-messages` | `supabase/functions/generate-campaign-messages/index.ts` | Gera mensagens de campanha |
| `process-whatsapp-queue` | `supabase/functions/process-whatsapp-queue/index.ts` | Processa fila de envio |

### Deploy via Supabase CLI

```bash
# Instalar CLI
npm install -g supabase

# Login
supabase login

# Vincular projeto
supabase link --project-ref SEU_PROJECT_REF

# Deploy de todas as funções
supabase functions deploy whatsapp-webhook --no-verify-jwt
supabase functions deploy send-whatsapp --no-verify-jwt
supabase functions deploy send-reaction --no-verify-jwt
supabase functions deploy delete-message --no-verify-jwt
supabase functions deploy fetch-link-preview --no-verify-jwt
supabase functions deploy groq-chat --no-verify-jwt
supabase functions deploy check-uazapi-status --no-verify-jwt
supabase functions deploy analyze-customers --no-verify-jwt
supabase functions deploy generate-campaign-messages --no-verify-jwt
supabase functions deploy process-whatsapp-queue --no-verify-jwt
```

---

## Parte 7: Migração de Dados

### 7.1 Exportar do Lovable Cloud

1. Acesse o backend do projeto atual no Lovable
2. Vá em **Database > Tables**
3. Para cada tabela, clique no botão de **Export** (CSV)

### 7.2 Importar no Supabase Externo

1. No Supabase Dashboard, vá em **Table Editor**
2. Selecione a tabela desejada
3. Clique em **Insert** > **Import data from CSV**
4. Faça upload do arquivo CSV exportado

### 7.3 Ordem de Importação (importante!)

Devido às foreign keys, importe nesta ordem:

1. `custom_tabs`
2. `contacts`
3. `conversations`
4. `messages`
5. `profiles`
6. `quick_responses`
7. `customer_clusters`
8. `import_batches`
9. `imported_customers`
10. `campaigns`
11. `campaign_messages`
12. `whatsapp_queue`
13. `send_logs`

---

## Parte 8: Configuração do Novo Projeto Lovable

### 8.1 Criar Novo Projeto

1. Acesse [lovable.dev](https://lovable.dev)
2. Crie um **novo projeto** (NÃO ative Lovable Cloud)
3. Dê um nome ao projeto

### 8.2 Conectar Supabase Externo

1. No novo projeto, vá em **Settings > Connectors**
2. Clique em **Connect Supabase**
3. Insira:
   - **Project URL:** (do seu Supabase externo)
   - **Anon Key:** (do seu Supabase externo)
4. Confirme a conexão

### 8.3 Transferir o Código

**Opção A: Via GitHub**
1. No projeto antigo: Settings > GitHub > Push to Repository
2. No projeto novo: Settings > GitHub > Import from Repository

**Opção B: Manual**
1. Baixe os arquivos do projeto antigo
2. Faça upload para o projeto novo

---

## Parte 9: Secrets e Variáveis de Ambiente

### 9.1 Secrets Necessários

Configure os seguintes secrets no Supabase (Settings > Edge Functions > Secrets):

| Secret | Descrição | Obrigatório |
|--------|-----------|-------------|
| `UAZAPI_SERVER_URL` | URL do servidor UAZAPI | ✅ |
| `UAZAPI_INSTANCE_TOKEN` | Token da instância UAZAPI | ✅ |
| `GROQ_API_KEY` | Chave API do Groq | ✅ |
| `SUPABASE_URL` | URL do projeto (automático) | Auto |
| `SUPABASE_ANON_KEY` | Anon key (automático) | Auto |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | ✅ |

### 9.2 Configuração no Código

Atualize o arquivo `.env` do novo projeto:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...
VITE_SUPABASE_PROJECT_ID=SEU_PROJECT_ID
```

---

## Parte 10: Checklist Final

### ✅ Banco de Dados
- [ ] Todas as 13 tabelas criadas
- [ ] Índices aplicados
- [ ] RLS habilitado em todas as tabelas
- [ ] Políticas RLS configuradas
- [ ] Funções criadas (`update_updated_at`, `handle_new_user`)
- [ ] Triggers de `updated_at` criados
- [ ] Trigger de criação de profile criado

### ✅ Storage
- [ ] Bucket `whatsapp-media` criado
- [ ] Bucket configurado como público
- [ ] Políticas de storage aplicadas

### ✅ Edge Functions
- [ ] Todas as 10 funções deployadas
- [ ] JWT verification desabilitado onde necessário
- [ ] Secrets configurados

### ✅ Dados
- [ ] Exportação completa do Lovable Cloud
- [ ] Importação na ordem correta
- [ ] Verificação de integridade (contagem de registros)

### ✅ Código
- [ ] Novo projeto Lovable criado
- [ ] Supabase externo conectado
- [ ] Código transferido
- [ ] Variáveis de ambiente atualizadas

### ✅ Testes
- [ ] Login funcionando
- [ ] Inbox carregando conversas
- [ ] Envio de mensagens funcionando
- [ ] Recebimento via webhook funcionando
- [ ] Campanhas carregando clusters
- [ ] Importação de clientes funcionando

---

## 🆘 Troubleshooting

### Erro: "relation does not exist"
**Causa:** Tabela não foi criada ou nome está incorreto
**Solução:** Verifique se executou todos os scripts SQL da Parte 2

### Erro: "permission denied"
**Causa:** RLS está bloqueando acesso
**Solução:** Verifique se as políticas RLS da Parte 3 foram aplicadas

### Erro: "foreign key violation"
**Causa:** Dados importados fora de ordem
**Solução:** Delete os dados e reimporte seguindo a ordem da Parte 7.3

### Edge Functions não respondem
**Causa:** Secrets não configurados ou função não deployada
**Solução:** Verifique os secrets na Parte 9.1 e redeploy as funções

### Webhook não recebe mensagens
**Causa:** URL do webhook não configurada na UAZAPI
**Solução:** Configure a URL: `https://SEU_PROJECT.supabase.co/functions/v1/whatsapp-webhook`

---

## 📞 Suporte

Para dúvidas sobre:
- **Supabase:** [supabase.com/docs](https://supabase.com/docs)
- **UAZAPI:** [docs.uazapi.com](https://docs.uazapi.com)
- **Lovable:** [docs.lovable.dev](https://docs.lovable.dev)

---

*Guia gerado em: Fevereiro 2026*
*Versão: 1.0*
