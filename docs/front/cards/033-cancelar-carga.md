# 033 — Empresa: cancelar carga

## Revisão 2026-11-04
- O contrato de referência agora é o **P1/A1** de `docs/front/pedido-ao-diogo.md` (substitui o "C1" do relatório 4c). A rota **ainda não existe** na `main` nem em `docs/api.md`.
- **Só executa** com a rota em `main` **e** documentada em `docs/api.md`. Se o contrato real divergir do P1, vale o `docs/api.md` (atualizar este card antes de começar e avisar o orquestrador).
- Sem a rota: card fica "bloqueado externo"; não há plano B (sem botão "Cancelar carga" na demo).
- PROTO saiu dos bloqueios: é um botão de perigo + `DialogoConfirmacao` numa tela já aprovada, seguindo o design system. 011 e 021 já estão em `front`.
- Arquivos atualizados para a estrutura atual (`src/telas/CorpoPropostasDaCarga.tsx`).

| Campo | Valor |
|---|---|
| Itens MVP | MVP-21 |
| Prioridade | Fase 6 (condicional à rota) |
| Agente / modelo | `dev-front` / **haiku** — um botão com diálogo e invalidação sobre tela existente |
| Branch | `feat/033-cancelar-carga` |
| Estimativa | P (≈2 h) |
| Bloqueado por | **ROTA-P1** (em `main` + `docs/api.md`) |
| Bloqueia | — |
| Onda | 2 (só se a rota existir) |

## Objetivo
Botão "Cancelar carga" na tela de propostas da carga, para a empresa tirar do ar uma carga aberta.

## Rotas da API
**P1 (proposta, conferir em `docs/api.md`)**: `POST /cargas/:id/cancelar`, sem corpo. Numa transação: carga → `cancelado`; propostas `pendente` da carga → `recusada`.
- `200 { "carga": { "id": "uuid", "status": "cancelado" } }`
- `400` id inválido · `401` · `403` não é empresa · `404 "carga não encontrada"` (também de outra empresa) · `409 "carga não está mais aberta"` (fechada, cancelada ou vencida).

O card cria fetcher, hook (`useCancelarCarga`, invalida `cargas.minhas` e `propostas.daCarga(id)`) e handler MSW no formato que estiver em `docs/api.md`.

## Telas / componentes
`src/telas/CorpoPropostasDaCarga.tsx`: botão "Cancelar carga" (variante perigo) **só** com a carga `aberto` e não vencida; `DialogoConfirmacao`: "Cancelar a carga Grãos? Ela sai das buscas e as propostas pendentes serão recusadas. Não dá para desfazer." Botões "Voltar" e "Cancelar carga".

## Arquivos e pastas
`src/api/cargas.ts`, `src/api/cargas.hooks.ts`, `src/api/tipos.ts` (resposta), `src/telas/CorpoPropostasDaCarga.tsx`, `src/components/molecules/EstadoVazio.tsx` e `src/components/molecules/ResumoCarga.tsx` (prop `refTitulo` para o foco), testes em `src/app/__tests__/propostas-da-carga-cancelar.test.tsx` e `src/components/molecules/ResumoCarga.test.tsx`, ajuste em `e2e/propostas-da-carga.spec.ts` (busca "Cancelar" exato).

**Handler MSW**: feito em `mocks/handlers/comEstado.ts` (`POST /cargas/:id/cancelar` e `expirado` em `GET /cargas/minhas`), **não** em `mocks/handlers/cargas.ts`. Os testes de tela usam `servidor.use` com o mesmo formato, porque o `servidor` padrão não carrega o `comEstado`.

## Critérios de aceite
- [x] Botão visível só em carga aberta e não vencida (MVP-21, CT-10). Testes de tela em `propostas-da-carga-cancelar.test.tsx`.
- [x] Confirmar + `200` → carga "Cancelada", pendentes "Recusada", sem botões de aceitar/recusar; mudança anunciada. Testes de tela (200) e `comEstado.test.ts`.
- [x] `409` → mensagem da API e recarga da carga e das propostas. Teste de tela (409).
- [x] `404` → "Carga não encontrada" + link "Minhas cargas" (mesmo estado do 021). Teste de tela (404).
- [ ] Portões do ADR 0013; diálogo carregado sob demanda (sem aumento do JS inicial da rota). **Parcial**: lint, typecheck, Prettier, Jest, verificar:proibidos, orçamento (347,6 KiB < 360 KiB) e E2E de propostas da carga passaram. Não rodei Lighthouse CI nem o E2E completo; não comparei o orçamento com a base.

## Testes exigidos
Tela (RNTL + MSW): botão oculto em carga fechada/vencida; 200 com invalidação; 409 com recarga; 404. Foco após 200, 409 e 404 (alvo do `moverFoco`). Cobertos.

**PENDÊNCIA (não implementada nesta entrega)**: E2E de cancelar por teclado e axe com o diálogo aberto no E2E. A conferência manual feita nesta sessão (Chromium, 320 px e 1280 px, claro e escuro) deu 0 violações de axe com o diálogo aberto, mas isso não substitui o E2E no `e2e/` da CI.

## Checklist de acessibilidade e performance
- [x] Foco inicial do diálogo em "Voltar" (não na ação destrutiva), testado no DOM em `DialogoConfirmacao.dom.test.tsx`. Foco ao fechar: título da carga após 200 e 409; título "Carga não encontrada" após 404 (testado em `propostas-da-carga-cancelar.test.tsx`).
- [x] "Cancelada" em texto, não só cor (etiqueta com texto; testado).
