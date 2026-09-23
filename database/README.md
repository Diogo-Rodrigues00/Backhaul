# Banco de Dados — Backhaul

**SGBD:** PostgreSQL 15+ com extensão **PostGIS** (usada para buscas por proximidade geográfica — ex: "caminhoneiros disponíveis num raio de 50km de uma carga").

**Identificadores:** todas as tabelas usam **UUID** como chave primária (em vez de números sequenciais), gerado automaticamente por `uuid_generate_v4()`. Isso evita expor informações como "quantos usuários existem" só pelo ID.

## Tipos enumerados (ENUM)

Antes das tabelas, o schema define tipos fixos de valores, pra evitar campos de texto livre inconsistentes:

| Tipo | Valores possíveis | Usado em |
|---|---|---|
| `tipo_usuario` | motorista, empresa, admin | `usuarios` |
| `nivel_urgencia` | normal, urgente, critico | `chamados_disponibilidade`, `chamados_carga` |
| `status_chamado` | aberto, em_negociacao, fechado, expirado, cancelado | `chamados_disponibilidade`, `chamados_carga` |
| `tipo_proposta` | aceite, contraproposta | `propostas` |
| `status_proposta` | pendente, aceita, recusada, expirada | `propostas` |
| `status_entrega` | aceito, em_transito, entregue, cancelado | `fretes` |
| `status_pagamento` | pendente, retido, liberado, estornado | `transacoes` |

## Tabelas

### 1. `usuarios`
Tabela base de autenticação, comum aos três tipos de ator (motorista, empresa, admin). Dados específicos de cada perfil ficam em tabelas próprias, evitando colunas vazias.
- `email`, `senha_hash` — login
- `tipo` — define se é motorista, empresa ou admin
- `ativo` — permite desativar conta sem apagar

### 2. `motoristas`
Dados específicos do caminhoneiro. Ligada 1:1 a um `usuarios` (via `usuario_id`).
- `cpf`, `cnh`, `cnh_validada` — identidade e habilitação
- `veiculo_tipo`, `veiculo_placa`, `capacidade_kg` — dados do veículo

### 3. `empresas`
Dados específicos da empresa embarcadora. Ligada 1:1 a um `usuarios`.
- `razao_social`, `cnpj`, `cnpj_validado`

### 4. `certificacoes`
Catálogo de certificações exigidas para transportar cargas especiais (ex: MOPP para produtos perigosos). É uma tabela própria em vez de texto livre, para permitir adicionar novas certificações sem mudar código.
- `classificacao_onu` — classe de risco ONU, quando aplicável

### 5. `motorista_certificacoes`
Liga um motorista às certificações que ele possui, com validade.
- `validade` — permite checar se a certificação ainda está válida
- `validado_por_admin` — confirma que um admin revisou o certificado
- Única por par (`motorista_id`, `certificacao_id`)

### 6. `chamados_disponibilidade`
Um motorista sinaliza que está livre e buscando carga numa região.
- `regiao_interesse` (GEOGRAPHY) — ponto geográfico, usado pelo PostGIS pra buscar cargas próximas
- `raio_busca_km` — raio de busca (padrão 50km)
- `expira_em` — chamado tem validade

### 7. `chamados_carga`
Uma empresa publica uma carga disponível para transporte.
- `origem` / `destino` (GEOGRAPHY) — pontos de coleta e entrega
- `certificacao_requerida_id` — se preenchido, só motoristas com essa certificação válida podem ver/aceitar a carga; se `NULL`, qualquer motorista pode se candidatar

### 8. `propostas`
Liga um chamado de disponibilidade a um chamado de carga, quando uma das partes demonstra interesse.
- `tipo` — aceite direto ou contraproposta
- `valor_proposto` — valor negociado

### 9. `mensagens`
Chat de apoio entre as partes, liberado só depois que existe uma proposta em andamento (protege contra contato prematuro). O preço é negociado via `propostas`, não pelo chat.
- `sinalizado_moderacao` — marcado automaticamente se o filtro detectar tentativa de compartilhar contato (telefone/e-mail/link) ou combinar algo fora da plataforma
- `revisado_por_admin` — controla fila de revisão manual

### 10. `fretes`
Quando uma proposta é aceita por ambos os lados, vira um frete real.
- `status_entrega` — acompanha o ciclo (aceito → em trânsito → entregue)
- `coleta_em` / `entrega_em` — timestamps da operação

### 11. `transacoes`
Pagamento do frete, com a comissão da plataforma retida.
- `valor_frete`, `percentual_comissao`, `valor_comissao`
- `gateway_referencia` — ID da transação no gateway de pagamento externo

### 12. `logs_auditoria`
Rastreamento de ações sensíveis (requisito de segurança RNF19).
- `acao` — ex: login, cadastro_alterado, pagamento_processado
- `detalhes` (JSONB) — dados flexíveis sobre a ação
- `ip_origem` — IP de origem da ação

## Relacionamentos (resumo)

```
usuarios ──┬── motoristas ──── motorista_certificacoes ──── certificacoes
           └── empresas

motoristas ── chamados_disponibilidade ──┐
                                          ├── propostas ── mensagens
empresas   ── chamados_carga ────────────┘
                                          └── fretes ── transacoes

usuarios ── logs_auditoria
```

- Um usuário é motorista OU empresa (nunca os dois).
- Um motorista pode ter várias certificações validadas.
- Um chamado de disponibilidade (motorista) pode gerar várias propostas, assim como um chamado de carga (empresa).
- Uma proposta aceita vira um frete, que gera uma transação de pagamento.
- Mensagens só existem dentro do contexto de uma proposta específica.

## Índices espaciais (PostGIS)

Índices do tipo **GiST** foram criados em `regiao_interesse`, `origem` e `destino` — são o que torna rápida a busca "quais cargas/motoristas estão perto de mim", essencial para o requisito de matching em tempo quase real (RNF01).

## Como rodar o schema localmente

```bash
psql -U seu_usuario -d nome_do_banco -f database/schema.sql
```

Requer PostgreSQL com as extensões `uuid-ossp` e `postgis` disponíveis.
