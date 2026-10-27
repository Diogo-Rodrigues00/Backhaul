# 034 — Motorista: cancelar disponibilidade (se der)

| Campo | Valor |
|---|---|
| Itens MVP | MVP-22 |
| Prioridade | **Se der** — só com C2 em `main` + contrato em `docs/api.md`, e se começar antes de 24/10 |
| Agente / modelo | `dev-front` / **haiku** — um botão com diálogo sobre tela e provider existentes |
| Branch | `feat/cancelar-disponibilidade` |
| Estimativa | P (≈2 h) |
| Bloqueado por | ROTA-C2 em `main` · 011, 022 · PROTO |
| Bloqueia | — |

## Objetivo
Botão "Cancelar disponibilidade" em "Minhas disponibilidades".

## Rotas da API
C2 (relatório 4c; seguir `docs/api.md` quando entrar): `POST /disponibilidades/:id/cancelar` → 200 `{ disponibilidade: { id, status: 'cancelado' } }`; 409 `disponibilidade não está aberta`; 404. Handler MSW novo.

## Telas / componentes
`CartaoDisponibilidade`: botão "Cancelar disponibilidade" só em aberta e não vencida, com `DialogoConfirmacao`. Se era a ativa, o provider recalcula (próxima ativa ou nenhuma → D-PO-04 em "Cargas próximas").

## Critérios de aceite
- [ ] Todos os critérios de MVP-22.
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
Tela (RNTL + MSW): botão visível só quando permitido, 200 com troca da ativa, 409 com recarga.

## Checklist de acessibilidade e performance
- [ ] Nome único do botão por item; foco inicial em "Cancelar" no diálogo.
- [ ] Troca de ativa anunciada.
