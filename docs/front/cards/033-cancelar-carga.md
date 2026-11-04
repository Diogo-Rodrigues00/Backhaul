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
- `400` id inválido · `401` · `403` não é empresa · `404 "carga não encontrada"` (também de outra empresa) · `409 "carga não está aberta"` (fechada, cancelada ou vencida).

O card cria fetcher, hook (`useCancelarCarga`, invalida `cargas.minhas` e `propostas.daCarga(id)`) e handler MSW no formato que estiver em `docs/api.md`.

## Telas / componentes
`src/telas/CorpoPropostasDaCarga.tsx`: botão "Cancelar carga" (variante perigo) **só** com a carga `aberto` e não vencida; `DialogoConfirmacao`: "Cancelar a carga Grãos? Ela sai das buscas e as propostas pendentes serão recusadas. Não dá para desfazer." Botões "Voltar" e "Cancelar carga".

## Arquivos e pastas
`src/api/cargas.ts`, `src/api/cargas.hooks.ts`, `src/api/tipos.ts` (resposta), `mocks/handlers/cargas.ts` (+ `comEstado.ts` se o 046 precisar), `src/telas/CorpoPropostasDaCarga.tsx`, testes em `src/app/__tests__/propostas-da-carga-cancelar.test.tsx`, ajuste em `e2e/propostas-da-carga.spec.ts`.

## Critérios de aceite
- [ ] Botão visível só em carga aberta e não vencida (MVP-21, CT-10).
- [ ] Confirmar + `200` → carga "Cancelada", pendentes "Recusada", sem botões de aceitar/recusar; mudança anunciada.
- [ ] `409` → mensagem da API e recarga da carga e das propostas.
- [ ] `404` → "Carga não encontrada" + link "Minhas cargas" (mesmo estado do 021).
- [ ] Portões do ADR 0013; diálogo carregado sob demanda (sem aumento do JS inicial da rota).

## Testes exigidos
Tela (RNTL + MSW): botão oculto em carga fechada/vencida; 200 com invalidação; 409 com recarga; 404. E2E: cancelar por teclado; axe com o diálogo aberto.

## Checklist de acessibilidade e performance
- [ ] Foco inicial do diálogo em "Voltar" (não na ação destrutiva); foco volta ao título da carga depois de cancelar.
- [ ] "Cancelada" em texto, não só cor.
