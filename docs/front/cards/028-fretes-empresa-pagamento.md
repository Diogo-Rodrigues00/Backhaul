# 028 — Empresa: meus fretes e pagamento simulado

| Campo | Valor |
|---|---|
| Itens MVP | MVP-17, D-PO-06, D-PO-07, RNF-11, CT-09, Q3 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — pagamento com exibição exata da comissão da API, confirmação e atualização automática |
| Branch | `feat/fretes-empresa` |
| Estimativa | M (≈4 h) |
| Bloqueado por | 011, 012, 013 · PROTO |
| Bloqueia | 035 (se der) |

## Objetivo
`/empresa/fretes`: acompanhar a entrega e pagar pela plataforma, vendo a comissão **exatamente** como a API devolver.

## Rotas da API
`GET /fretes/meus` ✅ (forma da empresa, automático), `POST /fretes/:id/pagamento` ✅ (201, 400, 404, 409 `frete já foi pago` / `frete cancelado não pode ser pago`).

## Telas / componentes
- `src/app/empresa/fretes.tsx` com `TemplateLista`, `useMeusFretes({ automatico: true })`, `BotaoAtualizar`; vazio com link "Minhas cargas".
- `organisms/CartaoFreteEmpresa` (FreteCard do DS): `ResumoFrete` + `ResumoMotorista` (nome, veículo, placa); "Pagar frete" só com `status_pagamento === null` (qualquer `status_entrega`).
- Confirmação (`DialogoConfirmacao`): mostra o valor final e o texto "A comissão é calculada pela plataforma após o pagamento." Nenhum percentual ou valor de comissão antes da resposta (D-PO-06).
- 201: `molecules/ResumoPagamento` (PaymentSummary do DS: cabeçalho asfalto + lista de fatos; recebe o foco e anuncia "Pagamento registrado") com `valor_frete`, `percentual_comissao` (`formatarPercentual`), `valor_comissao`, `status_pagamento` da resposta; anunciado; o cartão passa a mostrar o novo status. Após recarregar, a lista mostra só o status (Q3: `GET /fretes/meus` não traz comissão).
- `descreverMudancasFretesEmpresa`: "Transporte iniciado: …", "Entrega confirmada: …".

## Arquivos e pastas
`src/app/empresa/fretes.tsx`, `src/components/organisms/CartaoFreteEmpresa.tsx`, `src/components/molecules/ResumoPagamento.tsx`, `src/app/empresa/descreverMudancasFretes.ts`, testes, `e2e/fretes-empresa.spec.ts`, `e2e/rotas.ts`.

## Critérios de aceite
- [ ] Cada frete com tipo, motorista (nome, veículo, placa), valor final, status de entrega, coleta/entrega, pagamento (MVP-17).
- [ ] "Pagar frete" só com pagamento `null`, com confirmação sem prévia de comissão (MVP-17, D-PO-06).
- [ ] 201 → resumo com os 4 campos **exatamente** da resposta (ex.: "5%" se vier 5.00) (MVP-17).
- [ ] 409 → mensagem e recarga (MVP-17).
- [ ] Nenhuma constante de comissão no código (`npm run verificar:proibidos` verde) (MVP-17, RNF-11).
- [ ] Vazio: "Nenhum frete ainda. Aceite uma proposta para criar um frete." + "Minhas cargas" (MVP-17).
- [ ] Mudança de status de entrega feita pelo motorista aparece em ≤ 15 s e é anunciada (MVP-17, CT-09).
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
- Tela (RNTL + MSW): pagar (resumo com valores da fixture, incluindo percentual diferente de 5 para provar que nada é fixo), os dois 409, 500, 401, vazio; polling e anúncio.
- Playwright: pagar por teclado.

## Checklist de acessibilidade e performance
- [ ] Resumo do pagamento recebe foco ou é anunciado.
- [ ] Valores com rótulo explícito ("Comissão da plataforma: R$ 175,00").
- [ ] Lighthouse 100 com 6 fretes na fixture.
