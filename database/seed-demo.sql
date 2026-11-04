-- ============================================================
-- BACKHAUL — Seed da demonstração (contas com senha real)
-- Cria o cenário do roteiro-demo.md:
--   1 empresa, 1 motorista COM MOPP aprovado e válido,
--   1 motorista SEM MOPP e cargas com e sem exigência perto de Uberlândia.
--
-- Diferente do seed.sql, aqui NÃO há e-mail nem senha no arquivo:
-- o CI (verificar:proibidos) reprova se um e-mail de demo aparecer no repositório.
-- Eles chegam como variáveis do psql, e o hash bcrypt é gerado no próprio banco.
--
-- Como rodar (os valores ficam só no seu terminal / gerenciador de senhas):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v email_empresa=...   -v senha_empresa=... \
--     -v email_mopp=...      -v senha_mopp=... \
--     -v email_sem_mopp=...  -v senha_sem_mopp=... \
--     -f database/seed-demo.sql
--
-- Pode rodar de novo (ex.: depois do ensaio): o bloco de limpeza apaga
-- as contas demo e tudo o que foi criado a partir delas, e recria do zero.
-- ============================================================

-- pgcrypto: fornece crypt() e gen_salt('bf'), que geram hash bcrypt ($2a$)
-- compatível com o bcrypt.compare do backend (bcryptjs).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ---- LIMPEZA (torna o seed reexecutável) ----
-- fretes e transacoes usam ON DELETE RESTRICT, então o CASCADE a partir de
-- usuarios pararia neles. Apaga de baixo para cima antes de remover as contas.
-- Os IDs demo usam o bloco ...-0000000d0xxx para não colidir com o seed.sql.
DELETE FROM transacoes t
 USING fretes f, propostas p, chamados_carga c
 WHERE t.frete_id = f.id AND f.proposta_id = p.id AND p.chamado_carga_id = c.id
   AND c.empresa_id = '00000000-0000-0000-0000-0000000d0012';

DELETE FROM fretes f
 USING propostas p, chamados_carga c
 WHERE f.proposta_id = p.id AND p.chamado_carga_id = c.id
   AND c.empresa_id = '00000000-0000-0000-0000-0000000d0012';

-- Fretes que motoristas demo fecharam com cargas de OUTRAS empresas também travariam.
DELETE FROM transacoes t
 USING fretes f, propostas p, chamados_disponibilidade d
 WHERE t.frete_id = f.id AND f.proposta_id = p.id AND p.chamado_disp_id = d.id
   AND d.motorista_id IN ('00000000-0000-0000-0000-0000000d0021',
                          '00000000-0000-0000-0000-0000000d0022');

DELETE FROM fretes f
 USING propostas p, chamados_disponibilidade d
 WHERE f.proposta_id = p.id AND p.chamado_disp_id = d.id
   AND d.motorista_id IN ('00000000-0000-0000-0000-0000000d0021',
                          '00000000-0000-0000-0000-0000000d0022');

-- O resto (perfis, chamados, propostas, mensagens, certificações do motorista)
-- sai em CASCADE. Apaga também por e-mail, caso a conta tenha sido criada à mão antes.
DELETE FROM usuarios
 WHERE id IN ('00000000-0000-0000-0000-0000000d0001',
              '00000000-0000-0000-0000-0000000d0002',
              '00000000-0000-0000-0000-0000000d0003')
    OR email IN (lower(:'email_empresa'), lower(:'email_mopp'), lower(:'email_sem_mopp'));

-- ---- CERTIFICAÇÃO MOPP ----
-- Mesmo id do seed.sql: se ele já rodou neste banco, reaproveita; senão, cria.
INSERT INTO certificacoes (id, nome, classificacao_onu, descricao) VALUES
('00000000-0000-0000-0000-000000000021', 'MOPP - Classe 3 Inflamáveis', '3',
 'Movimentação Operacional de Produtos Perigosos - inflamáveis líquidos')
ON CONFLICT (id) DO NOTHING;

-- ---- USUÁRIOS (e-mail em minúsculo, como o login compara) ----
INSERT INTO usuarios (id, email, senha_hash, tipo) VALUES
('00000000-0000-0000-0000-0000000d0001', lower(:'email_empresa'),
 crypt(:'senha_empresa', gen_salt('bf', 10)), 'empresa'),
('00000000-0000-0000-0000-0000000d0002', lower(:'email_mopp'),
 crypt(:'senha_mopp', gen_salt('bf', 10)), 'motorista'),
('00000000-0000-0000-0000-0000000d0003', lower(:'email_sem_mopp'),
 crypt(:'senha_sem_mopp', gen_salt('bf', 10)), 'motorista');

-- ---- EMPRESA ----
INSERT INTO empresas (id, usuario_id, razao_social, cnpj, cnpj_validado) VALUES
('00000000-0000-0000-0000-0000000d0012', '00000000-0000-0000-0000-0000000d0001',
 'Distribuidora Triângulo LTDA', '90000000000101', TRUE);

-- ---- MOTORISTAS ----
INSERT INTO motoristas (id, usuario_id, nome_completo, cpf, cnh, cnh_validada, veiculo_tipo, veiculo_placa, capacidade_kg) VALUES
('00000000-0000-0000-0000-0000000d0021', '00000000-0000-0000-0000-0000000d0002',
 'Carlos Mendes', '90000000001', '90000000001', TRUE, 'carreta', 'DMO1A23', 25000),
('00000000-0000-0000-0000-0000000d0022', '00000000-0000-0000-0000-0000000d0003',
 'Marcos Oliveira', '90000000002', '90000000002', TRUE, 'truck', 'DMO2B34', 12000);

-- ---- MOPP DO MOTORISTA COM CERTIFICAÇÃO ----
-- A busca de cargas (rotas/cargas.ts) só libera carga MOPP se validado_por_admin = TRUE
-- e validade >= CURRENT_DATE. Validade relativa a hoje: o seed não "vence" sozinho.
INSERT INTO motorista_certificacoes (id, motorista_id, certificacao_id, numero_certificado, validade, validado_por_admin) VALUES
('00000000-0000-0000-0000-0000000d0031', '00000000-0000-0000-0000-0000000d0021',
 '00000000-0000-0000-0000-000000000021', 'MOPP-2026-DEMO1', CURRENT_DATE + interval '1 year', TRUE);

-- ---- MOTORISTA SEM MOPP ----
-- O Marcos Oliveira não tem nenhuma linha em motorista_certificacoes.
-- Por isso o filtro de cargas.ts não libera as cargas que exigem MOPP.

-- ---- CARGAS (origem nas cidades de app/src/data/cidades.ts) ----
-- expira_em longo: o seed roda antes do ensaio (28/10) e precisa durar até a banca (12/11).
-- Sem disponibilidade aqui: no roteiro, o motorista publica a dele ao vivo.
INSERT INTO chamados_carga (id, empresa_id, certificacao_requerida_id, tipo_carga, origem, destino, peso_kg, valor_oferecido, urgencia, status, expira_em) VALUES
-- MOPP, crítica: Uberlândia -> Uberaba. É a carga que "some" para quem não tem MOPP.
('00000000-0000-0000-0000-0000000d0041', '00000000-0000-0000-0000-0000000d0012',
 '00000000-0000-0000-0000-000000000021', 'Combustível (inflamável)',
 ST_SetSRID(ST_MakePoint(-48.2749, -18.9141), 4326)::geography,
 ST_SetSRID(ST_MakePoint(-47.9381, -19.7472), 4326)::geography,
 18000, 4800.00, 'critico', 'aberto', now() + interval '30 days'),
-- MOPP, urgente: Araguari -> Catalão.
('00000000-0000-0000-0000-0000000d0042', '00000000-0000-0000-0000-0000000d0012',
 '00000000-0000-0000-0000-000000000021', 'Solventes industriais',
 ST_SetSRID(ST_MakePoint(-48.1934, -18.6456), 4326)::geography,
 ST_SetSRID(ST_MakePoint(-47.9440, -18.1656), 4326)::geography,
 9000, 2900.00, 'urgente', 'aberto', now() + interval '30 days'),
-- Sem exigência, urgente: Uberlândia -> Itumbiara.
('00000000-0000-0000-0000-0000000d0043', '00000000-0000-0000-0000-0000000d0012',
 NULL, 'Grãos ensacados',
 ST_SetSRID(ST_MakePoint(-48.2749, -18.9141), 4326)::geography,
 ST_SetSRID(ST_MakePoint(-49.2158, -18.4093), 4326)::geography,
 11000, 2300.00, 'urgente', 'aberto', now() + interval '30 days'),
-- Sem exigência, normal: Tupaciguara -> Araxá.
('00000000-0000-0000-0000-0000000d0044', '00000000-0000-0000-0000-0000000d0012',
 NULL, 'Material de construção',
 ST_SetSRID(ST_MakePoint(-48.6985, -18.5866), 4326)::geography,
 ST_SetSRID(ST_MakePoint(-46.9438, -19.5902), 4326)::geography,
 7000, 1900.00, 'normal', 'aberto', now() + interval '30 days');

COMMIT;
