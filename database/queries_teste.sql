-- ============================================================
-- BACKHAUL — Queries de teste (para demonstrar o banco funcionando)
-- Rode estas depois de aplicar schema.sql e seed.sql
-- ============================================================

-- 1) Ver o motorista e suas certificações (JOIN simples)
SELECT m.nome_completo, c.nome AS certificacao, mc.validade
FROM motoristas m
JOIN motorista_certificacoes mc ON mc.motorista_id = m.id
JOIN certificacoes c ON c.id = mc.certificacao_id;

-- 2) Ver todos os chamados de carga abertos, com nome da empresa e se exige certificação
SELECT cc.tipo_carga, e.razao_social AS empresa, cc.valor_oferecido, cc.urgencia,
       COALESCE(cert.nome, 'Nenhuma certificação exigida') AS certificacao_exigida
FROM chamados_carga cc
JOIN empresas e ON e.id = cc.empresa_id
LEFT JOIN certificacoes cert ON cert.id = cc.certificacao_requerida_id
WHERE cc.status = 'aberto';

-- 3) Busca geográfica com PostGIS: cargas a até 100km de um ponto (ex: centro de Uberlândia)
-- ST_DWithin calcula distância em metros quando a coluna é do tipo geography
SELECT cc.tipo_carga, e.razao_social AS empresa,
       ROUND((ST_Distance(cc.origem, ST_SetSRID(ST_MakePoint(-48.2772, -18.9186), 4326)::geography) / 1000)::numeric, 1) AS distancia_km
FROM chamados_carga cc
JOIN empresas e ON e.id = cc.empresa_id
WHERE ST_DWithin(cc.origem, ST_SetSRID(ST_MakePoint(-48.2772, -18.9186), 4326)::geography, 100000)
ORDER BY distancia_km;

-- 4) Ver a proposta aceita, ligando motorista e empresa (JOIN em cadeia)
SELECT m.nome_completo AS motorista, e.razao_social AS empresa,
       p.tipo, p.valor_proposto, p.status
FROM propostas p
JOIN chamados_disponibilidade cd ON cd.id = p.chamado_disp_id
JOIN motoristas m ON m.id = cd.motorista_id
JOIN chamados_carga cc ON cc.id = p.chamado_carga_id
JOIN empresas e ON e.id = cc.empresa_id;

-- 5) Ver as mensagens trocadas numa proposta, mostrando quem enviou (motorista ou empresa)
SELECT u.tipo AS remetente, msg.conteudo, msg.criado_em
FROM mensagens msg
JOIN usuarios u ON u.id = msg.remetente_id
WHERE msg.proposta_id = '00000000-0000-0000-0000-000000000051'
ORDER BY msg.criado_em;

-- 6) Ver o frete fechado com o valor da comissão retida (JOIN até o pagamento)
SELECT f.status_entrega, f.valor_final, t.percentual_comissao, t.valor_comissao, t.status_pagamento
FROM fretes f
JOIN transacoes t ON t.frete_id = f.id;

-- 7) Testar a integridade referencial: tentar inserir um frete para uma proposta que não existe
-- (deve dar ERRO de violação de chave estrangeira — é o banco protegendo os dados)
-- INSERT INTO fretes (proposta_id, valor_final) VALUES ('11111111-1111-1111-1111-111111111111', 100);
