# 034 — Motorista: cancelar disponibilidade

## Revisão 2026-11-04
- O contrato de referência agora é o **P2/A2** de `docs/front/pedido-ao-diogo.md` (substitui o "C2" do relatório 4c): também recusa as propostas **pendentes** feitas com a disponibilidade. A rota **ainda não existe** na `main` nem em `docs/api.md`.
- **Só executa** com a rota em `main` **e** documentada em `docs/api.md`. Se o contrato real divergir do P2, vale o `docs/api.md` (atualizar este card antes de começar).
- **Novo:** enquanto `GET /disponibilidades/minhas` (4b/A3) não existir, a lista vem do **plano B local**; cancelar precisa **apagar a cópia guardada no aparelho** e o provider recalcula a ativa.
- PROTO saiu dos bloqueios (botão de perigo + diálogo em tela já existente). 011 e 022 já estão em `front`.

| Campo | Valor |
|---|---|
| Itens MVP | MVP-22 |
| Prioridade | Fase 6 (condicional à rota) |
| Agente / modelo | `dev-front` / **haiku** — botão com diálogo sobre tela e provider existentes (sobe para sonnet se o provider precisar de mais que uma função nova) |
| Branch | `feat/034-cancelar-disponibilidade` |
| Estimativa | P (≈2 h) |
| Bloqueado por | **ROTA-P2** (em `main` + `docs/api.md`) |
| Bloqueia | — |
| Onda | 2 (só se a rota existir) |

## Objetivo
Botão "Cancelar disponibilidade" em "Minhas disponibilidades", para o motorista sair da busca.

## Rotas da API
**P2 (proposta, conferir em `docs/api.md`)**: `POST /disponibilidades/:id/cancelar`, sem corpo → status `cancelado`; propostas `pendente` feitas com ela → `recusada`.
- `200 { "disponibilidade": { "id": "uuid", "status": "cancelado" } }`
- `400` · `401` · `403` · `404 "disponibilidade não encontrada"` (também de outro motorista) · `409 "disponibilidade não está aberta"`.

O card cria fetcher, hook (invalida `disponibilidades.minhas`, `propostas.minhas`, `cargas.proximas`) e handler MSW no formato de `docs/api.md`.

## Telas / componentes
- `src/components/organisms/CartaoDisponibilidade.tsx`: botão "Cancelar disponibilidade" só em aberta e não vencida; `DialogoConfirmacao` ("Cancelar esta disponibilidade? Você sai da busca e as propostas pendentes feitas com ela serão recusadas.").
- `src/state/disponibilidade-ativa/DisponibilidadeAtivaProvider.tsx` (+ `DisponibilidadeAtivaContext.ts`): função `marcarCancelada(id)` (ou `descartar(id)`) que, no plano B (`origem === 'local'`), apaga a cópia guardada; em qualquer origem, a ativa é recalculada (próxima aberta e no prazo, ou nenhuma → "Cargas próximas" pede para publicar, D-PO-04).

## Arquivos e pastas
`src/api/disponibilidades.ts`, `.hooks.ts`, `src/api/tipos.ts`, `mocks/handlers/disponibilidades.ts`, `CartaoDisponibilidade.tsx`, `src/app/motorista/disponibilidades/index.tsx` (ou o corpo dela), provider e `lib/disponibilidadeAtiva.ts` se a função de armazenamento estiver lá, testes.

## Critérios de aceite
- [ ] Botão só em disponibilidade aberta e não vencida (MVP-22).
- [ ] `200` → "Cancelada" no cartão; se era a ativa, a ativa troca (ou some) e a troca é anunciada.
- [ ] Plano B: depois de cancelar, recarregar a página **não** traz a disponibilidade de volta como ativa.
- [ ] `409` → mensagem da API e recarga; `404` → mensagem e recarga.
- [ ] Portões do ADR 0013; JS inicial da rota sem aumento.

## Testes exigidos
Tela (RNTL + MSW): botão visível só quando permitido; 200 com troca da ativa (origem `api` e origem `local`); 409; armazenamento local apagado no plano B.

## Checklist de acessibilidade e performance
- [ ] Nome único do botão por item ("Cancelar disponibilidade em Uberlândia - MG"); foco inicial em "Voltar" no diálogo.
- [ ] Troca da ativa anunciada sem mover o foco.
