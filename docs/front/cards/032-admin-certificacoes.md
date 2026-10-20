# 032 — Admin: aprovar certificações (se der)

| Campo | Valor |
|---|---|
| Itens MVP | MVP-20 |
| Prioridade | **Se der** — só com D4–D5 em `main` + contrato em `docs/api.md` + admin no seed, e se começar antes de 24/10 |
| Agente / modelo | `dev-front` / **haiku** — lista com aprovar/reprovar seguindo o padrão do card 021 (diálogo + invalidação) |
| Branch | `feat/admin-certificacoes` |
| Estimativa | M (≈3 h) |
| Bloqueado por | ROTA-D4-D5 em `main` · admin no seed · 011, 013, 031 · PROTO |
| Bloqueia | — |

## Objetivo
Substituir a tela de D-PO-10 por uma lista de certificações pendentes com "Aprovar" e "Reprovar".

## Rotas da API
Propostas do relatório 4d (seguir `docs/api.md` quando entrar): D4 `GET /admin/certificacoes?status=pendente` → `{ certificacoes: [{ id, motorista: { id, nome_completo }, certificacao: { id, nome }, numero_certificado, validade, validado_por_admin, criado_em }] }`; D5 `PATCH /admin/certificacoes/:id` `{ validado_por_admin: true | false }` → 200. Handlers MSW novos.

## Telas / componentes
`src/app/admin/index.tsx` com `TemplateLista`; cartão com motorista, certificação, número, validade (só data); "Aprovar"/"Reprovar" com `DialogoConfirmacao`.

## Critérios de aceite
- [ ] Todos os critérios de MVP-20 (lista de pendentes, botões com confirmação, item sai da lista após 200, vazio "Nenhuma certificação aguardando aprovação").
- [ ] Verificado com conta de demo: após aprovar, o motorista passa a ver a carga que exige a certificação.
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
Tela (RNTL + MSW): lista, vazio, aprovar, reprovar, 404, 500, 401.

## Checklist de acessibilidade e performance
- [ ] Botões com nome único por item ("Aprovar MOPP de João da Silva").
- [ ] Foco vai ao próximo item (ou ao título) quando o item sai da lista.
