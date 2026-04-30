
## Diagnóstico final (confirmado pelos logs)

Testei o envio direto na API da Meta com o token da @louder.ink. O problema **não é** falta de App Review nem falta de role — os scopes estão todos lá (`instagram_manage_messages`, `pages_messaging` etc).

São dois problemas reais:

1. **Endpoint errado no código**: `send-instagram` usa `POST /{ig-business-id}/messages`, que é só para apps com Instagram API With Instagram Login. Sua integração é via Login do Facebook → tem que usar `POST /me/messages` com o token da Página.

2. **Handover bloqueado na Meta**: o webhook está tentando dar `take_thread_control` automaticamente e a Meta retorna:
   > `(#27) A empresa tem que conceder a permissão de controle de conversa para tomar o controle da thread`
   
   Isso é uma autorização única que **precisa ser feita manualmente no Meta Business Suite** (uma vez por página). Sem isso, nenhum endpoint vai conseguir enviar enquanto a Meta Inbox for o Primary Receiver.

## O que vou fazer no código

### 1. Corrigir `supabase/functions/send-instagram/index.ts`
- Trocar `POST /{ig-business-id}/messages` por `POST /me/messages?access_token={page_token}`
- Adicionar `messaging_type: "RESPONSE"` (obrigatório dentro da janela de 24h)
- Antes de enviar, tentar `POST /me/take_thread_control` com o `recipient.id`
  - Se vier erro `(#27)` ou `(#10)`, retornar mensagem clara pro usuário explicando o que configurar na Meta
  - Se vier sucesso ou `(#2018112)` (já tem o controle), seguir e enviar
- Tratar especificamente o subcode `2534037` ("não é dona do tópico") com mensagem amigável
- Manter persistência local da mensagem enviada igual está hoje

### 2. Melhorar feedback visual no Inbox
- Quando o erro `(#27)` voltar, mostrar um toast com link direto para as instruções de configuração da Meta Business Suite
- Não mudar UI estrutural — só o conteúdo do toast de erro

## Configuração que VOCÊ precisa fazer na Meta (uma vez só)

Depois que eu corrigir o código, o erro #27 ainda vai aparecer na primeira tentativa. Pra resolver:

**Caminho exato:**
1. Acesse **https://business.facebook.com/settings**
2. Selecione a conta Business da LOUDER.ink
3. Menu esquerdo: **Contas → Páginas → LOUDER.ink**
4. Clique em **"Configurações da página"** ou **"Permissões avançadas de mensagens"**
5. Procure a seção **"Aplicativos conectados"** ou **"Handover Protocol"**
6. Encontre seu app (o de ID que aparece no print)
7. Habilite o app como **"Receptor secundário"** com permissão de **"Controle de conversa"** (`messaging_handover`)

**Caminho alternativo** (se não achar o de cima):
1. **Meta Business Suite** → **Caixa de Entrada**
2. Ícone de engrenagem (Configurações) no canto da inbox
3. **"Aplicativos conectados"** ou **"Atribuição automática"**
4. Habilite seu app pra receber/controlar conversas

Sem essa autorização manual na Meta, **nenhum código** consegue tomar controle do thread enquanto a Meta Inbox for o Primary Receiver — é uma trava de segurança da Meta.

## Resultado esperado

Depois do código corrigido + autorização na Meta:
- ✅ Envio funciona dentro da janela de 24h
- ✅ Take control automático antes de cada envio (transparente)
- ✅ Mensagens claras quando algo falhar (24h expirada, controle negado, etc.)
