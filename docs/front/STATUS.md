# STATUS — Front-end do Backhaul

_Atualizado em 2026-10-20._

## Fase atual
**Fase 1 — Grill do produto**: grill concluído; PRD + MVP em redação (agente `produto`), aguardando aprovação do Pedro

## Fases
| Fase | Estado |
|---|---|
| 0 — Preparação | concluída (PR #13 mergeado em `front`) |
| 1 — Grill do produto | em andamento (grill feito; PRD/MVP em redação) |
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
- [x] PR #13 da preparação mergeado em `front`
- [ ] Expo Go no iPhone do Pedro (**pendente: Pedro**)

## Fase 1 — checklist
- [x] Grill do produto (decisões em `decisoes.md`, origem "Grill F1")
- [ ] `prd.md` e `mvp.md` escritos pelo `produto`
- [ ] Aprovação do Pedro (PRD + MVP)

## Cards por estado
Nenhum ainda.

## Bloqueios
- Skill `react-native-skills` não existe com esse nome; usando `vercel-react-native-skills` (confirmado pelo Pedro).
- Grill da Fase 1 usa `anthropic-skills:grill-me` (escolha do Pedro). Agentes novos só carregam em sessão nova: iniciar com `claude --agent orquestrador`.

## Depende do Pedro
- Instalar Expo Go no iPhone.
- Avisar o Diogo: PR da base (`feat/app-base`) vai para `front` e sai depois do grill do PRD.
- Pedir ao Diogo (ver item abaixo): rotas faltantes (fora do contrato) e inclusão no `CORS_ORIGIN` de `http://localhost:8081` e do domínio da Vercel.
- Aprovações: PRD + MVP (Fase 1); lista de cards (Fase 2); protótipos do designer em Artifact (antes dos cards de tela).
- Mandar ao Diogo: rotas B/C1/C2 e prazos, `CORS_ORIGIN`, ping no `/saude` nos dias de apresentação, seed da demo (texto pronto no fim do grill).
