-- ============================================================
-- BACKHAUL — Dados de exemplo (seed)
-- Popula o banco com um cenário completo e realista:
-- 1 motorista, 1 empresa, 1 certificação (MOPP), 1 chamado de cada lado,
-- 1 proposta aceita, mensagens, frete fechado e transação com comissão.
--
-- Os IDs abaixo são fixos (não gerados automaticamente) só para
-- facilitar a demonstração e as queries de teste — em uso real,
-- o próprio banco geraria esses UUIDs sozinho.
-- ============================================================

-- ---- USUÁRIOS ----
INSERT INTO usuarios (id, email, senha_hash, tipo) VALUES
('00000000-0000-0000-0000-000000000001', 'motorista1@teste.com', 'hash_fake_1', 'motorista'),
('00000000-0000-0000-0000-000000000002', 'empresa1@teste.com',   'hash_fake_2', 'empresa'),
('00000000-0000-0000-0000-000000000003', 'admin@teste.com',      'hash_fake_3', 'admin');

-- ---- MOTORISTA ----
INSERT INTO motoristas (id, usuario_id, nome_completo, cpf, cnh, cnh_validada, veiculo_tipo, veiculo_placa, capacidade_kg) VALUES
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001',
 'João da Silva', '12345678901', '11122233344', TRUE, 'carreta', 'ABC1D23', 15000);

-- ---- EMPRESA ----
INSERT INTO empresas (id, usuario_id, razao_social, cnpj, cnpj_validado) VALUES
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002',
 'Transportes Rápidos LTDA', '12345678000199', TRUE);

-- ---- CERTIFICAÇÃO (MOPP, para cargas perigosas) ----
INSERT INTO certificacoes (id, nome, classificacao_onu, descricao) VALUES
('00000000-0000-0000-0000-000000000021', 'MOPP - Classe 3 Inflamáveis', '3',
 'Movimentação Operacional de Produtos Perigosos - inflamáveis líquidos');

-- ---- MOTORISTA POSSUI A CERTIFICAÇÃO ----
INSERT INTO motorista_certificacoes (id, motorista_id, certificacao_id, numero_certificado, validade, validado_por_admin) VALUES
('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000011',
 '00000000-0000-0000-0000-000000000021', 'MOPP-2026-00123', '2027-06-30', TRUE);

-- ---- CHAMADO DE DISPONIBILIDADE (motorista livre perto de Uberlândia/MG) ----
INSERT INTO chamados_disponibilidade (id, motorista_id, regiao_interesse, raio_busca_km, urgencia, status, expira_em) VALUES
('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000011',
 ST_SetSRID(ST_MakePoint(-48.2772, -18.9186), 4326)::geography, 80, 'urgente', 'aberto', now() + interval '2 days');

-- ---- CHAMADOS DE CARGA (um exige certificação, outro não) ----
INSERT INTO chamados_carga (id, empresa_id, certificacao_requerida_id, tipo_carga, origem, destino, peso_kg, valor_oferecido, urgencia, status, expira_em) VALUES
('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000012',
 '00000000-0000-0000-0000-000000000021', 'Produtos inflamáveis',
 ST_SetSRID(ST_MakePoint(-48.2772, -18.9186), 4326)::geography,
 ST_SetSRID(ST_MakePoint(-47.9319, -19.7469), 4326)::geography,
 8000, 3500.00, 'urgente', 'aberto', now() + interval '1 day'),
('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000012',
 NULL, 'Eletrônicos',
 ST_SetSRID(ST_MakePoint(-48.2772, -18.9186), 4326)::geography,
 ST_SetSRID(ST_MakePoint(-47.9319, -19.7469), 4326)::geography,
 2000, 1200.00, 'normal', 'aberto', now() + interval '3 days');

-- ---- PROPOSTA (motorista aceitou a carga perigosa, pois tem certificação válida) ----
INSERT INTO propostas (id, chamado_disp_id, chamado_carga_id, tipo, valor_proposto, status) VALUES
('00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000041',
 '00000000-0000-0000-0000-000000000042', 'aceite', 3500.00, 'aceita');

-- ---- MENSAGENS (chat liberado após a proposta) ----
INSERT INTO mensagens (id, proposta_id, remetente_id, conteudo) VALUES
('00000000-0000-0000-0000-000000000061', '00000000-0000-0000-0000-000000000051',
 '00000000-0000-0000-0000-000000000001', 'Posso coletar amanhã às 8h, pode confirmar o endereço exato?'),
('00000000-0000-0000-0000-000000000062', '00000000-0000-0000-0000-000000000051',
 '00000000-0000-0000-0000-000000000002', 'Perfeito! Endereço: Av. Teste, 123, Uberlândia.');

-- ---- FRETE (proposta aceita virou frete, em trânsito) ----
INSERT INTO fretes (id, proposta_id, valor_final, status_entrega, coleta_em) VALUES
('00000000-0000-0000-0000-000000000071', '00000000-0000-0000-0000-000000000051',
 3500.00, 'em_transito', now());

-- ---- TRANSAÇÃO (comissão de 5% retida) ----
INSERT INTO transacoes (id, frete_id, valor_frete, percentual_comissao, valor_comissao, status_pagamento, gateway_referencia) VALUES
('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-000000000071',
 3500.00, 5.00, 175.00, 'retido', 'sim_txn_001');

-- ---- LOG DE AUDITORIA (exemplo de ação sensível registrada) ----
INSERT INTO logs_auditoria (id, usuario_id, acao, detalhes, ip_origem) VALUES
('00000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-000000000002',
 'chamado_publicado', '{"chamado_id": "00000000-0000-0000-0000-000000000042"}'::jsonb, '192.168.0.10');
