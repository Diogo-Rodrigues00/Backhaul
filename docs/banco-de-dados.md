# Banco de dados — Backhaul

PostgreSQL 18 + PostGIS (hospedado no Neon). A fonte de verdade é `database/schema.sql`; este arquivo só explica o desenho. **Mudou o schema? Atualize os dois.**

## Diagrama (entidade-relacionamento)

```mermaid
erDiagram
    usuarios ||--o| motoristas : "perfil 1:1"
    usuarios ||--o| empresas : "perfil 1:1"
    usuarios ||--o{ mensagens : "envia"
    usuarios ||--o{ logs_auditoria : "gera"

    motoristas ||--o{ motorista_certificacoes : "possui"
    certificacoes ||--o{ motorista_certificacoes : "é comprovada por"
    certificacoes |o--o{ chamados_carga : "exigida em"

    motoristas ||--o{ chamados_disponibilidade : "publica"
    empresas ||--o{ chamados_carga : "publica"

    chamados_disponibilidade ||--o{ propostas : "usada em"
    chamados_carga ||--o{ propostas : "recebe"
    propostas ||--o{ mensagens : "tem chat"
    propostas ||--o| fretes : "aceita vira"
    fretes ||--o| transacoes : "é paga por"

    usuarios {
        uuid id PK
        text email UK
        text senha_hash
        tipo_usuario tipo "motorista | empresa | admin"
        bool ativo
    }
    motoristas {
        uuid id PK
        uuid usuario_id FK
        text cpf UK
        text cnh
        text veiculo_tipo
        text veiculo_placa
        int capacidade_kg
        tipo_chave_pix tipo_chave_pix "para repasse via Pix"
        text chave_pix
    }
    empresas {
        uuid id PK
        uuid usuario_id FK
        text razao_social
        text cnpj UK
    }
    certificacoes {
        uuid id PK
        text nome
        text classificacao_onu
    }
    motorista_certificacoes {
        uuid id PK
        uuid motorista_id FK
        uuid certificacao_id FK
        text numero_certificado
        date validade
        bool validado_por_admin
    }
    chamados_disponibilidade {
        uuid id PK
        uuid motorista_id FK
        geography local "POINT 4326"
        int raio_busca_km
        nivel_urgencia urgencia
        status_chamado status
        timestamptz expira_em
    }
    chamados_carga {
        uuid id PK
        uuid empresa_id FK
        uuid certificacao_requerida_id FK
        geography origem "POINT 4326"
        geography destino "POINT 4326"
        numeric valor_oferecido
        nivel_urgencia urgencia
        status_chamado status
        timestamptz expira_em
    }
    propostas {
        uuid id PK
        uuid chamado_disp_id FK
        uuid chamado_carga_id FK
        tipo_proposta tipo "aceite | contraproposta"
        numeric valor_proposto
        status_proposta status
    }
    mensagens {
        uuid id PK
        uuid proposta_id FK
        uuid remetente_id FK
        text conteudo
    }
    fretes {
        uuid id PK
        uuid proposta_id FK "UNIQUE"
        numeric valor_final
        status_entrega status_entrega
        timestamptz coleta_em
        timestamptz entrega_em
    }
    transacoes {
        uuid id PK
        uuid frete_id FK "UNIQUE"
        numeric valor_frete
        numeric percentual_comissao
        numeric valor_comissao
        status_pagamento status_pagamento
        text gateway "simulado, asaas..."
        text gateway_referencia
        text pix_copia_cola
        timestamptz pago_em
        timestamptz repassado_em
    }
    eventos_pagamento {
        uuid id PK
        text gateway
        text evento_id "UNIQUE com gateway"
        jsonb payload
    }
    logs_auditoria {
        uuid id PK
        uuid usuario_id FK
    }
```

## Como ler o desenho

- **Um usuário, um perfil.** `usuarios` guarda só login e tipo; os dados de negócio ficam em `motoristas` ou `empresas` (relação 1:1). Por isso o token JWT traz o id do *usuário* e as rotas buscam o id do *perfil* (`backend/src/perfis.ts`).
- **O motorista não aparece direto em `propostas`.** Ele vem pela disponibilidade usada na proposta (`propostas → chamados_disponibilidade → motoristas`). Isso amarra cada proposta a um "estou livre aqui, até tal hora".
- **A empresa também vem por um caminho:** `propostas → chamados_carga → empresas`.
- **Proposta aceita vira frete** (`fretes.proposta_id` é UNIQUE: uma proposta gera no máximo um frete). **Frete pago vira transação** (`transacoes.frete_id` é UNIQUE: um frete só é pago uma vez).
- **Geografia:** `local`, `origem` e `destino` são `GEOGRAPHY(POINT, 4326)`. A busca de cargas próximas usa `ST_DWithin` (usa o índice GiST) e ordena por `ST_Distance`.
- **Certificações:** `certificacoes` é o catálogo (MOPP etc.); `motorista_certificacoes` é o que cada motorista enviou, com validade e aprovação do admin. Carga que exige certificação só aparece e só aceita proposta de quem tem uma **aprovada e dentro da validade**.

## Valores dos ENUMs (sempre minúsculos, sem acento)

| Tipo | Valores |
|---|---|
| `tipo_usuario` | motorista, empresa, admin |
| `nivel_urgencia` | normal, urgente, critico |
| `status_chamado` (carga e disponibilidade) | aberto, em_negociacao, fechado, expirado, cancelado |
| `tipo_proposta` | aceite, contraproposta |
| `status_proposta` | pendente, aceita, recusada, expirada |
| `status_entrega` | aceito, em_transito, entregue, cancelado |
| `status_pagamento` | pendente, retido, liberado, estornado |
| `tipo_chave_pix` | cpf, cnpj, email, telefone, aleatoria |

## Caminho do dinheiro

`proposta aceita` → `frete (aceito)` → empresa paga → `transação (retido)` → motorista marca `em_transito` e depois `entregue` → `transação (liberado)`. A comissão da plataforma é 5% do valor do frete, calculada em centavos inteiros (ver `docs/decisoes-backend.md`).
