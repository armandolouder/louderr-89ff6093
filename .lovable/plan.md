## Objetivo

Tornar o status do WhatsApp confiável e reduzir falhas de envio quando a Evolution API exibe a instância como conectada, mas o canal interno está fechado.

## Diagnóstico confirmado

- O servidor está online e informa **Evolution API 2.3.7**.
- O endpoint e o formato usados para texto continuam corretos: `POST /message/sendText/{instância}` com `number` e `text`.
- A própria Evolution tem relatos de `connectionState = open` enquanto o envio retorna `Connection Closed`; portanto, o selo “Conectado” não comprova que o canal de mensagens está realmente operacional.
- A verificação atual também consulta rotas antigas/não documentadas e pode aceitar uma resposta parcial como sucesso.

## Alterações

1. **Corrigir a verificação de conexão**
   - Usar somente as rotas oficiais da versão 2.3.7.
   - Separar “servidor online”, “instância registrada” e “WhatsApp pronto para enviar”.
   - Nunca considerar uma resposta parcial como conexão ativa.

2. **Adicionar teste real e seguro do canal**
   - Validar o canal com a consulta oficial de número antes do envio, sem disparar mensagem de teste.
   - Exibir “Conexão instável” quando o painel da Evolution disser `open`, mas o canal real não responder.

3. **Recuperar falhas transitórias**
   - Ao receber `Connection Closed`, atualizar imediatamente o status da tela.
   - Fazer uma única tentativa de reinício pela rota oficial e repetir o envio somente quando a instância voltar a `open`.
   - Se continuar fechado, não duplicar mensagens; orientar a reconexão por QR Code.

4. **Corrigir validações internas**
   - Exigir URL, chave e nome da instância simultaneamente.
   - Remover os fallbacks de status obsoletos.
   - Preservar os detalhes reais retornados pela Evolution nos registros para diagnóstico.

5. **Validar**
   - Testar status, consulta de número e envio de texto na instância atual.
   - Confirmar que uma falha não gera envio duplicado.
   - Confirmar que o painel deixa de mostrar “Online” quando apenas o estado salvo estiver aberto.

## Referências verificadas

- Documentação oficial 2.3.7: envio de texto e consulta de números.
- Relatos oficiais da Evolution sobre `Connection Closed` com instância ainda marcada como conectada.
