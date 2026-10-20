# 027 — Motorista: meus fretes e status de entrega

| Campo | Valor |
|---|---|
| Itens MVP | MVP-16, D-PO-07, D-PO-09, CT-09 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — ação de estado com confirmação, atualização automática e anúncio de pagamento |
| Branch | `feat/fretes-motorista` |
| Estimativa | M (≈4 h) |
| Bloqueado por | 011, 012, 013 · PROTO |
| Bloqueia | 035 (se der) |

## Objetivo
`/motorista/fretes`: ver fretes, iniciar transporte, confirmar entrega e acompanhar o pagamento.

## Rotas da API
`GET /fretes/meus` ✅ (forma do motorista, automático), `PATCH /fretes/:id/status` ✅ (200, 400, 404, 409).

## Telas / componentes
- `src/app/motorista/fretes.tsx` com `TemplateLista`, `useMeusFretes({ automatico: true })`, `BotaoAtualizar`.
- `organisms/CartaoFreteMotorista` (FreteCard do DS, com `AndamentoFrete`): `ResumoFrete` + empresa (`empresa.razao_social`); um único botão com `proximoPassoFrete` (D-PO-09) → `DialogoConfirmacao`; nenhum botão de cancelar.
- 200: atualiza o cartão com `status_entrega`, `coleta_em`/`entrega_em`, `status_pagamento` da resposta; invalida `fretes.meus`; anuncia ("Transporte iniciado", "Entrega confirmada").
- 409: mensagem da API e recarga.
- `descreverMudancasFretes`: "Pagamento recebido: Grãos (retido até a entrega)", "Pagamento liberado".

## Arquivos e pastas
`src/app/motorista/fretes.tsx`, `src/components/organisms/CartaoFreteMotorista.tsx`, `src/app/motorista/descreverMudancasFretes.ts`, testes, `e2e/fretes-motorista.spec.ts`, `e2e/rotas.ts`.

## Critérios de aceite
- [ ] Cada frete com tipo, empresa, valor final, status de entrega, coleta/entrega ("—" se nulo), pagamento (D-PO-07) (MVP-16).
- [ ] Um botão com o próximo passo; `entregue` sem botão; nenhum cancelar (MVP-16, D-PO-09).
- [ ] Confirmação + 200 → novo status, datas e pagamento da resposta (MVP-16).
- [ ] Frete `retido` + "Confirmar entrega" 200 → "Liberado ao motorista" (MVP-16).
- [ ] 409 → mensagem e recarga (MVP-16).
- [ ] Vazio: "Nenhum frete ainda" + "Ver minhas propostas" (MVP-16).
- [ ] Pagamento feito pela empresa aparece em ≤ 15 s e é anunciado (MVP-16, CT-09).
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
- Tela (RNTL + MSW): três status, avançar com confirmação, `retido` → `liberado`, 409, 500, 401, vazio; polling e anúncio.
- Playwright: "Iniciar transporte" por teclado com diálogo.

## Checklist de acessibilidade e performance
- [ ] Botão com nome único ("Iniciar transporte de Grãos").
- [ ] Após a ação, foco volta ao cartão do frete.
- [ ] Polling não fecha diálogo aberto.
