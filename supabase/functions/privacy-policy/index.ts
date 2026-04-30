const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Política de Privacidade — LOUDER.ink</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #0a0a0a;
    color: #e5e5e5;
    line-height: 1.7;
    padding: 60px 24px;
  }
  .container { max-width: 760px; margin: 0 auto; }
  h1 { color: #fff; font-size: 32px; margin-bottom: 8px; font-weight: 700; }
  .updated { color: #888; font-size: 14px; margin-bottom: 40px; }
  h2 { color: #fff; font-size: 20px; margin: 32px 0 12px; font-weight: 600; }
  p, li { color: #c5c5c5; font-size: 15px; margin-bottom: 12px; }
  ul { padding-left: 22px; margin-bottom: 12px; }
  a { color: #4a9eff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #222; color: #666; font-size: 13px; }
</style>
</head>
<body>
  <div class="container">
    <h1>Política de Privacidade</h1>
    <p class="updated">Última atualização: 30 de abril de 2026</p>

    <p>Esta Política de Privacidade descreve como a <strong>LOUDER.ink</strong> ("nós", "nosso") coleta, usa e protege as informações obtidas através da nossa plataforma de gestão de relacionamento com clientes e da integração com Meta (Facebook e Instagram).</p>

    <h2>1. Informações que coletamos</h2>
    <ul>
      <li>Dados de conta da Meta autorizados via OAuth (ID da Página, ID do Instagram Business, tokens de acesso).</li>
      <li>Mensagens e comentários recebidos via Instagram Direct e Facebook Messenger para fins de atendimento.</li>
      <li>Dados de clientes (nome, e-mail, telefone) fornecidos voluntariamente em pedidos e formulários.</li>
    </ul>

    <h2>2. Como usamos as informações</h2>
    <ul>
      <li>Responder mensagens e gerenciar atendimento ao cliente.</li>
      <li>Enviar comunicações de marketing e recuperação de carrinho (com consentimento).</li>
      <li>Gerar relatórios analíticos para o lojista.</li>
    </ul>

    <h2>3. Compartilhamento de dados</h2>
    <p>Não vendemos nem compartilhamos dados pessoais com terceiros, exceto provedores essenciais para operação da plataforma (Supabase, Brevo, Meta) sob acordos de confidencialidade.</p>

    <h2>4. Armazenamento e segurança</h2>
    <p>Os dados são armazenados em servidores seguros com criptografia em trânsito e em repouso. Aplicamos políticas de acesso restritas (Row-Level Security).</p>

    <h2>5. Direitos do titular dos dados</h2>
    <p>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento através do e-mail abaixo. Também pode revogar a autorização da Meta diretamente nas configurações da sua conta do Facebook.</p>

    <h2>6. Exclusão de dados</h2>
    <p>Para solicitar a remoção completa dos seus dados, envie um e-mail para <a href="mailto:contato@louder.ink">contato@louder.ink</a> com o assunto "Exclusão de dados". Processamos solicitações em até 30 dias.</p>

    <h2>7. Cookies</h2>
    <p>Usamos cookies essenciais para autenticação e funcionamento da plataforma. Não utilizamos cookies de rastreamento publicitário de terceiros.</p>

    <h2>8. Alterações nesta política</h2>
    <p>Podemos atualizar esta política periodicamente. Alterações significativas serão comunicadas via e-mail ou aviso na plataforma.</p>

    <h2>9. Contato</h2>
    <p>Para dúvidas sobre privacidade ou tratamento de dados, entre em contato:<br/>
    E-mail: <a href="mailto:contato@louder.ink">contato@louder.ink</a></p>

    <div class="footer">
      © 2026 LOUDER.ink — Todos os direitos reservados.
    </div>
  </div>
</body>
</html>`;

Deno.serve(() => {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});