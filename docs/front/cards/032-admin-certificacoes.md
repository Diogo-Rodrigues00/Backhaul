# 032 — Admin: aprovar certificações

## Revisão 2026-11-04
- **Deixou de ser "se der"**: as rotas existem na `main` com contrato em `docs/api.md`, diferentes da proposta 4d:
  - D4 `GET /admin/certificacoes?status=pendente` → **`GET /certificacoes/pendentes`** (só pendentes, mais antigas primeiro). `certificacao` é o **nome em texto** (não objeto). O `motorista` vem com **`cpf` e `cnh`**: a UI **nunca** exibe, loga ou guarda (pedido P7/D ao Diogo para tirá-los).
  - D5 `PATCH /admin/certificacoes/:id` → **`POST /certificacoes/pendentes/:id/responder`** com `{ acao: "aprovar" | "recusar" }`. **Recusar apaga o registro** (o motorista pode reenviar). `404` quando já foi decidida.
- **Não substitui mais `/admin`**: a casca e o resumo do admin são do card **040**; esta tela vira `/admin/certificacoes` com item próprio no menu do admin.
- **Consome as peças do `integracao-api`** (`feat/contrato-fase6`): tipos, fetchers, hooks, chaves e MSW das duas rotas. Não recriar. O fetcher de `GET /certificacoes/pendentes` deve **descartar `cpf` e `cnh`** ao ler a resposta; se o INT não fizer, este card faz (com teste).
- O E2E "motorista envia → admin aprova → motorista vê Aprovada e a carga com exigência" **passa para o 046** (precisa do mock com estado e de duas sessões). Aqui fica o E2E só do admin.
- Bloqueios: 011 e 013 já em `front`; agora **040**, **INT** e **PROTO**. O 031 deixou de ser bloqueio técnico (continua desejável antes, pela demo).

| Campo | Valor |
|---|---|
| Itens MVP | MVP-20 |
| Prioridade | Fase 6 |
| Agente / modelo | `dev-front` / **haiku** — lista com ação confirmada por diálogo, mesmo padrão do 021 (diálogo + invalidação + foco) |
| Branch | `feat/032-admin-certificacoes` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 040 · INT · PROTO (039) |
| Bloqueia | 045, 046 |
| Onda | 2 |

## Objetivo
`/admin/certificacoes`: o admin vê a fila de certificações pendentes e aprova ou recusa cada uma, sem nunca ver documento pessoal do motorista.

## Rotas da API
- `GET /certificacoes/pendentes` ✅ (só admin): `{ certificacoes: [{ id, certificacao: 'MOPP - Classe 3 Inflamáveis', numero_certificado, validade: 'AAAA-MM-DD', criado_em, motorista: { id, nome_completo, cpf, cnh, veiculo_placa } }] }`. Erros: 401 · 403.
- `POST /certificacoes/pendentes/:id/responder` ✅: `{ acao }` → `200 { certificacao: { id, validado_por_admin: true } }` (aprovar) ou `200 { certificacao: { id, recusada: true } }` (recusar). Erros: 400 · 401 · 403 · `404 "certificação pendente não encontrada"`.

## Telas / componentes
- `src/app/admin/certificacoes.tsx`: casca (`h1` "Certificações pendentes", `CorpoSobDemanda`).
- `src/telas/CorpoCertificacoesPendentes.tsx` + `.carregar.ts`: `TemplateLista`, botão "Atualizar" (sem atualização automática), `DialogoConfirmacao`.
- `src/components/organisms/CartaoCertificacaoPendente.tsx`: **somente** nome do motorista (`h3`), certificação, número, validade (só data), placa e data do envio; botões "Aprovar" e "Recusar".
- Diálogos: aprovar ("Aprovar MOPP de João da Silva? O motorista passa a ver cargas que exigem essa certificação."); recusar ("Recusar … ? O envio é apagado e o motorista pode mandar de novo.").
- `itensDaArea.ts`: admin ganha `{ href: '/admin/certificacoes', rotulo: 'Certificações', icone: 'shield-check' }`.

## Arquivos e pastas
Os acima + testes (`src/app/__tests__/admin-certificacoes.test.tsx`, `CartaoCertificacaoPendente.test.tsx`), `e2e/admin-certificacoes.spec.ts`, `e2e/rotas.ts` (`{ caminho: '/admin/certificacoes', perfil: 'admin' }`). Fixture com 4 pendentes (CPF/CNH presentes na fixture, para provar que não aparecem).

## Passos
1. Conferir o fetcher do INT: o tipo devolvido não tem `cpf`/`cnh`. Se tiver, mapear no fetcher (`motorista: { id, nome_completo, veiculo_placa }`) e testar.
2. Cartão, corpo, diálogos, invalidação (`certificacoes.pendentes` e `admin.resumo`).
3. Menu, rota, E2E.

## Critérios de aceite
- [ ] Lista na ordem da API (mais antigas primeiro) com nome, certificação, número, validade (só data) e placa (MVP-20).
- [ ] **CPF e CNH não aparecem** na tela, no HTML, no cache do TanStack nem em `console` (teste procura os valores da fixture).
- [ ] Aprovar/Recusar só depois do diálogo; `200` → item sai da lista, mensagem anunciada ("Certificação aprovada" / "Certificação recusada").
- [ ] `404` (já decidida por outro admin) → aviso "Essa certificação já foi decidida." e a lista recarrega.
- [ ] Vazio: "Nenhuma certificação aguardando aprovação".
- [ ] 500/rede → `EstadoErro` com "Tentar de novo"; 401 → login; 403 (não admin) → guarda da área já trata.
- [ ] Item "Certificações" no menu do admin; rota em `e2e/rotas.ts`; Portões do ADR 0013; JS inicial ≤ 360 KiB.

## Testes exigidos
- Unidade: o fetcher/mapeamento descarta `cpf` e `cnh`.
- Tela (RNTL + MSW): lista, vazio, aprovar, recusar, 404, 500, 401; nenhum texto com o CPF/CNH da fixture.
- E2E (só admin, MSW sem estado): aprovar por teclado (diálogo, foco preso, retorno de foco); axe com o diálogo aberto.

## Checklist de acessibilidade e performance
- [ ] Botões com nome único ("Aprovar MOPP - Classe 3 de João da Silva").
- [ ] Foco inicial do diálogo de recusa em "Cancelar" (ação destrutiva).
- [ ] Quando o item sai, o foco vai ao próximo cartão (ou ao título da lista, se for o último).
