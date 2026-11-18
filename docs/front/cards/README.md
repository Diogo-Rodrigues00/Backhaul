# Cards do front-end — visão geral

_Versão 1.0 · 2026-10-20 · Autor: tech-lead · Status: aprovado (Fase 2). Versão 2.0 · 2026-11-04: seção "Fase 6" (cards 026 e 031–046), proposta, aguarda aprovação do Pedro._

As seções abaixo até "Caminho crítico" são o plano da Fase 2 (histórico, com as datas da época). O plano vigente é a seção **Fase 6**.

Specs em `NNN-slug.md`. Arquitetura em `../arquitetura.md`; decisões em `../adr/`. Cada card = 1 PR para `front`, a partir de `front`, com todos os portões (ADR 0013).

## Legenda de bloqueios externos
| Sigla | Significa | Dono | Precisa estar pronto até |
|---|---|---|---|
| **DS** | `docs/front/design-system.md` com tokens (bloco 3.5) e estados dos componentes — **já publicado em 20/10** (falta só a aprovação do Pedro) | designer | 21/10, meio-dia |
| **PROTO** | Protótipos da tela aprovados pelo Pedro (Artifact) — **nenhum card de tela executa antes** | designer + Pedro | 22/10, manhã |
| **LISTA** | Lista de cidades com lat/lng (IBGE) cobrindo o seed e o roteiro (Q1) | membros do grupo | 21/10 |
| **ROTA-xx** | Rota "se der" em `main` + contrato em `docs/api.md` | Diogo | antes de 24/10 |
| 4a / 4b | `GET /propostas/minhas` / `GET /disponibilidades/minhas`: **não bloqueiam** (construídos contra a proposta + MSW) | Diogo | prazo 22/10; plano B decidido pelo Pedro em 23/10 |

Estimativa: **P** ≤ 2 h · **M** 3–4 h · **G** 5–6 h (execução do agente; somar ~1 h por PR para revisão, auditoria e merge).

## Tabela de cards (ordem de entrega)

| # | Card | Itens | Prioridade | Agente / modelo | Est. | Bloqueado por | Onda |
|---|---|---|---|---|---|---|---|
| 001 | [Base do app](001-app-base.md) | MVP-01 | MVP | dev-front / sonnet | G 5 h | — | 0 |
| 002 | [CI e portões](002-ci-portoes.md) | transversal | MVP | devops / sonnet | G 5 h | 001 | 1 |
| 003 | [Vercel + PWA](003-vercel-pwa.md) | MVP-01 | MVP | devops / sonnet | M 3 h | 001 | 1 |
| 004 | [API, erros e mocks](004-api-cliente-mocks.md) | base | MVP | integracao-api / sonnet | G 6 h | 001 | 1 |
| 005 | [Tema, tokens e fonte](005-tema.md) | MVP-01 | MVP | dev-front / sonnet | M 4 h | 001, DS | 1 |
| 006 | [Utilitários](006-lib-utilitarios.md) | CT-07, CT-10 | MVP | dev-front / haiku | M 3 h | 001 | 1 |
| 007 | [Cidades](007-cidades.md) | MVP-07 | MVP | dev-front / haiku | P 2 h | 001, LISTA | 1 |
| 008 | [Atoms](008-atomos.md) | base | MVP | dev-front / sonnet | G 5 h | 005, 006, DS | 2 |
| 010 | [Cabeçalho, barra de abas e templates](010-organismos-templates.md) | base, MVP-01 | MVP | dev-front / sonnet | G 6 h | 008 | 3 |
| 011 | [Diálogo de confirmação](011-dialogo-confirmacao.md) | base | MVP | dev-front / sonnet | M 3 h | 008 | 3 |
| 012 | [Resumos de domínio](012-resumos-de-dominio.md) | base | MVP | dev-front / haiku | M 3 h | 006, 008 | 3 |
| 009 | [Formulários e templates de formulário](009-moleculas-formulario.md) | base | MVP | dev-front / sonnet | M 4 h | 004, 006, 008, 010 | 4 |
| 013 | [Sessão e guardas](013-sessao-guardas.md) | MVP-04, D-PO-10 | MVP | dev-front / sonnet | G 5 h | 004, 006, 010, PROTO | 4 |
| 014 | [Conectando ao servidor](014-portao-servidor.md) | MVP-02 | MVP | dev-front / sonnet | M 3 h | 004, 008, 010, PROTO | 4 |
| 015 | [Login](015-login.md) | MVP-03 | MVP | dev-front / sonnet | M 3 h | 009, 013, PROTO | 5 |
| 016 | [Cadastro de empresa](016-cadastro-empresa.md) | MVP-05 | MVP | dev-front / haiku | M 3 h | 009, 013, PROTO | 5 |
| 017 | [Cadastro de motorista](017-cadastro-motorista.md) | MVP-06 | MVP | dev-front / haiku | M 3 h | 009, 013, PROTO | 5 |
| 018 | [Seletor de local](018-seletor-local.md) | MVP-07 | MVP | dev-front / sonnet | M 4 h | 007, 009, PROTO | 5 |
| 020 | [Minhas cargas](020-minhas-cargas.md) | MVP-09 | MVP | dev-front / haiku | M 3 h | 007, 012, 013, PROTO | 5 |
| 021 | [Propostas da carga](021-propostas-da-carga.md) | MVP-14 | MVP | dev-front / sonnet | G 5 h | 007, 011, 012, 013, PROTO | 5 |
| 022 | [Minhas disponibilidades](022-minhas-disponibilidades.md) | MVP-11 | MVP | dev-front / sonnet | M 4 h | 007, 012, 013, PROTO | 5 |
| 026 | [Minhas propostas](026-minhas-propostas.md) | MVP-15 | MVP | dev-front / haiku | M 3 h | 007, 012, 013, PROTO | 5 |
| 027 | [Fretes do motorista](027-fretes-motorista.md) | MVP-16 | MVP | dev-front / sonnet | M 4 h | 011, 012, 013, PROTO | 5 |
| 028 | [Fretes da empresa + pagamento](028-fretes-empresa-pagamento.md) | MVP-17 | MVP | dev-front / sonnet | M 4 h | 011, 012, 013, PROTO | 5 |
| 019 | [Publicar carga](019-publicar-carga.md) | MVP-08 | MVP | dev-front / sonnet | M 4 h | 013, 018, PROTO | 6 |
| 023 | [Publicar disponibilidade](023-publicar-disponibilidade.md) | MVP-10 | MVP | dev-front / haiku | M 3 h | 009, 018, 022, PROTO | 6 |
| 024 | [Cargas próximas](024-cargas-proximas.md) | MVP-12 | MVP | dev-front / sonnet | M 4 h | 007, 012, 022, PROTO | 6 |
| 025 | [Fazer proposta](025-fazer-proposta.md) | MVP-13 | MVP | dev-front / sonnet | M 4 h | 009, 011, 024, PROTO | 7 |
| 029 | [Roteiro e ensaio da demo](029-roteiro-demo.md) | MVP-18 | MVP | devops / haiku | P 2 h | docs: — · ensaio: seed + 003 + 014–028 | 7 (docs) / 9 (ensaio) |
| 030 | [E2E do fluxo + auditoria final](030-e2e-fluxo-e-auditoria-final.md) | CT-01..10 | MVP (correção) | dev-front / sonnet | M 4 h | 015–028 | 8 |
| 031 | [Certificações do motorista](031-certificacoes-motorista.md) | MVP-19 | Se der | dev-front / sonnet | M 4 h | ROTA-D1-D3, 009, 012, 013, PROTO | se der |
| 032 | [Admin aprova certificações](032-admin-certificacoes.md) | MVP-20 | Se der | dev-front / haiku | M 3 h | ROTA-D4-D5, seed admin, 011, 013, 031, PROTO | se der |
| 033 | [Cancelar carga](033-cancelar-carga.md) | MVP-21 | Se der | dev-front / haiku | P 2 h | ROTA-C1, 011, 021, PROTO | se der |
| 034 | [Cancelar disponibilidade](034-cancelar-disponibilidade.md) | MVP-22 | Se der | dev-front / haiku | P 2 h | ROTA-C2, 011, 022, PROTO | se der |
| 035 | [Mapa sob demanda](035-mapa.md) | MVP-23 | Se der | dev-front / sonnet | G 6 h | 021, 024, 027/028, PROTO | se der |

Total: **30 cards MVP** (001–030) + **5 "se der"** (031–035). Backlog (MVP-24..28) não vira card.
Modelos: 21 sonnet, 9 haiku (MVP); 2 sonnet, 3 haiku (se der).
Cobertura: MVP-01 (001, 003, 005, 010) · 02 (014) · 03 (013, 015) · 04 (013) · 05 (016) · 06 (017) · 07 (007, 018) · 08 (019) · 09 (020) · 10 (023) · 11 (022) · 12 (024) · 13 (025) · 14 (021) · 15 (026) · 16 (027) · 17 (028) · 18 (029).

## Ondas (o que roda em paralelo)

| Onda | Quando (meta) | Cards em paralelo | Condição para começar |
|---|---|---|---|
| 0 | 20/10 noite | 001 | — |
| 1 | 21/10 manhã | 002, 003, 004, 005, 006, 007 | 001 em `front`; 005 precisa de DS; 007 precisa de LISTA para o merge |
| 2 | 21/10 tarde | 008 | 005 e 006 em `front` |
| 3 | 21/10 noite | 010, 011, 012 | 008 em `front` |
| 4 | 22/10 manhã | 009, 013, 014 | 010 em `front`; 013/014 precisam de **PROTO aprovado** |
| 5 | 22/10 tarde → 23/10 | 015, 016, 017, 018, 020, 021, 022, 026, 027, 028 (10 em paralelo) | 013 em `front` (015–018 também 009) |
| 6 | 23/10 | 019, 023, 024 | 018 e 022 em `front` |
| 7 | 23/10 noite → 24/10 | 025, 029 (documentos); "se der" só se a rota estiver em `main` e começar até 24/10 | 024 em `front` |
| 8 | 25–26/10 | 030 + cards `fix:` vindos da auditoria | 015–028 em `front` |
| 9 | 27–28/10 | 029 (verificação das contas e ensaio 2× em 28/10) | seed de demo em produção |

## Caminho crítico até 24/10

```
001 (5 h) → 005 (4 h) → 008 (5 h) → 010 (6 h) → 013 (5 h) → 022 (4 h) → 024 (4 h) → 025 (4 h)
```
- Execução: **37 h**; com ~1 h de revisão + auditoria + merge por PR no caminho: **≈ 45 h**.
- Janela disponível: 20/10 18 h → 24/10 23 h ≈ 4,2 dias. Folga real depende de quantas horas por dia o orquestrador consegue rodar e de quão rápido os PRs são mergeados; com 12 h/dia, a folga é de ~3 h. **Plano se atrasar:** dividir o 010 em dois PRs (casca: `Cabecalho`, `BarraAbas`, `TemplateTela`; depois: estados, `TemplateLista`, `BarraNovidades`) e liberar o 013 após o primeiro.
- Caminhos quase críticos: 004 (6 h) precisa terminar antes de 013 (sobra ~8 h); 010 → 009 → 018 → 019 (12 h) corre em paralelo ao trecho 010 → 013 → 022 → 024 → 025 (22 h).
- Pontos externos no caminho: **aprovação do DS até 21/10 meio-dia** (trava 005 e 008) e **PROTO aprovado até 22/10 manhã** (trava 013 em diante). Cada hora de atraso neles atrasa o congelamento na mesma medida.

## Fase 6 — backend novo (2026-11-04)

Spec de origem: `../spec-fase-backend-novo.md` (seção 5). Contrato: `../../api.md` (vence a spec). Decisões da 6.0 em `../decisoes.md`: **sem cronograma com datas** (ondas em ordem, até onde der antes da Mostra Tech em 12/11); **admin 040 e 041 sem protótipo**; Performance desktop `warn` (aplicado no 038); CORS do Vercel resolvido. ADR novo: [0016 — chat da proposta](../adr/0016-chat-da-proposta.md).

### Legenda de bloqueios da Fase 6
| Sigla | Significa |
|---|---|
| **6.0** | PR #105 (`chore/trazer-main`: `front` + `origin/main`) mergeado em `front` |
| **INT** | PR do `integracao-api` (`feat/contrato-fase6`) mergeado em `front`: tipos, fetchers, hooks, chaves e MSW das rotas **novas** (certificações, mensagens, admin). Os cards 031, 032, 040, 041, 042 **consomem** essas peças, não recriam. `MinhaProposta` plano é do 036; validação de CPF/CNPJ/placa é do 037 |
| **PROTO** | Protótipo do card 039 aprovado pelo Pedro (vale para 026, 031, 032, 035, 042, 043; **não** para 040 e 041) |
| **ROTA-P1/P2/P4** | Rota do `pedido-ao-diogo.md` (A1, A2, A4) em `main` **e** em `docs/api.md`. Sem ela, o card não executa e fica "bloqueado externo" |

### Tabela de cards

| # | Card | Tipo | Agente / modelo | Est. | Bloqueado por | Onda |
|---|---|---|---|---|---|---|
| 036 | [Minhas propostas no formato real (**crítico**)](036-minhas-propostas-formato-real.md) | fix | dev-front / sonnet | M 4 h | 6.0 | 0 |
| 037 | [Validação de CPF/CNPJ/placa + fixtures, MSW e E2E válidos](037-validacao-cpf-cnpj-placa.md) | fix | dev-front / sonnet | M 4 h | 6.0 | 0 |
| 038 | [409 de disponibilidade, 404 de perfil, tetos, `nome` nulo, Lighthouse desktop `warn`](038-conflitos-perfil-tetos.md) | fix | dev-front / haiku | P 2 h | 6.0 | 0 |
| 039 | [Protótipos: minhas propostas, chat, certificações, fila do admin, mapa](039-prototipos-fase6.md) | design | designer / sonnet | M 4 h | — | 0 |
| — | Contrato novo: tipos, fetchers, hooks, MSW (certificações, mensagens, admin) | base | integracao-api / sonnet | — | 6.0 | 0 |
| 026 | [Minhas propostas (tela) — **reescrito**](026-minhas-propostas.md) | feature | dev-front / haiku | M 3 h | 036, PROTO | 1 |
| 031 | [Certificações do motorista — **reescrito**](031-certificacoes-motorista.md) | feature | dev-front / sonnet | M 4 h | INT, PROTO | 1 |
| 040 | [Admin: casca e resumo](040-admin-casca-resumo.md) | feature | dev-front / sonnet | M 3 h | INT | 1 |
| 042 | [Chat em "Propostas da carga" (empresa)](042-chat-empresa.md) | feature | dev-front / sonnet | G 6 h | INT, PROTO | 1 |
| 032 | [Admin aprova certificações — **reescrito**](032-admin-certificacoes.md) | feature | dev-front / haiku | M 3 h | 040, INT, PROTO (031 desejável) | 2 |
| 041 | [Admin: fretes e usuários](041-admin-fretes-usuarios.md) | feature | dev-front / haiku | M 3 h | 040, INT | 2 |
| 043 | [Chat do motorista (em Minhas propostas)](043-chat-motorista.md) | feature | dev-front / haiku | P 2 h | 026, 042 | 2 |
| 035 | [Mapa sob demanda (cargas próximas e minhas cargas) — **atualizado**](035-mapa.md) | feature | dev-front / sonnet | G 6 h | PROTO | 2 |
| 033 | [Cancelar carga — **atualizado**](033-cancelar-carga.md) | feature | dev-front / haiku | P 2 h | **ROTA-P1** | 2 (se rota) |
| 034 | [Cancelar disponibilidade — **atualizado**](034-cancelar-disponibilidade.md) | feature | dev-front / haiku | P 2 h | **ROTA-P2** | 2 (se rota) |
| 044 | [Comissão, `proposta_id`, origem e destino em Meus fretes](044-fretes-comissao-origem-destino.md) | feature | dev-front / haiku | M 3 h | **ROTA-P4** | 2 (se rota) |
| 045 | [Roteiro, contas e ensaio (atualiza o 029)](045-roteiro-contas-ensaio.md) | docs | documentador + devops / haiku | P 2 h + ensaios | 026, 031, 032, 037, 040, 042; ensaio: seeds no Neon | 3 |
| 046 | [E2E do fluxo + auditoria das rotas novas (atualiza o 030)](046-e2e-auditoria-fase6.md) | qa | dev-front / sonnet | G 6 h | cards de feature que entrarem | 3 |

Total: 17 cards (3 fix, 1 design, 11 feature, 1 docs, 1 qa) + o PR do `integracao-api`. Modelos: 7 sonnet e 9 haiku nos cards de execução, mais o 039 (designer, sonnet). Já em `front` e por isso fora dos bloqueios: 007, 009, 011, 012, 013, 020, 021, 022, 024, 027, 028. Qualquer card pode subir de haiku para sonnet pela regra das retentativas.

### Ondas (em ordem, sem datas)

| Onda | Cards em paralelo | Condição para começar |
|---|---|---|
| 0 | 036, 037, 038, 039, INT | 6.0 em `front` (039 não depende de nada). **036 primeiro a mergear** e deploy de produção logo depois (bug em produção) |
| 1 | 026, 031, 040, 042 | 036 em `front` (026); INT em `front` (031, 040, 042); **PROTO** aprovado (026, 031, 042). O 040 não espera protótipo |
| 2 | 032, 041, 043, 035 e, se a rota existir, 033, 034, 044 | 040 em `front` (032, 041); 026 e 042 em `front` (043); PROTO (032, 035); ROTA-P1/P2/P4 em `main` + `docs/api.md` (033, 034, 044) |
| 3 | 045, 046 | cards de feature que vão para a Mostra em `front` |

O `integracao-api` confere contrato × backend de novo no fim de cada onda (`git fetch`), porque o Diogo pode mudar a `main`.

### Arquivos compartilhados e ordem de merge
Cards da mesma onda que mexem nos mesmos arquivos conflitam; o segundo a mergear rebaseia em `front` e roda os portões de novo.

| Arquivo | Cards que mexem |
|---|---|
| `app/src/components/organisms/itensDaArea.ts` | 026 (motorista: Minhas propostas), 031 (motorista: Certificações, posição pelo 039), 040 (admin: Resumo), 041 (admin: Fretes, Usuários), 032 (admin: Certificações) |
| `app/e2e/rotas.ts` | 026, 031, 041 (2 rotas), 032; 040 só confere `/admin` |
| `app/mocks/handlers/comEstado.ts` + `app/mocks/estado.ts` | 036 (`/propostas/minhas` 200), 037 (validação de cadastro), 046 (admin, certificações, mensagens); 033/034/044 se a rota existir |
| `app/mocks/handlers/*.ts` sem estado + `mocks/fixtures/*` | INT (certificações, mensagens, admin), 036 (`propostas.ts`), 037 (`sessao.ts`), 038 (`fixtures/usuarios.ts`), 044 (`fretes.ts`) |
| `app/src/api/tipos.ts` | INT, 036, 038, 044 (e 033/034 se a rota existir) |
| `app/src/lib/validacao.ts` | 037, 038 |
| `app/src/telas/CorpoPropostasDaCarga.tsx` + `CartaoProposta.tsx` | 042, 033 |
| `app/src/telas/CorpoMinhasPropostas.tsx` + `CartaoMinhaProposta.tsx` | 026 (cria), 043 |
| `CartaoCargaProxima.tsx`, `CorpoCargasProximas.tsx`, `usePropostasDoMotorista.ts`, `AcoesProposta.tsx` | 036, 038, 035 |

Ordem de merge sugerida:
- **Onda 0:** 036 → INT → 037 → 038 (039 é Artifact, sem conflito).
- **Onda 1:** 040 → 026 → 031 → 042 (040 e 026/031 mexem em listas diferentes de `itensDaArea`, mas no mesmo arquivo).
- **Onda 2:** 041 → 032 (menu do admin na ordem Resumo, Fretes, Usuários, Certificações) → 043 → 035; 033/034/044 quando a rota sair, depois do 042 (033) e antes do 046.
- **Onda 3:** 045 (documento) em paralelo com 046; 046 por último.

## Regras de execução
- Branch `feat/<slug>` (a base usa `feat/app-base`), sempre a partir de `front` atualizada; PR para `front` com `Closes #<issue>`.
- Toda rota nova entra em `app/e2e/rotas.ts` no próprio card (o axe e o Lighthouse leem dessa lista).
- Cards com rota 🔜 (4a, 4b) usam só MSW e não mudam de tela quando a rota sair; divergência entre a rota real e a proposta → avisar o orquestrador.
- Retentativas (decisão do kickoff): até 3 por card; na 2ª falha, Haiku → Sonnet; na 3ª, parar e reportar.
