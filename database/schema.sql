-- ============================================================
-- BACKHAUL — Plataforma de Conexão de Fretes por Urgência
-- Script SQL de criação do banco de dados (DDL)
-- SGBD: PostgreSQL 15+ com extensão PostGIS
-- ============================================================
-- Versão 1.1 — atualização pós-feedback do checkpoint 1:
--   + certificacoes / motorista_certificacoes (validação para cargas perigosas)
--   + mensagens (chat de negociação monitorado)
--   + chamados_carga.certificacao_requerida_id
-- ============================================================
-- Como ler este arquivo:
--   1. Extensões necessárias
--   2. Tipos enumerados (ENUM) usados para restringir valores válidos
--   3. Tabelas, na ordem em que dependem umas das outras
--   4. Índices extras (além dos criados automaticamente por PK/UNIQUE)
-- ============================================================

-- ------------------------------------------------------------
-- 1. EXTENSÕES
-- ------------------------------------------------------------
-- uuid-ossp: gera identificadores únicos (UUID) para as chaves primárias,
--            em vez de números sequenciais — evita expor "quantos registros existem".
-- postgis:   adiciona o tipo GEOGRAPHY, usado para localização e buscas
--            por proximidade (ex: "caminhoneiros num raio de 50km").
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ------------------------------------------------------------
-- 2. TIPOS ENUMERADOS
-- ------------------------------------------------------------
-- ENUMs garantem, a nível de banco, que essas colunas só aceitem
-- um conjunto fixo de valores — evita "status" com texto livre e inconsistente.

CREATE TYPE tipo_usuario AS ENUM ('motorista', 'empresa', 'admin');

CREATE TYPE nivel_urgencia AS ENUM ('normal', 'urgente', 'critico');

CREATE TYPE status_chamado AS ENUM ('aberto', 'em_negociacao', 'fechado', 'expirado', 'cancelado');

CREATE TYPE tipo_proposta AS ENUM ('aceite', 'contraproposta');

CREATE TYPE status_proposta AS ENUM ('pendente', 'aceita', 'recusada', 'expirada');

CREATE TYPE status_entrega AS ENUM ('aceito', 'em_transito', 'entregue', 'cancelado');

CREATE TYPE status_pagamento AS ENUM ('pendente', 'retido', 'liberado', 'estornado');

-- ------------------------------------------------------------
-- 3. TABELAS
-- ------------------------------------------------------------

-- USUARIOS: tabela base de autenticação, comum aos três atores do sistema
-- (motorista, empresa, admin). Dados específicos de cada perfil ficam
-- em tabelas próprias (MOTORISTAS / EMPRESAS), evitando colunas vazias.
CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(150) NOT NULL UNIQUE,
    senha_hash      VARCHAR(255) NOT NULL,
    tipo            tipo_usuario NOT NULL,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MOTORISTAS: dados específicos do caminhoneiro, ligados 1:1 a um usuário.
CREATE TABLE motoristas (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id        UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nome_completo     VARCHAR(150) NOT NULL,
    cpf               VARCHAR(11) NOT NULL UNIQUE,
    cnh               VARCHAR(20) NOT NULL,
    cnh_validada      BOOLEAN NOT NULL DEFAULT FALSE,
    veiculo_tipo      VARCHAR(50) NOT NULL,      -- ex: 'truck', 'carreta', 'bitrem'
    veiculo_placa     VARCHAR(10) NOT NULL,
    capacidade_kg     NUMERIC(10,2) NOT NULL,
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EMPRESAS: dados específicos da empresa/embarcadora, ligados 1:1 a um usuário.
CREATE TABLE empresas (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id        UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    razao_social      VARCHAR(150) NOT NULL,
    cnpj              VARCHAR(14) NOT NULL UNIQUE,
    cnpj_validado     BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CERTIFICACOES: catálogo de certificações exigidas para transportar cargas
-- especiais (ex: MOPP para produtos perigosos). Ter isso como tabela própria
-- (em vez de texto livre) permite adicionar novas certificações sem alterar código.
CREATE TABLE certificacoes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome                VARCHAR(120) NOT NULL,        -- ex: 'MOPP - Classe 3 Inflamáveis'
    classificacao_onu   VARCHAR(10),                  -- classe de risco ONU, quando aplicável
    descricao           TEXT
);

-- MOTORISTA_CERTIFICACOES: liga um motorista às certificações que ele possui,
-- com validade — permite checar rapidamente se a certificação ainda está válida.
CREATE TABLE motorista_certificacoes (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    motorista_id          UUID NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
    certificacao_id       UUID NOT NULL REFERENCES certificacoes(id) ON DELETE RESTRICT,
    numero_certificado    VARCHAR(60) NOT NULL,
    validade              DATE NOT NULL,
    validado_por_admin    BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (motorista_id, certificacao_id)
);

-- CHAMADOS_DISPONIBILIDADE: motorista sinalizando que está livre
-- e buscando carga numa região. Coluna geográfica permite buscar
-- "motoristas disponíveis perto de X" via PostGIS.
CREATE TABLE chamados_disponibilidade (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    motorista_id        UUID NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
    regiao_interesse     GEOGRAPHY(POINT, 4326) NOT NULL,
    raio_busca_km       NUMERIC(6,2) NOT NULL DEFAULT 50,
    urgencia            nivel_urgencia NOT NULL DEFAULT 'normal',
    status              status_chamado NOT NULL DEFAULT 'aberto',
    expira_em           TIMESTAMPTZ NOT NULL,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CHAMADOS_CARGA: empresa publicando uma carga disponível para transporte.
-- certificacao_requerida_id: quando NULL, qualquer motorista pode se candidatar;
-- quando preenchida, só motoristas com essa certificação válida podem ver/aceitar.
CREATE TABLE chamados_carga (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id                  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    certificacao_requerida_id   UUID REFERENCES certificacoes(id) ON DELETE RESTRICT,
    tipo_carga                  VARCHAR(80) NOT NULL,
    origem                      GEOGRAPHY(POINT, 4326) NOT NULL,
    destino                     GEOGRAPHY(POINT, 4326) NOT NULL,
    peso_kg                     NUMERIC(10,2) NOT NULL,
    valor_oferecido             NUMERIC(10,2) NOT NULL,
    urgencia                    nivel_urgencia NOT NULL DEFAULT 'normal',
    status                      status_chamado NOT NULL DEFAULT 'aberto',
    expira_em                   TIMESTAMPTZ NOT NULL,
    criado_em                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROPOSTAS: liga um chamado de disponibilidade a um chamado de carga
-- quando uma das partes demonstra interesse (aceite ou contraproposta única).
CREATE TABLE propostas (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamado_disp_id       UUID NOT NULL REFERENCES chamados_disponibilidade(id) ON DELETE CASCADE,
    chamado_carga_id      UUID NOT NULL REFERENCES chamados_carga(id) ON DELETE CASCADE,
    tipo                  tipo_proposta NOT NULL,
    valor_proposto        NUMERIC(10,2) NOT NULL,
    status                status_proposta NOT NULL DEFAULT 'pendente',
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MENSAGENS: chat de apoio operacional entre as partes, liberado a partir do
-- momento em que existe uma proposta em andamento (não antes — protege contra
-- contato prematuro). Preço é negociado via PROPOSTAS, não pelo chat.
-- sinalizado_moderacao: marcado automaticamente quando o filtro de conteúdo
-- detecta possível tentativa de compartilhar contato (telefone/e-mail/link)
-- ou combinar algo fora da plataforma — fica disponível para revisão do admin.
CREATE TABLE mensagens (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposta_id             UUID NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
    remetente_id            UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    conteudo                TEXT NOT NULL,
    sinalizado_moderacao    BOOLEAN NOT NULL DEFAULT FALSE,
    revisado_por_admin      BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FRETES: quando uma proposta é aceita por ambos os lados, vira um frete real.
CREATE TABLE fretes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposta_id       UUID NOT NULL UNIQUE REFERENCES propostas(id) ON DELETE RESTRICT,
    valor_final       NUMERIC(10,2) NOT NULL,
    status_entrega    status_entrega NOT NULL DEFAULT 'aceito',
    coleta_em         TIMESTAMPTZ,
    entrega_em        TIMESTAMPTZ,
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- TRANSACOES: pagamento do frete, com a comissão da plataforma retida.
CREATE TABLE transacoes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frete_id            UUID NOT NULL UNIQUE REFERENCES fretes(id) ON DELETE RESTRICT,
    valor_frete         NUMERIC(10,2) NOT NULL,
    percentual_comissao NUMERIC(5,2) NOT NULL,
    valor_comissao      NUMERIC(10,2) NOT NULL,
    status_pagamento    status_pagamento NOT NULL DEFAULT 'pendente',
    gateway_referencia  VARCHAR(100),          -- ID da transação no gateway externo
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- LOGS_AUDITORIA: rastreamento de ações sensíveis (RNF19 — requisito de segurança).
CREATE TABLE logs_auditoria (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    acao          VARCHAR(100) NOT NULL,       -- ex: 'login', 'cadastro_alterado', 'pagamento_processado'
    detalhes      JSONB,
    ip_origem     INET,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 4. ÍNDICES EXTRAS
-- ------------------------------------------------------------
-- Índices espaciais (GiST): aceleram buscas por proximidade via PostGIS,
-- essenciais para o requisito de matching em tempo quase real (RNF01).
CREATE INDEX idx_chamados_disp_regiao ON chamados_disponibilidade USING GIST (regiao_interesse);
CREATE INDEX idx_chamados_carga_origem ON chamados_carga USING GIST (origem);
CREATE INDEX idx_chamados_carga_destino ON chamados_carga USING GIST (destino);

-- Índices para consultas frequentes de status (buscas de chamados ainda abertos)
CREATE INDEX idx_chamados_disp_status ON chamados_disponibilidade (status) WHERE status = 'aberto';
CREATE INDEX idx_chamados_carga_status ON chamados_carga (status) WHERE status = 'aberto';

-- Índice para consultar rapidamente o histórico de auditoria por usuário
CREATE INDEX idx_logs_auditoria_usuario ON logs_auditoria (usuario_id, criado_em DESC);

-- Índice para checar rapidamente se um motorista tem certificação válida
-- (usado na hora de filtrar quais chamados de carga ele pode ver/aceitar)
CREATE INDEX idx_motorista_certificacoes_validade
    ON motorista_certificacoes (motorista_id, certificacao_id, validade)
    WHERE validado_por_admin = TRUE;

-- Índice para carregar o histórico de mensagens de uma proposta em ordem cronológica
CREATE INDEX idx_mensagens_proposta ON mensagens (proposta_id, criado_em);

-- Índice para o admin listar rapidamente mensagens sinalizadas ainda não revisadas
CREATE INDEX idx_mensagens_sinalizadas ON mensagens (sinalizado_moderacao) WHERE sinalizado_moderacao = TRUE AND revisado_por_admin = FALSE;
