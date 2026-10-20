# 033 — Empresa: cancelar carga (se der)

| Campo | Valor |
|---|---|
| Itens MVP | MVP-21 |
| Prioridade | **Se der** — só com C1 em `main` + contrato em `docs/api.md`, e se começar antes de 24/10 |
| Agente / modelo | `dev-front` / **haiku** — um botão com diálogo e invalidação sobre tela existente |
| Branch | `feat/cancelar-carga` |
| Estimativa | P (≈2 h) |
| Bloqueado por | ROTA-C1 em `main` · 011, 021 · PROTO |
| Bloqueia | — |

## Objetivo
Botão "Cancelar carga" na tela de propostas da carga.

## Rotas da API
C1 (relatório 4c; seguir `docs/api.md` quando entrar): `POST /cargas/:id/cancelar` sem corpo → 200 `{ carga: { id, status: 'cancelado' } }`; 409 `carga não está aberta`; 404. Handler MSW novo.

## Telas / componentes
`src/app/empresa/cargas/detalhe.tsx`: botão "Cancelar carga" (variante perigo) só em carga aberta e não vencida; `DialogoConfirmacao` informando que as propostas pendentes serão recusadas.

## Critérios de aceite
- [ ] Todos os critérios de MVP-21 (visibilidade do botão, 200 → "Cancelada" e pendentes "Recusada", 409 com recarga).
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
Tela (RNTL + MSW): botão oculto em carga fechada/vencida, 200 com invalidação de `cargas.minhas` e `propostas.daCarga`, 409.

## Checklist de acessibilidade e performance
- [ ] Foco inicial do diálogo em "Cancelar" (não na ação destrutiva).
- [ ] Mudança de status anunciada.
