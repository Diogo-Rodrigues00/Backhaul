# STATUS — Front-end do Backhaul

_Atualizado em 2026-10-20._

## Fase atual
**Fase 3/4 — Fundação e execução dos cards** (Fase 2 aprovada em 2026-10-20)

## Fases
| Fase | Estado |
|---|---|
| 0 — Preparação | concluída (PR #13 mergeado em `front`) |
| 1 — Grill do produto | concluída (PRD + MVP aprovados em 2026-10-20) |
| 2 — Arquitetura e cards | concluída (cards, ADRs, DS e protótipo aprovados) |
| 3 — Fundação | em andamento (card 001) |
| 4 — Execução dos cards | pendente |
| 5 — Fechamento | pendente |

## Fase 0 — checklist
- [x] `git clone`, branch `front` criada e publicada
- [x] `gh` logado (PedroAugusto2208, permissão WRITE), `vercel` logado, Node 22.18, Python 3.12/3.13
- [x] 10 agentes criados em `~/.claude/agents/`
- [x] `app/CLAUDE.md` e estrutura `docs/front/`
- [x] Relatório inicial do `integracao-api`: `relatorio-api-inicial.md`
- [x] PR #13 da preparação mergeado em `front`
- [ ] Expo Go no iPhone do Pedro (**pendente: Pedro**)

## Fase 1 — checklist
- [x] Grill do produto (decisões em `decisoes.md`, origem "Grill F1")
- [x] `prd.md` e `mvp.md` escritos pelo `produto`
- [x] Aprovação do Pedro (PRD + MVP)

## Fase 2 — checklist
- [x] ADRs e estrutura de pastas (tech-lead)
- [x] Lista de cards com dependências e modelo (tech-lead)
- [x] Design system + protótipos (designer, adiantado)
- [x] Aprovação do Pedro: lista de cards
- [x] Aprovação do Pedro: protótipos (Artifact)
- [x] Issues criadas no GitHub (#16–#50)

## Cards por estado
Lista completa em `cards/README.md`.

| Estado | Cards |
|---|---|
| Em execução | 001 |
| Prontos para começar (após 001) | 002, 003, 004, 006 · 005 e 008 dependem só da cadeia · 007 espera LISTA |
| Mergeados | — |

Issues: cards 001–035 = issues #16–#50 (label `front` + `mvp`/`se der`; ordem do `cards/README.md`). Ex.: 001 = #16, 002 = #17, 013 = #28, 024 = #42, 025 = #43.

Protótipo aprovado: https://claude.ai/artifact/VDeLDcq1BYMsMwfJVEV6sP

## Bloqueios
- Skill `react-native-skills` não existe com esse nome; usando `vercel-react-native-skills` (confirmado pelo Pedro).
- Grill da Fase 1 usa `anthropic-skills:grill-me` (escolha do Pedro). Agentes novos só carregam em sessão nova: iniciar com `claude --agent orquestrador`.

## Depende do Pedro
- Instalar Expo Go agora, desligar atualização automática de apps até 12/11, logar na mesma conta Expo no iPhone e no CLI.
- Para usar GitHub Projects: `gh auth refresh -s read:project,project` (o token atual não tem o escopo).
- Lista de cidades com lat/lng (membros do grupo) até 21/10: bloqueia o card 007.
- Instalar Expo Go no iPhone.
- Avisar o Diogo: PR da base (`feat/app-base`) vai para `front` e sai depois do grill do PRD.
- Pedir ao Diogo (ver item abaixo): rotas faltantes (fora do contrato) e inclusão no `CORS_ORIGIN` de `http://localhost:8081` e do domínio da Vercel.
- Aprovações: PRD + MVP (Fase 1); lista de cards (Fase 2); protótipos do designer em Artifact (antes dos cards de tela).
- Mandar ao Diogo: rotas B/C1/C2 e prazos, `CORS_ORIGIN`, ping no `/saude` nos dias de apresentação, seed da demo (texto pronto no fim do grill).
