
# Abas Personalizadas para Organizar Conversas

## Visão Geral
Adicionar um sistema de abas customizáveis no lado direito da tela de Inbox que permite organizar conversas em categorias como "Suporte", "Trocas", "Vendas", etc. Você poderá criar, editar e excluir abas, e arrastar conversas para organizá-las.

## Como Vai Funcionar

1. **Painel lateral direito** - Ao lado do chat, aparecerá um painel com suas abas personalizadas
2. **Criar abas** - Botão "+" para adicionar novas categorias (ex: Suporte, Trocas, Financeiro)
3. **Mover conversas** - Arraste uma conversa do chat para uma aba, ou use um menu rápido
4. **Visualizar por aba** - Clique em uma aba para ver apenas as conversas daquela categoria
5. **Cores e ícones** - Cada aba pode ter uma cor e ícone para identificação visual

## Layout Proposto

```text
+------------------+------------------------+------------------+
|   Conversas      |        Chat            |   Abas Custom    |
|   (lista)        |   (mensagens)          |                  |
|                  |                        |  [+ Nova Aba]    |
|  * Maria         |   Oi, preciso de...    |                  |
|  * João          |   > Como posso ajudar? |  📦 Suporte (3)  |
|  * Ana           |                        |  🔄 Trocas (1)   |
|                  |                        |  💰 Vendas (5)   |
|                  |                        |  ⏳ Aguardando   |
+------------------+------------------------+------------------+
```

## O Que Será Implementado

1. **Nova tabela no banco de dados** - `custom_tabs` para salvar suas abas
2. **Relação conversa-aba** - Campo `tab_id` nas conversas para associar a uma aba
3. **Painel de abas** - Componente visual no lado direito do Inbox
4. **Gerenciador de abas** - Modal para criar/editar/excluir abas
5. **Arrastar e soltar** - Mover conversas entre abas facilmente

---

## Detalhes Técnicos

### 1. Migração do Banco de Dados

Criar tabela `custom_tabs`:
- `id` (uuid) - Identificador único
- `name` (text) - Nome da aba (ex: "Suporte")
- `color` (text) - Cor hex da aba (ex: "#22c55e")
- `icon` (text) - Nome do ícone Lucide (ex: "headphones")
- `order` (integer) - Ordem de exibição
- `created_at` / `updated_at` - Timestamps

Adicionar coluna na tabela `conversations`:
- `tab_id` (uuid, nullable) - Referência para qual aba a conversa pertence

RLS: Permitir acesso público (mesmo padrão das outras tabelas)

### 2. Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useCustomTabs.ts` | Hook para CRUD de abas + realtime |
| `src/components/inbox/CustomTabsSidebar.tsx` | Painel lateral direito com lista de abas |
| `src/components/inbox/TabManager.tsx` | Modal para criar/editar abas |
| `src/components/inbox/TabItem.tsx` | Componente individual de aba |

### 3. Modificações em Arquivos Existentes

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Inbox.tsx` | Adicionar sidebar direito + estado da aba selecionada |
| `src/hooks/useConversations.ts` | Incluir `tab_id` nos dados e adicionar filtro por aba |
| `src/components/inbox/ConversationItem.tsx` | Adicionar menu para mover para aba |

### 4. Funcionalidades do Hook `useCustomTabs`

```typescript
// Funções disponíveis
useCustomTabs() - Lista todas as abas
useCreateTab() - Criar nova aba
useUpdateTab() - Editar aba existente  
useDeleteTab() - Excluir aba
useMoveToTab() - Mover conversa para uma aba
```

### 5. Fluxo de Interação

1. Usuário clica em "+" no painel direito
2. Modal abre com campos: nome, cor, ícone
3. Ao salvar, aba aparece na lista
4. Para organizar: clica nos "..." da conversa e seleciona "Mover para > Suporte"
5. Conversa agora aparece contada naquela aba
6. Clicando na aba, filtra a lista de conversas

### 6. Componente CustomTabsSidebar

- Header com título "Abas" e botão "+"
- Lista de abas com: ícone, nome, contador de conversas
- Cada aba tem menu: Editar, Excluir
- Aba "Todas" sempre visível (não pode ser excluída)
- Drag-and-drop para reordenar abas
