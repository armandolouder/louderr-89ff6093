# Otimização do banco — 20/10/2026

## Consumo registrado

Janela: 07/10/2026 00:00 UTC a 20/10/2026 14:58 UTC (último dia parcial). São créditos **solicitados** pelo consumo registrado, não valores pagos. Os registros de operação retornados terminam em 15/10; existe atraso de contabilização.

| Recurso | Quantidade registrada | Créditos solicitados |
| --- | ---: | ---: |
| Banco pico | 224 horas de instância | 17,341900800 |
| Transferência | 2,794530214 GB + 0,000009242 GB em cache | 1,257540005 |
| Funções | 70.797 invocações | 0,707970000 |
| Arquivos | 1.193,308273738 GB-hora | 0,171645466 |
| Tempo real | 157 mensagens | 0,001962500 |
| **Operação** | | **19,481018771** |

Construção separada: 0,5 crédito solicitado. Não retornou item de armazenamento de banco; isso não prova ausência de custo ou de atividade.

## Alterações aplicadas e verificadas

1. Índices parciais separados nas colunas `messages.evolution_message_id` e `messages.whatsapp_message_id`. Os índices anteriores eram expressões em `metadata` e não atendiam à consulta do webhook nas colunas. A consulta de teste com um ID inexistente passou de varredura de 20.853 linhas, 2.238 blocos e 434,897 ms para BitmapOr dos novos índices, quatro blocos e 6,647 ms. É uma comparação pontual, não benchmark de carga nem economia de créditos.
2. `useMessages` agora seleciona os campos exibidos e apenas `reactions` e `transcription` dos metadados. Dados brutos continuam armazenados e disponíveis às funções de reações e deduplicação. Mesma conversa e 30 linhas: representação JSON original 22.488.692 bytes; representação projetada 15.670 bytes no banco. Resposta real otimizada: HTTP 200, 14.648 bytes, 30 mensagens e oito elementos de áudio. Diferenças de serialização explicam os tamanhos projetados distintos. Imagem e players confirmados na tela autenticada. Testes de preservação de metadados passam.
3. Senha do banco renovada a pedido do usuário; a nova tentativa de aplicação dos índices foi bem-sucedida. Conexões próprias do Lovable Cloud atualizadas automaticamente; conexões externas com a senha anterior precisam de atualização.

## Saúde e candidatos não alterados

- Banco ativo, sem reinícios ou alertas de esgotamento. Memória 45% inicialmente e 57% na verificação final; disco 41%; conexões 11/60 inicialmente e 34/60 ao final. Esses retratos não estabelecem capacidade sustentada nem justificam reduzir a instância.
- Banco: 2,92 GB. `messages`: aproximadamente 1,44 GB totais, mas apenas 18,3 MB de linhas principais e 6,3 MB de índices: os valores grandes externos às linhas são o candidato principal. Amostra das mil mensagens recentes: metadados médios de 216.101 bytes e máximo de 24.144.854 bytes. Não foram removidos dados brutos ou mídias.
- Histórico de tarefas agendadas ocupa aproximadamente 1,60 GB. Não foi aplicada limpeza: exige decisão sobre retenção e recuperação, não garante reduzir disco alocado e não se deve alterar estruturas gerenciadas.
- Inventário encontrou duas tarefas de `process-journeys` a cada dois minutos, com comandos diferentes. Ambas despacharam chamadas na amostra disponível desde 14:58 UTC; sucesso de despacho não confirma sucesso da função. Falta validar equivalência de autenticação/corpo e uma ferramenta suportada de gestão de agendamentos antes de consolidar. Nenhuma tarefa foi desligada e nenhum prazo foi alterado.
- Estatísticas SQL eram uma amostra curta: consulta de IDs em primeiro lugar, um chamado de 284,72 ms; momento de reset indisponível. Não representam todo o período financeiro.

## Limites de economia

Consultas menores e índices reduzem trabalho e bytes transferidos, mas não mudam o preço por hora da instância. O maior consumo continua sendo horas de banco. Redução real de créditos depende de menos horas ativas ou tamanho de instância, sem prejudicar automações; não foi feito redimensionamento ou pausa. A redução de transferência por página está verificada, mas a economia total de créditos depende da frequência de uso e de novos registros de contabilização. Comparar períodos com carga equivalente em **Configurações → Planos e uso de créditos → Detalhes do uso** depois de os registros atualizarem.