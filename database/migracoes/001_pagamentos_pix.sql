-- Migração 001 — base para o pagamento por Pix (ver docs/pagamentos.md).
-- Só ADICIONA colunas anuláveis e uma tabela nova; pode ser rodada mais de uma vez.
-- Rode no SQL Editor do Neon ANTES de publicar a versão da API que usa a chave Pix.
-- (O schema.sql já traz tudo isto para bancos novos; esta migração é para o banco que já existe.)

DO $$
BEGIN
    CREATE TYPE tipo_chave_pix AS ENUM ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Para onde o frete é repassado na entrega.
ALTER TABLE motoristas
    ADD COLUMN IF NOT EXISTS tipo_chave_pix tipo_chave_pix,
    ADD COLUMN IF NOT EXISTS chave_pix      VARCHAR(140);

-- Dados da cobrança e do repasse no gateway. (gateway_referencia já existia.)
ALTER TABLE transacoes
    ADD COLUMN IF NOT EXISTS gateway            VARCHAR(30),   -- 'simulado', 'asaas'...
    ADD COLUMN IF NOT EXISTS pix_copia_cola     TEXT,
    ADD COLUMN IF NOT EXISTS expira_em          TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pago_em            TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS repasse_referencia VARCHAR(100),
    ADD COLUMN IF NOT EXISTS repassado_em       TIMESTAMPTZ;

-- Cada aviso (webhook) que o gateway manda. O UNIQUE impede processar o mesmo aviso duas vezes.
CREATE TABLE IF NOT EXISTS eventos_pagamento (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway     VARCHAR(30)  NOT NULL,
    evento_id   VARCHAR(100) NOT NULL,
    tipo        VARCHAR(60)  NOT NULL,
    payload     JSONB        NOT NULL,
    recebido_em TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (gateway, evento_id)
);
