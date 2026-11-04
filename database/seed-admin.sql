-- Cria (ou atualiza a senha do) usuário ADMIN da plataforma. Rode UMA vez por ambiente.
-- A senha nunca vai para o repositório: gere o hash bcrypt na sua máquina e passe por variável.
--
--   1) Dentro da pasta backend:
--        node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" 'SUA_SENHA_AQUI'
--   2) Rode (troque os dois valores):
--        psql "$DATABASE_URL" -v email='admin@seudominio.com' -v hash='$2b$10$...' -f database/seed-admin.sql
--      (se a rede bloquear a porta 5432, cole no SQL Editor do Neon trocando :'email' e :'hash' pelos valores entre aspas simples)
INSERT INTO usuarios (email, senha_hash, tipo)
VALUES (lower(:'email'), :'hash', 'admin')
ON CONFLICT (email) DO UPDATE SET senha_hash = EXCLUDED.senha_hash, tipo = 'admin', ativo = TRUE;
