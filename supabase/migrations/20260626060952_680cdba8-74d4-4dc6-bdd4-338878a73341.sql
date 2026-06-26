-- Bucket whatsapp-media é público (arquivos seguem acessíveis por URL direta via CDN),
-- mas a policy ampla de SELECT permitia LISTAR todos os arquivos via API.
-- Removendo-a, mantemos acesso direto a arquivos e bloqueamos a listagem.
DROP POLICY IF EXISTS "Allow public to view media" ON storage.objects;