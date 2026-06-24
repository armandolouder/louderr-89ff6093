## Objetivo

Adicionar a integração **Instagram DM** usando a API da Zernio (`https://zernio.com/api/v1`), com **recebimento** e **envio** de mensagens diretas do Instagram, totalmente integrada à Inbox existente (mesmo padrão do WhatsApp/Instagram atual).

A integração volta a aparecer na tela de Integrações como um novo item: **Instagram DM (Zernio)**.

## Como o Zernio funciona (resumo da doc)

- Autenticação por API key (`Authorization: Bearer sk_...`).
- Estrutura: Profiles → Accounts (conta IG conectada via OAuth no painel Zernio) → Inbox.
- Endpoints usados:
  - `GET /v1/accounts` — listar contas conectadas (pega `accountId` do Instagram).
  - `GET /v1/inbox/conversations?platform=instagram` — listar conversas.
  - `GET /v1/inbox/conversations/{id}/messages` — histórico.
  - `POST /v1/inbox/conversations/{id}/messages` — enviar mensagem (texto + anexos por URL).
  - Webhooks: `message.received`, `message.sent`, `message.read` para sincronizar em tempo real.

A conexão da conta do Instagram em si (login/OAuth) é feita no painel da Zernio; aqui consumimos a API com a key.

## Etapas

### 1. Secret
- Solicitar o secret `ZERNIO_API_KEY` (chave que você já tem).

### 2. Banco de dados (migração)
- Tabela `zernio_accounts` (id, user_id, account_id, username, profile_id, connected, created_at) com RLS por `user_id` + GRANTs.
- Adicionar colunas em `conversations`: `external_conversation_id` (id da conversa no Zernio) e `external_account_id` (conta IG), para mapear envio/recebimento. Sem isso não dá para responder a thread certa.

### 3. Edge Functions
- `zernio-config`: testa a key, lista contas (`GET /accounts`) e salva a conta selecionada em `zernio_accounts`. Retorna status de conexão para a UI.
- `zernio-webhook` (`verify_jwt = false`): recebe `message.received`/`message.sent`/`message.read`, resolve dono via `get_webhook_owner_user_id`, cria/atualiza `contacts` (usando `instagram_id`), `conversations` (channel `instagram`, guardando `external_conversation_id`) e insere em `messages`. Reaproveita o padrão do `inbox-registry`.
- `zernio-send`: valida sessão do usuário, carrega a conversa, e envia via `POST /inbox/conversations/{id}/messages` (texto e mídia por URL assinada do bucket `whatsapp-media`). Grava a mensagem enviada em `messages`.

### 4. Frontend
- Novo componente `src/components/api/ZernioConfig.tsx`: campo de status, botão "Testar Conexão", seleção da conta do Instagram e exibição da URL de webhook para colar no painel Zernio.
- Registrar a integração na sidebar (`Api.tsx` + `IntegrationSidebar.tsx`) como **Instagram DM** (id `zernio`), mantendo os 4 itens atuais (Evolution, Groq, Nuvemshop, Brevo) + este novo.
- Inbox: o canal continua `instagram`, então a Inbox já lista e exibe. Ajustar o `ChatView` para rotear o envio para `zernio-send` quando a conversa tiver `external_conversation_id` (origem Zernio), sem quebrar o fluxo Meta atual.

### 5. Validação
- Testar `zernio-config` com a key real (lista de contas).
- Simular um `message.received` no `zernio-webhook` e conferir criação de conversa/mensagem.
- Enviar uma mensagem de teste por `zernio-send`.

## Detalhes técnicos

- Canal mantido como `instagram` para reaproveitar `ChannelBadge`, filtros e UI.
- Distinção do provedor (Meta vs Zernio) pela presença de `external_conversation_id` na conversa.
- Mídia: anexos enviados como URL pública/assinada (`attachmentUrl` + `attachmentType`), conforme exige a Zernio.
- Segurança: webhook valida assinatura/secret do Zernio quando disponível; envio sempre sob o `user_id` autenticado; RLS em todas as novas tabelas.

## Pergunta em aberto
- A conta do Instagram já está conectada dentro do painel da Zernio? Se ainda não, depois de configurar a key eu mostro como conectar (é feito lá, via OAuth do Facebook Business — conta Business/Creator é obrigatória).
