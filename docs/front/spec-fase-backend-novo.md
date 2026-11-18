# Spec — Fase 6: integrar o backend novo (kickoff para o orquestrador)

_Escrita em 2026-11-04 por sessão de planejamento com o Pedro. Leia também `docs/front/STATUS.md`, `docs/front/decisoes.md`, `docs/front/cards/README.md` e `app/CLAUDE.md`. Esta spec **estende** o kickoff original (`kickoff-backhaul-front.md`); tudo que ela não altera continua valendo (papéis, portões, git, retentativas, regras de parada)._

## 0. Como usar esta spec

Você é o **orquestrador** (`claude --agent orquestrador`), na raiz do repositório, branch `front`. Comece lendo este arquivo, depois `STATUS.md` e `decisoes.md`. Execute a **Fase 6.0** e siga as ondas da seção 6. Mostre ao Pedro em poucas linhas o que vai fazer antes de começar, como no kickoff.

Fontes de verdade, em ordem: `docs/api.md` **da `origin/main`** (contrato) > código de `backend/src/` da `origin/main` > esta spec > relatórios antigos. Se algo desta spec contradisser o contrato ou o código, vale o contrato/código: corrija a spec e avise o Pedro.

Os fatos da seção 2 foram verificados em 2026-11-04; os detalhes por rota (tabela 2.2) vêm do relatório do `integracao-api` e não foram reverificados um a um. Reconfira o que for usar.

## 1. Objetivo e prazo

O backend (Diogo) subiu rotas novas depois do nosso baseline. O Pedro decidiu em 2026-11-04 **fazer tudo**: corrigir o app para o contrato novo e entregar as telas que as rotas novas permitem, mais as que dependem de rotas que o Diogo ainda precisa criar (lista no `pedido-ao-diogo.md`).

Prazo: **Mostra Tech em 12/11/2026**. Cronograma proposto (o Pedro confirma na Fase 6.0):

| Data | Marco |
|---|---|
| 04–05/11 | Fase 6.0 (preparação), ondas 0 |
| 05–07/11 | Onda 1 |
| 06/11 | Prazo para o Diogo responder ao pedido (cancelar, comissão, regras do aceite) |
| 07–09/11 | Onda 2 |
| **09/11 (noite)** | **Congelamento de funcionalidades.** Depois só correção, a11y, Lighthouse |
| 10–11/11 | Ensaio da demo 2× + auditoria final |
| 12/11 | Mostra Tech |

Itens que dependem do Diogo e não chegarem em `main` + `docs/api.md` até 07/11 **não executam**: o card fica pronto, marcado "bloqueado externo", e a demo usa o plano B descrito no card.

## 2. Estado verificado (2026-11-04)

### 2.1 Fatos
- `origin/main` está **23 commits à frente** de `front` (último: `e5d7a88`, PR #103). `front` não tem o backend novo nem o `docs/api.md` novo.
- A **API em produção já serve as rotas novas** (testado: `GET /propostas/minhas`, `/certificacoes/minhas`, `/certificacoes/pendentes`, `/admin/resumo`, `/propostas/:id/mensagens` respondem 401 sem token; rota inventada responde 404 HTML).
- `GET /disponibilidades/minhas` **não existe**: o 401 vem do `router.use(exigirAutenticacao)` do arquivo e responde para qualquer subcaminho. O plano B local de disponibilidades continua valendo.
- **Bug crítico no app já em produção:** `app/src/telas/usePropostasDoMotorista.ts:83` e `:91` leem `p.carga.id`. O contrato real de `GET /propostas/minhas` é **plano** (`chamado_carga_id`, `chamado_disp_id`, `tipo_carga`, `valor_oferecido`, `empresa`, `frete_id`), sem objeto `carga`. Com qualquer proposta pendente ou contraproposta, "Cargas próximas" do motorista lança `TypeError`.
- `app/mocks/handlers/comEstado.ts:~382` ainda responde 404 em `/propostas/minhas` ("fiel ao backend de hoje"): o E2E do fluxo completo prova um mundo que não existe mais.

### 2.2 Rotas novas ou alteradas na main (resumo; detalhe em `docs/api.md`)
| Rota | Perfil | Observações que mudam a UI |
|---|---|---|
| `GET /propostas/minhas` | motorista | Formato plano (ver 2.1). `status`: pendente/aceita/recusada/expirada. `frete_id` só quando aceita. **Não traz** origem, destino, urgência, certificação, `carga_status`, `carga_expira_em` |
| `POST /propostas` | motorista | Novo `409 "disponibilidade não está mais aberta"` (usada em frete ou vencida) |
| `GET /certificacoes/minhas` | motorista | Traz `situacao`: `pendente` / `aprovada` / `vencida`, e `nome`. **Sem** `classificacao_onu` (juntar com `GET /certificacoes`) |
| `POST /certificacoes/minhas` | motorista | Cadastra **e reenvia** (não há PUT). `201` também no reenvio. `409` só se já aprovada e dentro da validade. `400`: validade inválida / no passado / número > 60 / `certificacao_id` inexistente |
| `GET /certificacoes/pendentes` | admin | `certificacao` é o **nome (texto)**. Devolve `cpf` e `cnh` do motorista: **a UI nunca exibe nem guarda**; mostrar só nome e placa |
| `POST /certificacoes/pendentes/:id/responder` | admin | `{acao: "aprovar"|"recusar"}`. **Recusar apaga o registro** (motorista pode reenviar). `404` se já decidida |
| `GET /propostas/:id/mensagens` | empresa dona / motorista da proposta | Ordem cronológica. Campo do texto é **`texto`**. `remetente_id` é o id do **usuário** (comparar com `GET /eu` → `usuario.id`). `404` para quem não participa (inclusive admin) |
| `POST /propostas/:id/mensagens` | idem | `{texto}` ≤ 1000. `400` recusa telefone/e-mail/link (10+ dígitos seguidos, `@`, "arroba", `http(s)://`, `www.`, `.com/.br/.me/.ly`). `409 "proposta encerrada: não é possível enviar mensagens"` (recusada/expirada) |
| `GET /admin/resumo` | admin | `resumo{ motoristas, empresas, cargas_abertas, propostas_pendentes, fretes_*, certificacoes_pendentes, volume_liberado, comissao_total, comissao_retida }` |
| `GET /admin/fretes` | admin | Até 100, com empresa, motorista, placa, `status_pagamento`, `valor_comissao` (null até pagar) |
| `GET /admin/usuarios` | admin | Até 200, sem CPF/CNPJ. Admin vem com `nome: null` |
| `POST /cadastro/*` | público | CPF e CNPJ com **dígitos verificadores** (`400 "cpf inválido"` / `"cnpj inválido"`); placa `ABC1234` ou `ABC1D23` |

### 2.3 Ainda não existe no backend (vira pedido ao Diogo; ver `pedido-ao-diogo.md`)
`GET /disponibilidades/minhas` (4b) · `POST /cargas/:id/cancelar` (P1) · `POST /disponibilidades/:id/cancelar` (P2) · extensão de `GET /propostas/minhas` (P3) · comissão, `proposta_id`, origem/destino em `GET /fretes/meus` (P4) · regras do aceite (P5) · tetos e 404/413 em JSON (P6) · remover `cpf`/`cnh` de `GET /certificacoes/pendentes` (P7).

## 3. Decisões do Pedro (2026-11-04) — registrar em `decisoes.md`

1. **Tudo entra**: correções, "Minhas propostas", chat, admin mínimo, certificações (motorista + admin), cancelar carga/disponibilidade, mapa. O que depende do Diogo executa assim que a rota estiver em `main` + `docs/api.md`; o Pedro leva o pedido ao Diogo.
2. **Card 026 reativado com o contrato atual** (tipo de carga, empresa, valor, status da proposta, link para o frete). Sem "carga indisponível" até o Diogo entregar P3.
3. **Chat** para empresa e motorista; **admin mínimo** (resumo, fretes, usuários, aprovação de certificações).
4. **Certificações 031 e 032** reescritas para o contrato real.
5. **Congelamento de funcionalidades passa de 24/10 para 09/11 (noite)**. Substitui o item "Até 24/10…" de `decisoes.md`.
6. Decisões do kickoff e de `decisoes.md` seguem valendo (Lighthouse 100, WCAG AA, comissão vinda da API, atomic design, commits pequenos, 1 PR por card, aprovação de protótipo antes de tela, orçamento de JS).

**Abertas, a perguntar ao Pedro na 6.0:**
- O cronograma da seção 1.
- Admin, chat e certificações precisam de protótipo aprovado (decisão de 20/10: nenhuma tela executa antes). Aprovação por Artifact, como antes (card 039).
- Performance de desktop como `warn` no Lighthouse (pendente desde 23/10).

## 4. Fase 6.0 — Preparação (você, hoje)

1. `git fetch`; criar `chore/trazer-main` a partir de `front` e fazer **merge de `origin/main`** (merge commit, não squash; sem editar `backend/` nem `database/`). PR para `front`. Resolver conflitos de `docs/` mantendo o conteúdo de `front` e o `docs/api.md` da `main`. Isso traz o contrato e o backend para quem for rodar/ler. **Não tocar na `main`.**
2. Conferir a produção: `GET /saude` (200) e as rotas da 2.1. Se o Vercel `backhaul-front` está logando (CORS do Render inclui `https://backhaul-front.vercel.app`?): teste `curl -i -H "Origin: https://backhaul-front.vercel.app" -X OPTIONS .../login`. Reporte ao Pedro.
3. Despachar em paralelo:
   - `tech-lead`: reescrever as specs dos cards 026, 031, 032, 033, 034, 035 para o contrato real (seção 5) e criar 036–046. Atualizar `cards/README.md` (tabela e ondas), com ADR curto se alguma decisão técnica nova surgir (ex.: componente de chat, polling, mapa).
   - `designer`: card 039 (protótipos), já. Não depende do tech-lead.
   - `integracao-api`: preparar tipos, cliente e MSW do contrato novo (parte do card 036/037/038; ver 5).
4. Mostrar ao Pedro a **lista final de cards** (resumida) e pedir aprovação; depois criar issues (`gh`), como na Fase 2 (labels `feature`/`bug`/`docs` + `front` + `modelo:*`).
5. Pedir ao Pedro para enviar `pedido-ao-diogo.md` hoje.
6. Atualizar `STATUS.md` (Fase 6 em andamento, cards, bloqueios externos).

## 5. Cards da Fase 6

> **Atualizado pelo tech-lead em 2026-11-04.** As specs completas estão em `docs/front/cards/0NN-*.md` e a tabela/ondas vigentes em `docs/front/cards/README.md` (seção "Fase 6"); em caso de diferença, valem os cards. Mudanças em relação a esta seção: 040 e 041 **sem PROTO** (decisão do Pedro); 032 bloqueado por 040, INT e PROTO (o 031 virou desejável); o E2E motorista → admin do 032 e o chat entre duas janelas passaram para o 046; o 026 não usa o plano B local (não dá para montar a lista com ele); o 038 também aplica Performance desktop `warn` e o teto de `valor_proposto`; ondas sem datas (seção 1 substituída pela decisão da 6.0).

Legenda de bloqueio: **PROTO** = protótipo do card 039 aprovado pelo Pedro · **ROTA-xx** = rota em `main` + `docs/api.md`. Todos os cards seguem os portões do ADR 0013 (lint, typecheck, testes, E2E+axe, Lighthouse 100, orçamento de JS 360 KiB) e a regra "rota nova entra em `app/e2e/rotas.ts` no próprio card". Telas: pt-BR, a11y explícita (`role`/`aria-*`), foco gerenciado, estados de vazio/erro/carregando/401/500.

| # | Card | Tipo | Agente / modelo | Bloqueado por | Onda |
|---|---|---|---|---|---|
| 036 | Minhas propostas no formato real (**crítico**) | fix | dev-front / sonnet | 6.0 | 0 |
| 037 | Validação de CPF/CNPJ/placa + fixtures, MSW e E2E válidos | fix | dev-front / sonnet | 6.0 | 0 |
| 038 | 409 de disponibilidade, 404 de perfil, tetos numéricos, `Usuario.nome` nulo | fix | dev-front / haiku | 6.0 | 0 |
| 039 | Protótipos: chat, certificações, admin, minhas propostas | design | designer / sonnet | — | 0 |
| 026 | Minhas propostas (tela) — **reescrito** | feature | dev-front / haiku | 036, PROTO | 1 |
| 031 | Certificações do motorista — **reescrito** | feature | dev-front / sonnet | PROTO | 1 |
| 040 | Admin: casca e resumo | feature | dev-front / sonnet | PROTO | 1 |
| 042 | Chat na tela de propostas da carga (empresa) | feature | dev-front / sonnet | PROTO | 1 |
| 032 | Admin aprova certificações — **reescrito** | feature | dev-front / haiku | 031, 040, PROTO | 2 |
| 041 | Admin: fretes e usuários | feature | dev-front / haiku | 040 | 2 |
| 043 | Chat do motorista (a partir de Minhas propostas) | feature | dev-front / haiku | 026, 042 | 2 |
| 035 | Mapa sob demanda (cargas próximas e minhas cargas; fretes só com P4) | feature | dev-front / sonnet | PROTO | 2 |
| 033 | Cancelar carga — **atualizado** | feature | dev-front / haiku | **ROTA-P1**, 011, 021 | 2 (se rota) |
| 034 | Cancelar disponibilidade — **atualizado** | feature | dev-front / haiku | **ROTA-P2**, 011, 022 | 2 (se rota) |
| 044 | Comissão, `proposta_id`, origem e destino em Meus fretes | feature | dev-front / haiku | **ROTA-P4**, 027, 028 | 2 (se rota) |
| 045 | Roteiro, contas e ensaio da demo (atualiza o 029) | docs | documentador+devops / haiku | seed no Neon, 031, 032, 040, 042 | 3 |
| 046 | E2E do fluxo + auditoria final das rotas novas (atualiza o 030) | qa | dev-front / sonnet | todos os de feature | 3 |

Cards 026, 031, 032, 033, 034 e 035 mantêm o número e ganham a seção "Revisão 2026-11-04" no topo explicando o que mudou. Qualquer um pode subir de haiku para sonnet pela regra das retentativas.

### 036 — Minhas propostas no formato real (CRÍTICO)
Estado atual: `app/src/api/tipos.ts` (~218–244) define `MinhaProposta` com `disponibilidade_id` e `carga{id,…}` aninhado (proposta 4a do baseline).
- Tipos: `MinhaProposta` plano, igual ao contrato (`chamado_carga_id`, `chamado_disp_id`, `tipo_carga`, `valor_oferecido`, `empresa`, `frete_id | null`, `status`, `tipo`, `valor_proposto`, `criado_em`).
- `app/src/telas/usePropostasDoMotorista.ts:83,91`: usar `chamado_carga_id`.
- MSW: `app/mocks/handlers/comEstado.ts:~382` e `app/mocks/handlers/propostas.ts:~93` passam a responder 200 no formato real; fixtures em `app/mocks/fixtures/propostas.ts` (~137–180).
- Testes a atualizar: `cargas-proximas.test.tsx` (~175–200), `cargas-proximas-atualizar` e `-estados`, `fazer-proposta.test.tsx` (~86–150), `test-utils/cenarioFazerProposta.tsx`, `api/hooks.test.tsx`.
- Plano B (`lib/propostasEnviadas.ts`): fica **só como fallback** quando a rota responde 404 ou há erro de rede; a resposta real vence sempre.
- Aceite: com proposta pendente e com contraproposta (qualquer status), "Cargas próximas" renderiza e bloqueia nova proposta/contraproposta; teste de regressão com o formato real; E2E do fluxo completo sem depender do 404.

### 037 — Validação de CPF, CNPJ e placa
- `lib/validacao.ts`: `cpfValido`, `cnpjValido`, `placaValida` com a **mesma regra e mensagens** do backend (`backend/src/validacao.ts` da main: 11/14 dígitos, dígitos verificadores, rejeitar sequências repetidas como `111.111.111-11`; placa `ABC1234` ou `ABC1D23`, com ou sem hífen). Usar em `cadastro/motorista.tsx` (~67–70) e `cadastro/empresa.tsx` (~51); a mensagem da API continua como fallback por prefixo.
- Trocar **fixtures inválidas** por válidas: CPF `529.982.247-25`, `987.654.321-00`, `123.456.789-09`, `111.444.777-35`; CNPJ `11.222.333/0001-81`, `12.345.678/0001-95`. Locais: `app/src/app/__tests__/cadastro-motorista.test.tsx:83`, `app/src/api/hooks.test.tsx:137,179`, `app/src/app/cadastro/__tests__/empresa.test.tsx:49,150`, `app/e2e/cadastro-empresa.spec.ts:26,38`, `app/mocks/estado.ts:162`.
- E2E aleatórios (`app/e2e/cadastro-motorista.spec.ts:5`, `app/e2e/fluxo-completo.spec.ts:~190`): gerar CPF/CNPJ **válidos** pelo algoritmo (helper em `app/e2e/`).
- MSW que hoje aceita o que a API recusa (`app/mocks/handlers/sessao.ts:~50,~85`, `comEstado.ts:~157`): espelhar o backend (400 com a mesma mensagem).
- Aceite: formulário bloqueia CPF/CNPJ/placa inválidos antes do POST com erro associado ao campo; MSW recusa os mesmos casos; nenhum teste usa número inválido; E2E passa contra o mock espelhado.

### 038 — Conflitos, perfil e tetos
- `lib/fazerProposta.ts` (`lerErroDaProposta`): `409 "disponibilidade não está mais aberta"` vira um estado próprio `disponibilidade`, com link para republicar a disponibilidade (hoje cai em `carga-indisponivel`). `404 "perfil de motorista não encontrado"` não pode cair em `carga-indisponivel`.
- Tetos no formulário: `peso_kg`, `valor_oferecido`, `capacidade_kg` ≤ 99.999.999,99 (o backend devolve 500 acima disso); `tipo_carga` ≤ 80.
- `Usuario.nome: string | null` (admin vem com `null`; `Cabecalho` já usa `??`, conferir demais usos).
- Aceite: testes dos três casos; nenhum campo numérico aceita acima do teto.

### 039 — Protótipos (designer)
Seguir `docs/front/design-system.md` (tokens, tema claro/escuro, AA). Publicar como **Artifact** e pedir aprovação ao Pedro. Telas: (1) Minhas propostas; (2) Chat dentro do cartão da proposta (empresa e motorista; estados: vazio, enviando, erro 400 do filtro, proposta encerrada, nova mensagem); (3) Certificações do motorista (lista com situação pendente/aprovada/vencida; formulário com validade em dia/mês/ano); (4) Admin: resumo, listas de fretes e usuários, fila de certificações pendentes (só nome, certificação, número, validade, placa). Mapa (035): estado fechado/aberto e equivalente em texto. Sem logos nem cores novas.

### 026 — Minhas propostas (tela)
Rota `/motorista/propostas`, item de menu "Minhas propostas". Lista da API (mais recentes primeiro): tipo de carga, empresa, valor oferecido × valor proposto, tipo (proposta/contraproposta), status em texto e selo, link "Ver frete" quando `frete_id`. Atualização automática ~10 s (tela de espera, só visível e aba ativa) + botão atualizar, novidade anunciada sem roubar foco. Vazio, 401, 500. **Sem** "carga indisponível" (precisa de P3). Quando a proposta aceita não tiver `frete_id` ainda, não inventar. Aceite: critérios do card 026 original que não dependem de campos ausentes; `lib/propostasEnviadas.ts` só como fallback.

### 031 — Certificações do motorista
Rota `/motorista/certificacoes`. Lista de `GET /certificacoes/minhas` (nome, número, validade só data, `situacao` em texto: "Aguardando aprovação" / "Aprovada" / "Vencida"). Formulário: certificação de `GET /certificacoes`, número (≤ 60), validade em três campos Dia/Mês/Ano agrupados como "Validade". `POST /certificacoes/minhas` serve para cadastrar **e** reenviar; aviso: reenviar volta para "Aguardando aprovação". **Aprovada e vigente**: não oferecer reenvio (a API devolve 409 mesmo). Erros 400 por campo. Vazio, 401, 500. Fixar a borda de fuso: validar "hoje" localmente e deixar a API ser a autoridade.

### 032 — Admin aprova certificações
Rota `/admin/certificacoes`. Fila de `GET /certificacoes/pendentes` (mais antigas primeiro). Mostrar **somente** nome do motorista, certificação (texto), número, validade e placa. **Nunca renderizar, logar ou guardar `cpf`/`cnh`** (descartar ao parsear a resposta). Ações Aprovar e Recusar com diálogo de confirmação; recusar avisa que o registro é apagado e o motorista pode reenviar. `404` (já decidida) vira aviso e recarrega a fila. Aceite: fluxo motorista → admin → situação "Aprovada" coberto por E2E com MSW; o motorista com MOPP aprovado vê as cargas com exigência.

### 040 — Admin: casca e resumo
Substituir o placeholder de `app/src/app/admin/index.tsx`. `itensDaArea.admin` com Resumo, Fretes, Usuários, Certificações. Resumo mostra os números de `GET /admin/resumo`, incluindo `comissao_total` e `comissao_retida` **como a API devolve** (nada de percentual fixo). Sem atualização automática. A conta admin vem de `database/seed-admin.sql` (credenciais fora do repo).

### 041 — Admin: fretes e usuários
`/admin/fretes` (até 100, mais recentes primeiro: tipo de carga, empresa, motorista, placa, status de entrega, status de pagamento, comissão ou "—" quando `null`) e `/admin/usuarios` (e-mail, tipo, ativo, nome ou "—"). Usar `TemplateLista`. Tabelas semânticas ou listas com rótulos; reflow a 320 px.

### 042 — Chat na tela de propostas da carga (empresa)
Componente reutilizável `ConversaDaProposta` (organismo): histórico de `GET /propostas/:id/mensagens`, envio via `POST` com `texto`. Identificar minhas mensagens comparando `remetente_id` com `usuario.id` de `GET /eu`. Polling ~10 s só com a conversa aberta e aba visível; nova mensagem anunciada (live region educada) sem mover o foco; campo com contador (1000) e erro `400` associado ao campo, inclusive "mensagem não pode conter telefone, e-mail ou link" com orientação para não passar contato. `409 proposta encerrada`: histórico continua legível e o envio fica desabilitado com explicação. Montar na tela de "Propostas da carga" (a empresa já tem `proposta.id`). **Cuidado de demo:** o filtro recusa 10+ dígitos seguidos; não usar números longos nos exemplos.

### 043 — Chat do motorista
Reaproveitar `ConversaDaProposta` em "Minhas propostas" (026), onde o motorista tem `id` da proposta. A partir de "Meus fretes" só quando o P4 entregar `proposta_id`.

### 035 — Mapa sob demanda (atualizado)
Carregado só sob demanda (não aumenta o JS inicial), só visualização, toda informação também em texto. Escopo agora: **cargas próximas** e **minhas cargas** (têm origem e destino). Mapa em fretes (027/028) só depois do P4 (`origem`/`destino` em `GET /fretes/meus`). Respeitar Lighthouse 100 e o orçamento de JS; no iPhone, validar no Expo Go.

### 033 e 034 — Cancelar carga / disponibilidade (atualizados)
Contratos propostos: P1 `POST /cargas/:id/cancelar` → `200 {carga:{id,status:"cancelado"}}`, `409 "carga não está aberta"`; P2 `POST /disponibilidades/:id/cancelar` → `200 {disponibilidade:{id,status:"cancelado"}}`. **Só executar com a rota em `main` e no `docs/api.md`**; se o contrato real divergir, seguir `docs/api.md`. Diálogo de confirmação (011); cancelar carga avisa que propostas pendentes serão recusadas. Se a rota de disponibilidade sair, o plano B local também deve apagar a disponibilidade guardada.

### 044 — Comissão e origem/destino em fretes
Depende de P4: `GET /fretes/meus` com `proposta_id`, `origem`, `destino` e, para a empresa, `comissao{percentual_comissao,valor_comissao,status_pagamento}` (null antes do pagamento). Remove a dívida "comissão some ao recarregar". Habilita chat a partir do frete e mapa de fretes (035). **Sem P4, não executar**; o comportamento atual (comissão só logo após pagar) continua.

### 045 — Roteiro, contas e ensaio
Atualizar `docs/front/roteiro-demo.md`: CPF/CNPJ **válidos** para cadastro ao vivo (preparar 3 CPFs e 2 CNPJs gerados pelo algoritmo; a seção 3, passo 5, hoje pede só "11 dígitos"); incluir admin (aprovar certificação), chat e Minhas propostas; manter o plano B da disponibilidade (motorista republica após login). Conferir o "Quadro de contas" **fora do repo**. Pré-requisitos do Diogo: `seed-demo.sql` e `seed-admin.sql` rodados no Neon (**não confirmado**). Ensaio 2× em 10/11 e 11/11 no ambiente hospedado. Vídeo de backup.

### 046 — E2E e auditoria final
Atualizar o E2E do fluxo completo para o mundo novo (propostas reais, CPF válido, certificação, chat). Rodar axe + checklist manual + Lighthouse mobile e desktop em **todas as rotas novas**; relatório em `docs/front/auditoria-final.md` (acrescentar). iPhone/Expo Go, VoiceOver e Dynamic Type seguem **não verificados** desde a Fase 5: pedir ao Pedro uma sessão com o aparelho.

## 6. Ondas e regras de execução

- Onda 0: 036, 037, 038 e 039 em paralelo (4 worktrees). Em seguida, a aprovação do 039 libera as telas.
- Onda 1: 026, 031, 040, 042. Onda 2: 032, 041, 043, 035 e, se a rota existir, 033, 034, 044. Onda 3: 045, 046.
- Cada card: branch `feat/NNN-slug` (ou `fix/NNN-slug`) a partir de `front`, PR para `front`, `revisor-qa` → `auditor-a11y-perf` → merge squash. Retentativas: até 3; na 2ª, haiku → sonnet; na 3ª, parar e explicar ao Pedro.
- Cards que tocam o mesmo arquivo (`itensDaArea`, `e2e/rotas.ts`, `mocks/handlers`) podem conflitar: sequenciar o merge e rebasear.
- `integracao-api` confere contrato × backend de novo no fim de cada onda (`git fetch`), porque o Diogo pode mudar a `main` até 09/11.
- Orquestrador continua autorizado a commitar e mergear PRs (squash) em `front`. Continua proibido: `main`, force push, editar `backend/` e `database/`.

## 7. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | O site publicado já quebra "Cargas próximas" para motorista com proposta | 036 primeiro; deploy de produção do `front` assim que mergear |
| R2 | CORS do Render sem `https://backhaul-front.vercel.app` (só `localhost:8081` em 23/10) | Verificar na 6.0; pedido ao Diogo, item de operação |
| R3 | Cadastro ao vivo com CPF/CNPJ de dígito errado dá 400 no palco | 037 + roteiro 045 com documentos válidos |
| R4 | Seed de demo não confirmado no Neon; seeds têm CPF/CNPJ de dígito inválido (login funciona, cadastro não serve de exemplo) | Pedir confirmação ao Diogo; cadastro ao vivo usa documentos próprios válidos |
| R5 | O Diogo muda a `main` depois do congelamento | Congelar contrato em 09/11; `integracao-api` confere a cada onda |
| R6 | Aceite sem checar disponibilidade: o mesmo motorista pode ficar com 2 fretes (P5) | Pedir ao Diogo; na demo, não aceitar duas propostas do mesmo motorista |
| R7 | 8 dias para muito escopo | Ordem das ondas já prioriza correções e rotas existentes; 033/034/044 só com a rota |
| R8 | Chat recusa 10+ dígitos (NF, telefone) | Orientar no campo e nos exemplos do roteiro |
| R9 | iPhone/VoiceOver nunca verificados | Sessão com o Pedro antes de 11/11 |

## 8. Quando parar e chamar o Pedro
Além do kickoff: aprovação do cronograma, da lista de cards e dos protótipos (039); card reprovado 3×; rota do Diogo com contrato diferente do assumido que muda uma tela; qualquer mudança de escopo; dúvida sobre dados sensíveis (`cpf`/`cnh` do admin); qualquer ação na `main`.

## 9. O que depende do Pedro
- Enviar `docs/front/pedido-ao-diogo.md` ao Diogo **hoje**.
- Aprovar cronograma, lista de cards e protótipos.
- Conta Expo e Expo Go no iPhone (ainda pendente); sessão de teste com VoiceOver.
- Confirmar com o professor que PWA conta como "instalável" (antes da Mostra Tech).
- Preencher o "Quadro de contas" da demo fora do repo.
