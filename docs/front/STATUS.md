# STATUS — Front-end do Backhaul

_Atualizado em 2026-10-20._

## Fase atual
**Fase 0 — Preparação** (em andamento)

## Fases
| Fase | Estado |
|---|---|
| 0 — Preparação | em andamento |
| 1 — Grill do produto | pendente |
| 2 — Arquitetura e cards | pendente |
| 3 — Fundação | pendente |
| 4 — Execução dos cards | pendente |
| 5 — Fechamento | pendente |

## Fase 0 — checklist
- [x] `git clone`, branch `front` criada e publicada
- [x] `gh` logado (PedroAugusto2208, permissão WRITE), `vercel` logado, Node 22.18, Python 3.12/3.13
- [x] 10 agentes criados em `~/.claude/agents/`
- [x] `app/CLAUDE.md` e estrutura `docs/front/`
- [x] Relatório inicial do `integracao-api`: `relatorio-api-inicial.md`
- [ ] PR da preparação para `front`
- [ ] Expo Go no iPhone do Pedro (**pendente: Pedro**)

## Cards por estado
Nenhum ainda.

## Bloqueios
- Skill `react-native-skills` não existe com esse nome; usando `vercel-react-native-skills` (confirmado pelo Pedro).
- `/mattpocock-skills:grill-me` não aparece na lista de skills; alternativas: `mattpocock-skills:grilling`, `anthropic-skills:grill-me`.

## Depende do Pedro
- Instalar Expo Go no iPhone.
- Avisar o Diogo: PR da base (`feat/app-base`) vai para `front` e sai depois do grill do PRD.
- Pedir ao Diogo: rotas faltantes (fora do contrato) e inclusão no `CORS_ORIGIN` de `http://localhost:8081` e do domínio da Vercel.
- Aprovações: PRD + MVP (Fase 1); lista de cards (Fase 2).
