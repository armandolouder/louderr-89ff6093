# Integração WhatsApp via UAZAPI v2

## Visão Geral

Esta documentação descreve a integração do sistema de mensagens WhatsApp utilizando a API UAZAPI v2. A integração permite receber e enviar mensagens, mídias e reações através de Edge Functions.

## Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   WhatsApp      │────▶│   UAZAPI v2      │────▶│  Edge Function  │
│   (Usuário)     │◀────│   (Gateway)      │◀────│  (Webhook)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────┐
                                                 │   Supabase      │
                                                 │   Database      │
                                                 │   + Storage     │
                                                 └─────────────────┘
```

## Edge Functions

### 1. `whatsapp-webhook`

**Responsabilidade:** Receber mensagens do WhatsApp via webhook da UAZAPI.

**Endpoint:** `POST /functions/v1/whatsapp-webhook`

**Funcionalidades:**
- Processa mensagens de texto
- Baixa e armazena mídias (imagem, áudio, vídeo, documentos)
- Cria/atualiza conversas e contatos
- Deduplicação de mensagens via `whatsapp_message_id`

**Fluxo de Mídia:**
1. Webhook recebe notificação com ID da mensagem
2. Faz POST para `/message/download` com `{ id: messageId }`
3. Extrai URL do campo `fileURL` da resposta
4. Baixa o arquivo e armazena no bucket `whatsapp-media`
5. Salva URL pública no campo `media_url` da mensagem

---

### 2. `send-whatsapp`

**Responsabilidade:** Enviar mensagens para o WhatsApp.

**Endpoint:** `POST /functions/v1/send-whatsapp`

**Payload:**
```json
{
  "conversationId": "uuid",
  "content": "Texto da mensagem",
  "messageType": "text"
}
```

**Endpoint UAZAPI:** `POST /send/text`

**Body UAZAPI:**
```json
{
  "number": "5521999999999",
  "text": "Texto da mensagem"
}
```

---

### 3. `delete-message`

**Responsabilidade:** Deletar mensagens do chat (local e WhatsApp).

**Endpoint:** `POST /functions/v1/delete-message`

**Payload:**
```json
{
  "messageId": "uuid",
  "conversationId": "uuid",
  "deleteForEveryone": true
}
```

**Endpoint UAZAPI:** `POST /message/delete`

**Body UAZAPI:**
```json
{
  "Id": "WHATSAPP_MESSAGE_ID",
  "chatid": "5521999999999@s.whatsapp.net",
  "everyone": true
}
```

**Comportamento:**
- Deleta a mensagem no WhatsApp (para todos se `deleteForEveryone: true`)
- Remove a mensagem do banco de dados local
- Atualiza o `last_message` da conversa

---

### 4. `send-reaction`

**Responsabilidade:** Enviar reações (emojis) para mensagens.

**Endpoint:** `POST /functions/v1/send-reaction`

**Payload:**
```json
{
  "messageId": "uuid",
  "emoji": "👍",
  "conversationId": "uuid"
}
```

**Endpoint UAZAPI:** `POST /message/react`

**Body UAZAPI:**
```json
{
  "number": "5521999999999@s.whatsapp.net",
  "text": "👍",
  "id": "WHATSAPP_MESSAGE_ID"
}
```

---

## Convenções da API UAZAPI v2

### ⚠️ IMPORTANTE: Case Sensitivity

| Endpoint | Chave | Case | Exemplo |
|----------|-------|------|---------|
| `/send/text` | `number` | lowercase | `"number": "5521..."` |
| `/message/react` | `Id` | **PascalCase** | `"Id": "ABC123"` |
| `/message/delete` | `Id` | **PascalCase** | `"Id": "ABC123"` |
| `/message/download` | `id` | lowercase | `"id": "ABC123"` |

### Resposta do Download de Mídia

```json
{
  "fileURL": "https://server.uazapi.com/files/abc123.jpg",
  "mimetype": "image/jpeg"
}
```

**Nota:** O campo é `fileURL` (não `url` ou `link`).

---

## Secrets Necessários

| Secret | Descrição |
|--------|-----------|
| `UAZAPI_SERVER_URL` | URL base do servidor UAZAPI (ex: `https://instance.uazapi.com`) |
| `UAZAPI_INSTANCE_TOKEN` | Token de autenticação da instância |

---

## Estrutura do Banco de Dados

### Tabela `contacts`
```sql
- id: UUID (PK)
- name: TEXT
- phone: TEXT
- avatar_url: TEXT
- instagram_id: TEXT
- email: TEXT
- notes: TEXT
- tags: JSONB
```

### Tabela `conversations`
```sql
- id: UUID (PK)
- contact_id: UUID (FK → contacts)
- channel: TEXT ('whatsapp' | 'instagram')
- status: TEXT ('open' | 'closed')
- last_message: TEXT
- last_message_at: TIMESTAMPTZ
- unread_count: INTEGER
- assignee_id: UUID
- assignee_name: TEXT
```

### Tabela `messages`
```sql
- id: UUID (PK)
- conversation_id: UUID (FK → conversations)
- content: TEXT
- sender_type: TEXT ('contact' | 'agent')
- message_type: TEXT ('text' | 'image' | 'audio' | 'video' | 'document')
- media_url: TEXT
- metadata: JSONB
- status: TEXT ('sent' | 'delivered' | 'read')
- created_at: TIMESTAMPTZ
```

### Metadata da Mensagem
```json
{
  "whatsapp_message_id": "ABC123DEF456",
  "chatid": "5521999999999@s.whatsapp.net",
  "reactions": [
    { "emoji": "👍", "sent_at": "2024-01-15T10:30:00Z" }
  ]
}
```

---

## Storage

### Bucket: `whatsapp-media`

**Estrutura de pastas:**
```
whatsapp-media/
├── images/
│   └── {timestamp}_{messageId}.jpg
├── audio/
│   └── {timestamp}_{messageId}.ogg
├── video/
│   └── {timestamp}_{messageId}.mp4
└── documents/
    └── {timestamp}_{messageId}.pdf
```

**Configuração:**
- Público: Sim
- RLS: Desabilitado (bucket público)

---

## Troubleshooting

### Erro 400: "Missing Id in Payload"
**Causa:** Chave `Id` não está em PascalCase no `/message/react`
**Solução:** Usar `Id` (não `id` ou `msgId`)

### Mídia aparece como `.enc`
**Causa:** URL de download não extraída corretamente
**Solução:** Verificar se está usando `data.fileURL` (não `data.url`)

### Mensagens duplicadas
**Causa:** Webhook sendo chamado múltiplas vezes
**Solução:** Verificar `whatsapp_message_id` no metadata antes de inserir

### Imagens não carregam no chat
**Causa:** CORS ou URL expirada
**Solução:** Mídias são armazenadas no Supabase Storage para evitar expiração

---

## Logs e Debug

Verificar logs das Edge Functions:
1. Acesse o backend do projeto
2. Navegue até Edge Functions → Logs
3. Filtre pela função desejada

Logs importantes:
- `Processing {type} from {name} ({phone})`
- `Media stored at: {url}`
- `UAZAPI response: {status}`

---

## Referências

- [UAZAPI v2 Documentation](https://docs.uazapi.com)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
