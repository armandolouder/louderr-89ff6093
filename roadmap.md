# Roadmap

- [x] Corrigir exclusão otimista no histórico paginado do Inbox.
- [x] Aplicar recuperação automática e mensagem clara ao envio de reações no WhatsApp.
- [x] Validar alterações e publicar as funções afetadas.

## Otimização de banco e consumo
- [x] Medir créditos registrados e saúde do banco.
- [x] Inspecionar consultas, índices, armazenamento e tarefas agendadas.
- [x] Aplicar otimizações comprovadas sem excluir dados ou alterar prazos.
- [x] Comparar desempenho e documentar limites de economia.
- [x] Abrir troca de senha do banco solicitada pelo usuário e reenviar a alteração de índices.

## Acesso ao admin
- [x] Adicionar troca de senha da conta no admin.
- [x] Fazer o botão Sair encerrar a sessão e limpar os dados da conta em memória.
- [x] Validar confirmação, rejeição de senha atual incorreta e saída pela interface; testes automatizados passaram.
- [x] Solicitar e-mail de recuperação após alteração indevida durante o teste; redefinição final depende do usuário.

## Gerador de rastreio Printbee
- [x] Confirmar consulta de pedido e autenticação na documentação Printbee/Vavie.
- [x] Criar gerador no admin, histórico de links e página pública com dados de rastreio protegidos.
- [x] Testar validação do pedido, proteção de dados, aviso de credenciais recusadas e link inexistente.
- [ ] Validar consulta bem-sucedida de BEE00004696 e visualização do link — Printbee retornou 401; aguarda credenciais válidas.
