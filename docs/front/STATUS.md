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
| Em revisão/merge | 005 Tema (PR #57: CI verde, sem conflito; espera decisão do Pedro sobre o limite de JS) |
| Aguardando | 008 Atoms (espera 005) · 007 Cidades (espera LISTA de cidades do grupo) · demais cards seguem as ondas do `cards/README.md` |
| Mergeados | 001 (#51), 006 (#53), 004 (#59), 003 (#58), 002 (#54); issues #16–#19 e #21 fechadas |

Issues: cards 001–035 = issues #16–#50 (label `front` + `mvp`/`se der`; ordem do `cards/README.md`). Ex.: 001 = #16, 002 = #17, 013 = #28, 024 = #42, 025 = #43.

Protótipo aprovado: https://claude.ai/artifact/VDeLDcq1BYMsMwfJVEV6sP

## Notas para os próximos cards (auditoria do 001)
- 002/003: `serve dist` não entrega `+not-found.html` e Lighthouse aborta com 404 real; CI precisa de servidor/rewrite que sirva a página do app; decidir se `/_sitemap` vai para produção; `public/.gitkeep` vira `/.gitkeep`.
- 005/010: `ScrollViewStyleReset` põe `body{overflow:hidden}`: telas altas precisam de `ScrollView` (zoom 200%). Foco visível e alvo ≥ 24 px a cargo dos atoms (008).
- RNTL 14: `renderRouter` é assíncrono; `getByRole` não acha landmarks em `View`.
- `<title>` por rota via `<Head>` (não no `+html.tsx`), por causa do title vazio do SDK 57.

## Decisão pendente do Pedro: limite de JS inicial
Hoje (front): 297.078 bytes. Com o tema (005): 300.296 bytes (+3.218). O CI aceita até 307.200 (300 KiB). Os cards 013 e 014 (sessão + TanStack Query no layout raiz) somam ~13 KB e estouram 300 KiB.
- (a) recomendado: 320 KiB (327.680 bytes) para a infraestrutura comum; telas nunca aumentam o JS inicial.
- (b) 300 KiB com exceção só para o tema; 013/014 exigem reestruturar o carregamento.
- (c) regra estrita: o tema volta para tirar os 3 KB.
Ao decidir: ajustar `ORCAMENTO_JS_INICIAL_BYTES` (scripts/orcamento-bundle.mjs), ADR 0011 (adendo) e `decisoes.md`.

## Ações do Pedro (produção)
- `vercel deploy --prod --yes` na raiz, com `front` atualizado (hoje `backhaul-front.vercel.app` serve build de teste com mock).
- Settings > Deployment Protection na Vercel: desligar "Vercel Authentication".
- Pedir ao Diogo: domínio da Vercel no `CORS_ORIGIN`; app da Vercel autorizado no repositório (preview por PR).
- Proteção da branch `front`: comando no PR #54. Cuidado: o CI só roda com mudança em `app/**`; PR só de docs fica sem checks.

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
