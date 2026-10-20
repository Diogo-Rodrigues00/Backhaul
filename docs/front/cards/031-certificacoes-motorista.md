# 031 — Motorista: minhas certificações (se der)

| Campo | Valor |
|---|---|
| Itens MVP | MVP-19 |
| Prioridade | **Se der** — só executa com D1–D3 em `main` + contrato em `docs/api.md`, e se começar antes de 24/10 |
| Agente / modelo | `dev-front` / **sonnet** — tela nova com listagem, formulário com data de validade e edição que reabre aprovação |
| Branch | `feat/certificacoes-motorista` |
| Estimativa | M (≈4 h) |
| Bloqueado por | ROTA-D1-D3 em `main` · 009, 012, 013 · PROTO |
| Bloqueia | 032 |

## Objetivo
`/motorista/certificacoes`: cadastrar e acompanhar MOPP/ONU.

## Rotas da API
Propostas do relatório 4d (usar o contrato que entrar em `docs/api.md`; se divergir do relatório, seguir `docs/api.md`):
- D1 `GET /motorista/certificacoes` → `{ certificacoes: [{ id, certificacao_id, nome, classificacao_onu, numero_certificado, validade: 'YYYY-MM-DD', validado_por_admin, criado_em }] }`.
- D2 `POST /motorista/certificacoes` `{ certificacao_id, numero_certificado (≤ 60), validade: 'YYYY-MM-DD' futura }` → 201; 409 `certificação já cadastrada`.
- D3 `PUT /motorista/certificacoes/:id` `{ numero_certificado, validade }` → 200 (volta a não aprovada).
- `GET /certificacoes` ✅.
Handlers MSW novos em `mocks/handlers/certificacoes.ts` (testes).

## Telas / componentes
Lista (nome, número, validade só data, "Aguardando aprovação"/"Aprovada"); formulário (certificação de `GET /certificacoes`, número, validade). Validade: três campos numéricos dia/mês/ano (evita seletor de data, como D-PO-02) montando `YYYY-MM-DD`. Editar avisa que volta para "Aguardando aprovação". Link no cabeçalho do motorista.

## Critérios de aceite
- [ ] Todos os critérios de MVP-19 (lista, cadastro com 201 "Aguardando aprovação", 409 com opção de editar, aviso na edição, vazio).
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
Tela (RNTL + MSW): lista, vazio, cadastro, validade no passado bloqueada, 409, edição, 500, 401. Playwright: cadastro por teclado.

## Checklist de acessibilidade e performance
- [ ] Campos de data com rótulos "Dia", "Mês", "Ano" agrupados com nome "Validade".
- [ ] Rota nova em `e2e/rotas.ts` com Lighthouse 100.
