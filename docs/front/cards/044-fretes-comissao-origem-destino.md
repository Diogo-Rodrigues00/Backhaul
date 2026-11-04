# 044 — Comissão, `proposta_id`, origem e destino em "Meus fretes"

| Campo | Valor |
|---|---|
| Itens | MVP-16, MVP-17 (dívida "comissão some ao recarregar") |
| Tipo | feature |
| Agente / modelo | `dev-front` / **haiku** — campos novos em tipos e cartões existentes, sem tela nova |
| Branch | `feat/044-fretes-comissao` |
| Estimativa | M (≈3 h) |
| Bloqueado por | **ROTA-P4** (extensão de `GET /fretes/meus` em `main` + `docs/api.md`) |
| Bloqueia | mapa em fretes (extensão do 035), chat a partir do frete (extensão do 043) |
| Onda | 2 (só se a rota existir) |

## Objetivo
Com o P4, mostrar sempre a comissão do frete da empresa (não só logo depois de pagar), a rota origem → destino nos dois lados e preparar o `proposta_id` para chat e mapa a partir do frete. **Sem P4, não executar**: o comportamento atual (comissão só logo após pagar) continua.

## Rotas da API
**P4/A4 (proposta, conferir em `docs/api.md` antes de começar)**: `GET /fretes/meus` ganha, em cada item, `proposta_id`, `origem` e `destino` (`{lat,lng}`) e, **só para a empresa**, `comissao: { percentual_comissao, valor_comissao, status_pagamento } | null` (null antes do pagamento). Se o contrato real divergir, vale o `docs/api.md` (atualizar este card e avisar o orquestrador).

## Telas / componentes
- `src/api/tipos.ts`: `FreteBase` com `proposta_id`, `origem`, `destino`; `FreteDaEmpresa` com `comissao`.
- `mocks/fixtures/fretes.ts`, `mocks/handlers/fretes.ts` e o mock com estado (`comEstado.ts`) no formato novo.
- `src/telas/CorpoFretesDaEmpresa.tsx` + `CartaoFreteEmpresa.tsx`/`ResumoPagamento.tsx`: comissão vinda de `frete.comissao` (percentual e valor **da API**); apagar o estado local que guardava a transação só até recarregar.
- `CartaoFreteMotorista.tsx` e `CartaoFreteEmpresa.tsx`: `LinhaRota` com origem → destino (nome da cidade pela lista fixa, `lib/cidades.ts`).
- Chat e mapa a partir do frete: **não** neste card; abrir card próprio se o Pedro quiser (o `proposta_id` já fica disponível).

## Critérios de aceite
- [ ] Empresa: recarregar a página depois de pagar mantém percentual, valor da comissão e situação do pagamento, todos da API.
- [ ] Antes do pagamento (`comissao: null`): nada de comissão inventada; o botão "Pagar frete" segue como hoje.
- [ ] Origem → destino em texto nos cartões dos dois lados.
- [ ] `verificar:proibidos` passa (nenhuma comissão fixa).
- [ ] Portões do ADR 0013; orçamento sem aumento.

## Testes exigidos
- Tela (RNTL + MSW): empresa com frete pago (comissão da API), não pago (`null`), recarregar mantém; motorista com origem/destino.
- E2E: `e2e/fretes-empresa.spec.ts` pagar → recarregar → comissão continua.

## Checklist de acessibilidade e performance
- [ ] Comissão com rótulo claro ("Comissão da plataforma (5%)" com o percentual vindo da API, nunca escrito no código).
- [ ] Rota em texto com seta acessível (`LinhaRota` já resolve).
