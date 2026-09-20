# Backhaul

Plataforma de conexão de fretes por urgência — conecta caminhoneiros disponíveis a cargas urgentes próximas, reduzindo o percentual de retorno vazio no transporte rodoviário.

> Documentação completa do projeto (justificativa, objetivo, escopo, riscos) está em [`docs/termo_abertura.md`](docs/termo_abertura.md).

## Estrutura do repositório

```
backhaul/
├── database/
│   ├── schema.sql          # script SQL de criação do banco (DDL)
│   └── modelo_er.png       # diagrama entidade-relacionamento
├── docs/
│   ├── termo_abertura.md   # justificativa, objetivo, escopo, riscos, equipe
│   ├── cronograma.md       # planejamento CP-1 a CP-5
│   └── atas/               # atas de reunião semanais
└── README.md               # este arquivo
```

## Status atual — Checkpoint 1 (Banco de Dados)

**Concluído**
- [x] Modelagem do banco (11 tabelas)
- [x] Script SQL de criação, versionado no GitHub (2 commits mostrando evolução)
- [x] Extensões PostgreSQL + PostGIS instaladas e funcionando
- [x] Diagrama ER
- [x] Termo de abertura, cronograma e atas (S03/S04) em `/docs`

**Em andamento**
- [ ] Script de dados de exemplo (INSERTs)
- [ ] README explicando as tabelas (`database/README.md`)
- [ ] Board/Kanban configurado no GitHub
- [ ] Atas preenchidas com dados reais das reuniões (participantes, horário)

## Quem faz o quê agora

| Responsável | Tarefa | Status |
|---|---|---|
| Diogo | Script SQL de dados de exemplo (INSERTs) | 🔄 Em andamento |
| guilherme508 | README explicando tabelas e relacionamentos | ⏳ A fazer |
| MateuHuTv | Configurar Board/Kanban no GitHub (Issues + labels) | ⏳ A fazer |
| GustavoF | Preencher atas reais (S03/S04) + revisar cronograma | ⏳ A fazer |
| PedroAugusto2208 | Apoio geral e revisão da entrega do checkpoint | ⏳ A fazer |

Essa tabela é atualizada a cada checkpoint — ver histórico completo de decisões em [`docs/termo_abertura.md`](docs/termo_abertura.md#8-equipe-e-responsabilidades).

## Stack técnica

- **Apps:** React Native
- **Backend:** Node.js + TypeScript
- **Banco de dados:** PostgreSQL + PostGIS
- **Nuvem:** AWS

## Como contribuir (fluxo básico do grupo)

1. Antes de começar, rode `git pull` pra garantir que está com a versão mais atual.
2. Faça sua parte (arquivo, código, documento).
3. `git add <arquivo(s)>`
4. `git commit -m "mensagem clara descrevendo o que foi feito"`
5. `git push`

Se dois membros mexerem no mesmo arquivo ao mesmo tempo, o Git pode acusar conflito — nesse caso, avisa no grupo antes de forçar qualquer coisa.
