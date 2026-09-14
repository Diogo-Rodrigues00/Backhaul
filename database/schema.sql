-- ============================================================
-- BACKHAUL — Plataforma de Conexão de Fretes por Urgência
-- Script SQL de criação do banco de dados (DDL)
-- SGBD: PostgreSQL 15+ com extensão PostGIS
-- ============================================================
-- Versão 1.0 — checkpoint 1 (modelo inicial)
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
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- ------------------------------------------------------------
-- 2. TIPOS ENUMERADOS
-- ------------------------------------------------------------
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

CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(150) NOT NULL UNIQUE,
    senha_hash      VARCHAR(255) NOT NULL,
    tipo            tipo_usuario NOT NULL,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE motoristas (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id        UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nome_completo     VARCHAR(150) NOT NULL,
    cpf               VARCHAR(11) NOT NULL UNIQUE,
    cnh               VARCHAR(20) NOT NULL,
    cnh_validada      BOOLEAN NOT NULL DEFAULT FALSE,
    veiculo_tipo      VARCHAR(50) NOT NULL,
    veiculo_placa     VARCHAR(10) NOT NULL,
    capacidade_kg     NUMERIC(10,2) NOT NULL,
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE empresas (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id        UUID NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    razao_social      VARCHAR(150) NOT NULL,
    cnpj              VARCHAR(14) NOT NULL UNIQUE,
    cnpj_validado     BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chamados_disponibilidade (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    motorista_id        UUID NOT NULL REFERENCES motoristas(id) ON DELETE CASCADE,
    regiao_interesse    GEOGRAPHY(POINT, 4326) NOT NULL,
    raio_busca_km       NUMERIC(6,2) NOT NULL DEFAULT 50,
    urgencia            nivel_urgencia NOT NULL DEFAULT 'normal',
    status              status_chamado NOT NULL DEFAULT 'aberto',
    expira_em           TIMESTAMPTZ NOT NULL,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chamados_carga (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id          UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo_carga          VARCHAR(80) NOT NULL,
    origem              GEOGRAPHY(POINT, 4326) NOT NULL,
    destino             GEOGRAPHY(POINT, 4326) NOT NULL,
    peso_kg             NUMERIC(10,2) NOT NULL,
    valor_oferecido     NUMERIC(10,2) NOT NULL,
    urgencia            nivel_urgencia NOT NULL DEFAULT 'normal',
    status              status_chamado NOT NULL DEFAULT 'aberto',
    expira_em           TIMESTAMPTZ NOT NULL,
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE propostas (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chamado_disp_id       UUID NOT NULL REFERENCES chamados_disponibilidade(id) ON DELETE CASCADE,
    chamado_carga_id      UUID NOT NULL REFERENCES chamados_carga(id) ON DELETE CASCADE,
    tipo                  tipo_proposta NOT NULL,
    valor_proposto        NUMERIC(10,2) NOT NULL,
    status                status_proposta NOT NULL DEFAULT 'pendente',
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fretes (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposta_id       UUID NOT NULL UNIQUE REFERENCES propostas(id) ON DELETE RESTRICT,
    valor_final       NUMERIC(10,2) NOT NULL,
    status_entrega    status_entrega NOT NULL DEFAULT 'aceito',
    coleta_em         TIMESTAMPTZ,
    entrega_em        TIMESTAMPTZ,
    criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transacoes (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frete_id            UUID NOT NULL UNIQUE REFERENCES fretes(id) ON DELETE RESTRICT,
    valor_frete         NUMERIC(10,2) NOT NULL,
    percentual_comissao NUMERIC(5,2) NOT NULL,
    valor_comissao      NUMERIC(10,2) NOT NULL,
    status_pagamento    status_pagamento NOT NULL DEFAULT 'pendente',
    gateway_referencia  VARCHAR(100),
    criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE logs_auditoria (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id    UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    acao          VARCHAR(100) NOT NULL,
    detalhes      JSONB,
    ip_origem     INET,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 4. ÍNDICES EXTRAS
-- ------------------------------------------------------------
CREATE INDEX idx_chamados_disp_regiao ON chamados_disponibilidade USING GIST (regiao_interesse);
CREATE INDEX idx_chamados_carga_origem ON chamados_carga USING GIST (origem);
CREATE INDEX idx_chamados_carga_destino ON chamados_carga USING GIST (destino);
CREATE INDEX idx_chamados_disp_status ON chamados_disponibilidade (status) WHERE status = 'aberto';
CREATE INDEX idx_chamados_carga_status ON chamados_carga (status) WHERE status = 'aberto';
CREATE INDEX idx_logs_auditoria_usuario ON logs_auditoria (usuario_id, criado_em DESC);
