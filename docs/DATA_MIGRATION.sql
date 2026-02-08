-- ===========================================
-- MIGRAÇÃO DE DADOS - Louder CRM
-- Execute este arquivo no SQL Editor do seu Supabase externo
-- IMPORTANTE: Execute o SCHEMA primeiro (ver MIGRATION_GUIDE.md)
-- ===========================================

-- ===========================================
-- 1. CUSTOM_TABS (5 registros)
-- ===========================================
INSERT INTO custom_tabs (id, name, color, icon, "order", created_at, updated_at) VALUES
('fce9fa26-4372-4458-9bca-6b4cd7cf48a1', 'Troca', '#f59e0b', 'Users', 0, '2026-02-08 05:13:52.12083+00', '2026-02-08 05:14:45.080004+00'),
('34d65de7-e86d-4813-a474-e5745dc413f7', 'Conexao Rio', '#22c55e', 'Headphones', 1, '2026-02-08 05:16:24.546251+00', '2026-02-08 18:33:21.819985+00'),
('498517af-8f71-4bbb-8b37-0162f16dc82d', 'Personalizar', '#f97316', 'Star', 2, '2026-02-08 05:25:57.470637+00', '2026-02-08 05:25:57.470637+00'),
('6f258dd2-60ed-4cf5-917c-4f1b4f617f6e', 'Lead Quente', '#14b8a6', 'Star', 3, '2026-02-08 15:22:31.04367+00', '2026-02-08 15:22:31.04367+00'),
('4ab846c0-40f2-472e-9c74-8368814ee436', 'Fornecedores', '#6366f1', 'Settings', 4, '2026-02-08 15:36:43.723657+00', '2026-02-08 15:36:43.723657+00');

-- ===========================================
-- 2. CUSTOMER_CLUSTERS (7 registros)
-- ===========================================
INSERT INTO customer_clusters (id, name, description, emoji, color, objective, recommendation, criteria, customer_count, percentage, created_at, updated_at) VALUES
('f159ed0f-0b39-4e8e-92b0-1b6c34e09b22', 'Teste de Campanhas', 'Cluster para testar o envio de campanhas antes de disparar para clientes reais', '🧪', '#f59e0b', 'Validar fluxo de envio de mensagens', 'Use este cluster para testar variações de mensagens e configurações de delay', '{}', 1, 0.00, '2026-02-08 21:38:29.717029+00', '2026-02-08 21:44:50.888815+00'),
('f370eded-e5c0-4848-9f42-946746882c30', 'VIP Ativo', 'Clientes de alto valor com compras recentes e frequentes', '⭐', '#FFD700', 'Retenção e aumento de ticket', 'Preview exclusivo, programa VIP, atendimento prioritário', '{"rfm_scores": ["555", "554", "545", "544"], "ticket_level": ["high"]}', 868, 15.15, '2026-02-08 21:06:54.355585+00', '2026-02-08 21:07:14.124398+00'),
('fd0fede4-0166-4dac-83b8-1f964aec5889', 'Ocasional', 'Compram esporadicamente em promoções', '🎯', '#F59E0B', 'Aumentar frequência', 'Ofertas recorrentes, lembretes personalizados', '{"rfm_scores": ["312", "313", "322", "323"], "ticket_level": ["low", "medium"]}', 2399, 41.87, '2026-02-08 21:06:54.355585+00', '2026-02-08 21:07:14.125246+00'),
('b8e36bf9-789e-471c-ae02-d6a72126aed7', 'Infrequente', 'Baixa frequência e recência, risco de churn', '❌', '#EF4444', 'Reativação ou descarte', 'Última tentativa com oferta agressiva', '{"rfm_scores": ["111", "112", "121", "122", "211"], "ticket_level": ["low"]}', 1058, 18.47, '2026-02-08 21:06:54.355585+00', '2026-02-08 21:07:14.128369+00'),
('66d5b8b5-04ea-41b0-bb58-1ddc15a0a2c6', 'Crescente', 'Clientes com frequência crescente de compras', '📈', '#14B8A6', 'Acelerar crescimento', 'Cross-sell, upsell, benefícios progressivos', '{"rfm_scores": ["333", "334", "343", "423", "424"], "ticket_level": ["medium"]}', 398, 6.95, '2026-02-08 21:06:54.355585+00', '2026-02-08 21:07:14.13219+00'),
('08370fc0-d707-4604-800a-5a8389b42c4c', 'Cliente Fiel', 'Compram regularmente com ticket médio', '💚', '#22C55E', 'Manter engajamento', 'Programa de pontos, benefícios exclusivos', '{"rfm_scores": ["444", "443", "434", "433", "344"], "ticket_level": ["medium"]}', 350, 6.11, '2026-02-08 21:06:54.355585+00', '2026-02-08 21:07:14.128091+00'),
('9b69ef36-37bf-4dd2-9b15-58899f47a3e3', 'VIP em Risco', 'Clientes VIP que não compram há algum tempo', '🚨', '#FF4444', 'Reativação urgente', 'Oferta especial 25-30% OFF, contato personalizado', '{"rfm_scores": ["255", "245", "155"], "ticket_level": ["high"]}', 656, 11.45, '2026-02-08 21:06:54.355585+00', '2026-02-08 21:07:14.12285+00');

-- ===========================================
-- 3. IMPORT_BATCHES (1 registro)
-- ===========================================
INSERT INTO import_batches (id, filename, status, total_rows, valid_rows, invalid_rows, valid_phones, invalid_phones, absent_phones, valid_emails, invalid_emails, absent_emails, column_mapping, created_at, completed_at) VALUES
('35ebe43e-2a01-4591-92c5-835d8e292bbd', 'Vendas-22e7d421-b3af-4821-af71-055035a344cd.csv', 'completed', 5729, 5729, 0, 3201, 8, 2520, 5729, 0, 0, '{"city": "Cidade", "email": "E-mail", "favorite_product": "Nome do Produto", "first_purchase_at": "Data de pagamento", "name": "Nome do comprador", "order_count": "Quantidade Comprada", "phone": "Telefone", "source": "Canal", "state": "Estado", "total_spent": "Subtotal"}', '2026-02-08 20:48:10.395682+00', '2026-02-08 20:48:28.248+00');

-- ===========================================
-- 4. QUICK_RESPONSES (1 registro)
-- ===========================================
INSERT INTO quick_responses (id, title, content, shortcut, category, media_url, media_type, is_active, use_count, created_at, updated_at) VALUES
('27d91373-0aa6-4106-83d1-09d1f91a474d', 'Personalizar', 'Quer deixar sua camiseta do seu jeito? 😍
Acesse o link abaixo, escolha o modelo e personalize como quiser!

Ahhh… e antes de finalizar, confira certinho o tamanho medindo uma camiseta que você já tenha (largura x comprimento).

https://louder.ink/produtos/personalizar-minha-camiseta/', 'personalizar', NULL, 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGxpdHVxOTlxeTBiOWh5ZjFiMW5nOW5rYWNwZnVnbXhnenhwb2k3ciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/6VCbG7q4zzmRW/giphy.gif', 'gif', true, 5, '2026-02-08 18:31:10.521545+00', '2026-02-08 18:40:14.251106+00');

-- ===========================================
-- 5. CONTACTS (12 registros)
-- ===========================================
INSERT INTO contacts (id, name, phone, email, avatar_url, notes, tags, instagram_id, created_at, updated_at) VALUES
('730f1e64-f1da-449b-ad24-db7627a1dc17', 'Armando Louder', '5521964947968', NULL, 'https://pps.whatsapp.net/v/t61.24694-24/605004881_1608108690641058_1770322678255368410_n.jpg?stp=dst-jpg_s96x96_tt6&ccb=11-4&oh=01_Q5Aa3wENmzE6z20o_ihxCjmb4BH14J3XQTsnyeJl_LgLLuZUeg&oe=6994BBB4&_nc_sid=5e03e0&_nc_cat=110', NULL, '[]', NULL, '2026-02-07 21:39:10.932406+00', '2026-02-07 21:39:10.932406+00'),
('36eb5553-c797-4fed-b949-f725c4503e8f', 'Pedroza', '5521983452352', NULL, 'https://pps.whatsapp.net/v/t61.24694-24/534422285_2720316228315877_277469433234274463_n.jpg?stp=dst-jpg_s96x96_tt6&ccb=11-4&oh=01_Q5Aa3gEqWmStwy6NV3BFIDmEq4_AOKgUu1KP9d7iEtSIE_gmzQ&oe=6988B2BB&_nc_sid=5e03e0&_nc_cat=103', NULL, '[]', NULL, '2026-02-07 21:39:21.407965+00', '2026-02-07 21:39:21.407965+00'),
('3b167f01-4021-4061-b829-8b26d7d187ec', 'Allex', '5524981145239', NULL, 'https://pps.whatsapp.net/v/t61.24694-24/534423571_1546122046940544_2310371351371895009_n.jpg?stp=dst-jpg_s96x96_tt6&ccb=11-4&oh=01_Q5Aa3wGCVbS8bVXKn8W7_7BPS0kcMX4jNmg5o1wd9JckCYJ5RQ&oe=699255EF&_nc_sid=5e03e0&_nc_cat=108', NULL, '[]', NULL, '2026-02-07 21:45:12.138639+00', '2026-02-07 21:45:12.138639+00'),
('dcc207f6-4c2b-469f-ac14-898f8b62090a', 'Caique', '5527981353411', NULL, 'https://pps.whatsapp.net/v/t61.24694-24/534420402_919415067091971_6076061689354838556_n.jpg?stp=dst-jpg_s96x96_tt6&ccb=11-4&oh=01_Q5Aa3wF9v1DctY47h0inDO9XslCGqE8ulPfWFtxgxfgiepX9dQ&oe=6993D14E&_nc_sid=5e03e0&_nc_cat=102', NULL, '[]', NULL, '2026-02-07 21:54:38.48744+00', '2026-02-07 21:54:38.48744+00'),
('f464b755-d060-4d06-8472-9d284ae57763', 'Renato Couto', '556799782689', NULL, 'https://pps.whatsapp.net/v/t61.24694-24/362242904_1507896753370621_3752923254091849533_n.jpg?stp=dst-jpg_s96x96_tt6&ccb=11-4&oh=01_Q5Aa3wGbG12G_ayqewgrwmINIry7pr_ef3N1aQMltIakqoJp0g&oe=6994530A&_nc_sid=5e03e0&_nc_cat=111', NULL, '[]', NULL, '2026-02-07 22:47:15.359437+00', '2026-02-07 22:47:15.359437+00'),
('051be975-6844-47d2-9b2f-192a87116f53', 'Rafael Gomes', '5511957468586', NULL, NULL, NULL, '[]', NULL, '2026-02-08 01:10:32.703419+00', '2026-02-08 01:10:32.703419+00'),
('bcf0d237-c9eb-43f6-8af1-057cfe710808', 'LOUDER.ink', '5521981391739', NULL, 'https://pps.whatsapp.net/v/t61.24694-24/516610720_1815531715712559_5078747279950171677_n.jpg?stp=dst-jpg_s96x96_tt6&ccb=11-4&oh=01_Q5Aa3gE4n4Nx-d2v71q4lBItf9Pb9jqYb8ZLD8sVRNmwMblXDQ&oe=698CA98F&_nc_sid=5e03e0&_nc_cat=107', NULL, '[]', NULL, '2026-02-08 04:18:34.244826+00', '2026-02-08 04:18:34.244826+00'),
('679afc03-ee6d-4508-bcfc-0e95386c32a0', 'LOUDER.ink', '559187459963', NULL, NULL, NULL, '[]', NULL, '2026-02-08 04:45:57.272365+00', '2026-02-08 04:45:57.272365+00'),
('1279782a-e7d8-4680-8daa-72143ccb20dd', 'Pri🪻', '5516997677736', NULL, NULL, NULL, '[]', NULL, '2026-02-08 14:06:37.575398+00', '2026-02-08 14:06:37.575398+00'),
('2d5ac491-9aaf-49c1-a8eb-ff824fe30b2e', 'Bruno Simões', '554899097652', NULL, NULL, NULL, '[]', NULL, '2026-02-08 15:18:25.894511+00', '2026-02-08 15:18:25.894511+00'),
('879a301f-dfee-4b00-890f-61cae2545641', '554195739665', '554195739665', NULL, NULL, NULL, '[]', NULL, '2026-02-08 16:13:38.530102+00', '2026-02-08 16:13:38.530102+00'),
('ad172739-d094-42f4-a6c0-5b5ea35a6c07', 'Thzx Digital', '557583487065', NULL, NULL, NULL, '[]', NULL, '2026-02-08 22:00:01.565036+00', '2026-02-08 22:00:01.565036+00');

-- ===========================================
-- 6. CONVERSATIONS (12 registros)
-- ===========================================
INSERT INTO conversations (id, contact_id, channel, status, tab_id, last_message, last_message_at, unread_count, assignee_id, assignee_name, created_at, updated_at) VALUES
('960144f0-c8bc-4cb0-94a3-631a3a173b61', 'ad172739-d094-42f4-a6c0-5b5ea35a6c07', 'whatsapp', 'novo', NULL, 'tmj', '2026-02-08 23:19:23.142+00', 29, NULL, NULL, '2026-02-08 22:00:02.066022+00', '2026-02-08 23:19:23.238398+00'),
('35e2a97b-738e-4fc4-ae49-1bfaf114337f', '879a301f-dfee-4b00-890f-61cae2545641', 'whatsapp', 'novo', NULL, 'ATENÇÃO! Informamos que *🎟️ Você ganhou o Golden Ticket*Isso te dá acesso free ao HubFloor, o melhor Hub de operadores do mundo._Aqui você deixa os cursos de lado e acompanha trading na vida real, com traders profissionais operando ao vivo 24h por dia._

*📅 Dia 12 de fevereiro acontece a primeira live oficial.*👉 Resgate agora o seu Golden Ticket, clicando no *"Clique Aqui"**Operar. Ganhar. Repetir.*', '2026-02-08 16:13:39.562486+00', 1, NULL, NULL, '2026-02-08 16:13:39.124043+00', '2026-02-08 16:32:49.68023+00'),
('1d28146d-16a8-4784-b7af-1369b4b69cdf', '730f1e64-f1da-449b-ad24-db7627a1dc17', 'whatsapp', 'novo', NULL, '📷 Imagem', '2026-02-08 20:03:26.313+00', 13, NULL, NULL, '2026-02-07 21:39:11.353324+00', '2026-02-08 20:03:26.432867+00'),
('b9f22a57-a31b-47ae-a98e-67dde78b6e6e', '36eb5553-c797-4fed-b949-f725c4503e8f', 'whatsapp', 'novo', '34d65de7-e86d-4813-a474-e5745dc413f7', 'Blz', '2026-02-08 23:33:10.186+00', 90, NULL, NULL, '2026-02-07 21:39:21.818135+00', '2026-02-08 23:33:10.333501+00'),
('49a077a7-b3a7-4187-ac42-2afb5874930a', 'dcc207f6-4c2b-469f-ac14-898f8b62090a', 'whatsapp', 'novo', '4ab846c0-40f2-472e-9c74-8368814ee436', 'Bacana, é para eu poder dar garantia aos novos clientes...', '2026-02-08 20:16:02.981+00', 32, NULL, NULL, '2026-02-07 21:54:38.931641+00', '2026-02-08 20:16:03.095096+00'),
('ecd377a7-3a9c-436c-9dee-84f58f05421e', '3b167f01-4021-4061-b829-8b26d7d187ec', 'whatsapp', 'novo', NULL, '😂', '2026-02-08 12:33:12.09937+00', 4, NULL, NULL, '2026-02-07 21:45:12.557841+00', '2026-02-08 18:57:07.839147+00'),
('453c6871-20b4-45b0-a450-bc065cda619a', '051be975-6844-47d2-9b2f-192a87116f53', 'whatsapp', 'novo', NULL, 'Demais', '2026-02-08 02:08:45.804+00', 14, NULL, NULL, '2026-02-08 01:10:33.2114+00', '2026-02-08 02:08:45.892373+00'),
('f541774f-5e0f-4e4a-9c29-9f77f59ed187', '2d5ac491-9aaf-49c1-a8eb-ff824fe30b2e', 'whatsapp', 'novo', '498517af-8f71-4bbb-8b37-0162f16dc82d', 'Maravilha', '2026-02-08 17:03:34.646+00', 18, NULL, NULL, '2026-02-08 15:18:26.371187+00', '2026-02-08 17:03:34.747929+00'),
('8edf6c84-7225-49e5-bb84-10a4b9764c54', 'bcf0d237-c9eb-43f6-8af1-057cfe710808', 'whatsapp', 'novo', NULL, 'marcelo.shida@gmail.com', '2026-02-08 04:18:34.657+00', 0, NULL, NULL, '2026-02-08 04:18:34.81381+00', '2026-02-08 04:18:34.81381+00'),
('872764ac-c11b-493e-b218-3f631fc061db', '1279782a-e7d8-4680-8daa-72143ccb20dd', 'whatsapp', 'novo', '498517af-8f71-4bbb-8b37-0162f16dc82d', 'sem problemas, farei o possível para recriar a arte na camiseta que me passou de modelo', '2026-02-08 18:35:58.151807+00', 10, NULL, NULL, '2026-02-08 14:06:38.117937+00', '2026-02-08 19:04:13.911129+00'),
('f8546098-4ee1-4037-a7be-7dd196e842df', 'f464b755-d060-4d06-8472-9d284ae57763', 'whatsapp', 'novo', '498517af-8f71-4bbb-8b37-0162f16dc82d', 'Belezaaa meu brother!!👏🏻', '2026-02-07 22:48:46.305+00', 2, NULL, NULL, '2026-02-07 22:47:15.765295+00', '2026-02-08 05:26:06.889697+00'),
('bb24e078-8ecf-4d8d-8510-c4d6cb5b64ab', '679afc03-ee6d-4508-bcfc-0e95386c32a0', 'whatsapp', 'novo', NULL, 'consigo ativar um teste drive de 10 minutos para você, que tal ?', '2026-02-08 22:46:42.319+00', 10, NULL, NULL, '2026-02-08 04:45:57.750123+00', '2026-02-08 22:46:42.415254+00');

-- ===========================================
-- 7. CAMPAIGNS (1 registro)
-- ===========================================
INSERT INTO campaigns (id, name, description, channel, status, cluster_ids, delay_min_seconds, delay_max_seconds, daily_limit, total_recipients, sent_count, failed_count, scheduled_at, started_at, completed_at, metadata, created_at, updated_at) VALUES
('5b0c400b-a495-4da4-aadc-cd85e6184b93', 'Teste', 'teste', 'whatsapp', 'completed', ARRAY['f159ed0f-0b39-4e8e-92b0-1b6c34e09b22']::uuid[], 180, 480, 50, 1, 1, 0, NULL, '2026-02-08 21:46:28.59+00', '2026-02-08 21:58:39.895+00', '{}', '2026-02-08 21:46:30.012827+00', '2026-02-08 21:58:39.951833+00');

-- ===========================================
-- 8. CAMPAIGN_MESSAGES (1 registro)
-- ===========================================
INSERT INTO campaign_messages (id, campaign_id, content, message_type, media_url, is_active, use_count, created_at) VALUES
('e4fa8a99-644a-49dd-8574-fa6cb9dc7d02', '5b0c400b-a495-4da4-aadc-cd85e6184b93', 'Oi, {{nome}}! Tudo bem? Estamos realizando um teste interno para garantir que nossas promoções cheguem perfeitas até você. Se recebeu essa mensagem, pode me dar um ''ok'' só pra confirmar? Valeu! 👍', 'image', 'https://uploads-ssl.webflow.com/619e51deac06f42a8139b479/6255ad65a1a75d4296affe3f_thumb-glassmorphism-blogpost.jpg', true, 0, '2026-02-08 21:46:30.317814+00');

-- ===========================================
-- 9. WHATSAPP_QUEUE (1 registro)
-- ===========================================
INSERT INTO whatsapp_queue (id, campaign_id, customer_id, phone, content, status, metadata, attempts, scheduled_at, sent_at, error_message, message_id, created_at) VALUES
('7c263ba6-475f-4eea-9c70-b5c2864b0f03', '5b0c400b-a495-4da4-aadc-cd85e6184b93', '8b4ef80f-d8f3-4a33-8d35-7cceb7b34af8', '5521964947968', 'Oi, Armando! Tudo bem? Estamos realizando um teste interno para garantir que nossas promoções cheguem perfeitas até você. Se recebeu essa mensagem, pode me dar um ''ok'' só pra confirmar? Valeu! 👍', 'sent', '{"media_type": "image", "media_url": "https://uploads-ssl.webflow.com/619e51deac06f42a8139b479/6255ad65a1a75d4296affe3f_thumb-glassmorphism-blogpost.jpg"}', 0, NULL, '2026-02-08 21:58:35.859+00', NULL, NULL, '2026-02-08 21:46:30.979712+00');

-- ===========================================
-- 10. SEND_LOGS (1 registro)
-- ===========================================
INSERT INTO send_logs (id, campaign_id, customer_id, queue_id, channel, phone, email, content, status, cluster_name, error_message, response_data, sent_at) VALUES
('a780bf89-7011-43e6-ad71-a4c8a33668cc', '5b0c400b-a495-4da4-aadc-cd85e6184b93', '8b4ef80f-d8f3-4a33-8d35-7cceb7b34af8', '7c263ba6-475f-4eea-9c70-b5c2864b0f03', 'whatsapp', '5521964947968', NULL, 'Oi, Armando! Tudo bem? Estamos realizando um teste interno para garantir que nossas promoções cheguem perfeitas até você. Se recebeu essa mensagem, pode me dar um ''ok'' só pra confirmar? Valeu! 👍', 'sent', 'Teste de Campanhas', NULL, '{}', '2026-02-08 21:58:35.859+00');

-- ===========================================
-- TABELAS GRANDES - Exportar via Cloud UI
-- ===========================================

-- MESSAGES (341 registros)
-- Exporte via: Cloud → Database → Tables → messages → Export
-- Importe via: SQL Editor → Import CSV ou use o comando COPY

-- IMPORTED_CUSTOMERS (5.730 registros)
-- Exporte via: Cloud → Database → Tables → imported_customers → Export
-- Importe via: SQL Editor → Import CSV ou use o comando COPY

-- ===========================================
-- NOTAS IMPORTANTES
-- ===========================================

-- 1. O cliente '8b4ef80f-d8f3-4a33-8d35-7cceb7b34af8' referenciado na 
--    whatsapp_queue e send_logs precisa existir em imported_customers
--    ANTES de rodar esses INSERTs. Caso contrário, comente essas linhas
--    e execute depois de importar imported_customers.

-- 2. A tabela profiles está vazia no sistema atual.

-- 3. Lembre-se de configurar as SECRETS no seu Supabase externo:
--    - UAZAPI_SERVER_URL
--    - UAZAPI_INSTANCE_TOKEN
--    - GROQ_API_KEY

-- 4. Não se esqueça de criar o bucket de storage:
--    INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp-media', 'whatsapp-media', true);
