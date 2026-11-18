# Auditoria final do front (card 030)

_Executada em 2026-10-23, sobre `origin/front` (commit 6ddab38) + PR #89 do card 030. **Números do CI** (Linux, `ubuntu-latest`): run 39922814359, commit b372346, que tem o mesmo código do app do HEAD do PR (o commit seguinte só altera este documento). Os números marcados como "local" vêm da máquina Windows 11 do desenvolvedor, **não estão em nenhum log do CI** e são só referência. `#88` (só docs) entrou em `front` depois do run citado e não muda o JS; o `#90` ainda não estava em `front`: depois que entrar, rode `npm run orcamento` de novo (a home nova mexe em `/`; `/entrar` tem só 0,4 KiB de folga)._

_A auditoria da Fase 6 (card 046) está no fim deste arquivo, em "Fase 6 (backend novo)"._

## Resumo

| Item | Resultado |
|---|---|
| Fluxo da demo de ponta a ponta (2 janelas, mock com estado) | **passa** (CI e local); 1 bug real encontrado e corrigido |
| Reflexo entre janelas (meta PRD §8: ≤ 15 s) | **6,4 a 9,4 s** com o polling real de 10 s (run b372346; 5,9 a 9,5 s em runs anteriores) |
| axe, todas as rotas de `e2e/rotas.ts`, tema claro e escuro, 1280 px e 320 px | **0 violações** (250 testes passaram, 54 pulados por serem de um só projeto) |
| axe nos estados reais do fluxo (propostas chegando, pagamento feito, fretes entregues), nos dois temas | **0 violações** |
| Lighthouse desktop, 15 rotas | **100 / 100 / 100 / 100** |
| Lighthouse mobile, 15 rotas | Acessibilidade, Boas práticas e SEO **100**; Performance **85 a 92** neste run (86 a 93 em runs anteriores; varia de um run para outro; aceito: adendo do ADR 0011, só avisa) |
| Orçamento de JS inicial (360 KiB) | **respeitado** nas 15 rotas; a mais cheia tem 0,4 KiB de folga |
| Jest | 136 suítes, 1246 testes, todos passaram no CI |
| Aba oculta por 30 s | **0 requisições** nas três telas com atualização automática |
| iPhone / Expo Go, VoiceOver, API real | **não verificados** (ver "Não verificado") |

## 1. O fluxo da demo em duas janelas

Arquivo: `app/e2e/fluxo-completo.spec.ts`, projeto `desktop` (as duas janelas em 1280 px; no projeto `estreito` o teste é pulado para o job `web` não dobrar de tempo).

Três contextos de navegador, cada um com seu `localStorage`: **A** empresa, **B** motorista com MOPP (seed do mock) e **N** motorista novo, cadastrado ao vivo e sem MOPP.

| Passo | Janela | O que o teste confere |
|---|---|---|
| A1 | A | Login pelo formulário; publica "Produtos inflamáveis", **crítico**, exigindo **MOPP - Classe 3**; o corpo enviado tem `urgencia: critico` e o id da certificação; "Minhas cargas" lista as duas cargas |
| B1 | N | Cadastro com os **8 campos** (o corpo do POST tem exatamente as 8 chaves); login automático cai em "Cargas próximas"; publica disponibilidade (Uberlândia); a lista só tem "Grãos": **a carga crítica com MOPP não aparece** para o motorista sem MOPP |
| B2 | B | Login; publica disponibilidade; a lista tem 2 cargas, **a crítica vem primeiro**, com a etiqueta "Crítico" e a certificação exigida; axe nos dois temas |
| A2 | A | Abre as propostas da carga ("Nenhuma proposta ainda") e deixa a tela aberta |
| B3 | B | Abre "Meus fretes" (vazio) em outra aba da mesma janela, com relógio falso |
| B4 | B | Contraproposta de R$ 3.200,00 (201, "Proposta enviada") |
| A3 | A | **Reflexo 1 (tempo real):** a proposta aparece sem clique em **≤ 15 s**, com nome, valor, placa e a certificação **MOPP** do motorista; a região viva anuncia "1 nova proposta" e **o foco não se move**; axe nos dois temas |
| A4 | A | Aceita (diálogo), "Frete criado", segue por "Ver fretes"; o cartão mostra o motorista e "Pagar frete" |
| B5 | B | **Reflexo 2 (relógio acelerado):** o frete aparece na outra janela ("Aguardando pagamento", "Iniciar transporte") |
| B6 | B | Inicia o transporte (diálogo) |
| A5 | A | **Reflexo 3 (tempo real):** o andamento muda para "Em trânsito" em **≤ 15 s**, anunciado como "Transporte iniciado: ..." |
| A6 | A | Paga: o resumo mostra valor, percentual e comissão **exatamente como a API respondeu** (7,5 % e R$ 240,00, ver abaixo), "Pago, retido até a entrega", anúncio "Pagamento registrado"; axe nos dois temas |
| B7 | B | **Reflexo 4 (relógio acelerado):** "Pago, retido até a entrega" e o anúncio "Pagamento recebido: ..." |
| B8 | B | Confirma a entrega: "Liberado ao motorista", anúncio de entrega e pagamento liberado, sem botões no cartão |
| A7 | A | **Reflexo 5 (tempo real):** "Entregue", anúncio "Entrega confirmada: ...", pagamento **liberado** no cartão e no resumo (era o bug do item 4); axe nos dois temas, nas duas janelas |
| B9 | B | Sai ("Sair") e entra de novo pelo formulário: volta a "Cargas próximas", e "Meus fretes" mostra o frete entregue e liberado |

Há ainda 3 testes de **aba oculta**: em "Meus fretes" (empresa e motorista) e em "Propostas da carga", com relógio falso e o evento `visibilitychange`. Controle: com a aba visível, 30 s de relógio geram pelo menos 2 leituras (o teste enxerga o polling); com a aba oculta, 30 s geram **0**.

### Tempos medidos

Fluxo completo, do primeiro `POST /__mock/reset` ao último passo. Inclui 3 esperas reais de polling e 5 varreduras de axe (10 execuções, claro e escuro).

| | CI (Linux, run 39922814359) | Local (Windows; não confirmado em log do CI) |
|---|---|---|
| Fluxo completo | 52,3 s | 41 a 46 s |
| Reflexo: proposta chega à empresa (polling real) | 8,1 s | 8,5 a 9,1 s |
| Reflexo: andamento muda na empresa (polling real) | 9,4 s | 8,9 a 9,4 s |
| Reflexo: entrega chega à empresa (polling real) | 6,4 s | 7,9 a 9,5 s |
| Reflexo: frete e pagamento chegam ao motorista (relógio acelerado) | 60 ms e 67 ms | 24 a 36 ms |

Run do HEAD final do PR (39926060125, só docs a mais): fluxo 49,1 s; reflexos 8,5, 9,4 e 6,9 s; relógio acelerado 50 e 46 ms; Lighthouse mobile Performance 86 a 94; orçamento e 250 testes do Playwright iguais. Run anterior do CI (commit 17771d7, sem os passos B9 e MOPP): fluxo 48,7 s; reflexos 8,6, 9,5 e 5,9 s; relógio acelerado 58 e 51 ms. A variação de 5,9 a 9,5 s é a fase do polling de 10 s em relação ao momento da ação.

Todos abaixo dos 15 s da meta. O pior caso teórico do polling é 10 s mais o tempo da requisição. O roteiro humano de ≤ 5 min (PRD §8) depende de quem apresenta e do ambiente hospedado; o E2E mostra que a parte automática cabe em menos de 1 min.

### Mock com estado: a escolha e por quê

- **Problema:** os handlers de `mocks/handlers/*` não guardam nada (aceitar não cria frete na lista, pagar não muda `status_pagamento`), e o `dist/` tem `http://localhost:4010` embutido na hora do export. Um segundo servidor em outra porta não seria alcançado pelo app, e ligar o estado no servidor inteiro quebraria os outros specs, que rodam em paralelo no mesmo servidor.
- **Escolha:** `mocks/estado.ts` (o mundo em memória) e `mocks/handlers/comEstado.ts` (as rotas do MVP lendo e gravando esse mundo) entram **na frente** dos handlers de sempre no `servidor-http.ts`. Só atende quem é "do fluxo": token `fluxo-*`, ou e-mail `@fluxo.test` no login e no cadastro. Para todos os outros, o resolver devolve `undefined` e o MSW cai no handler sem estado, que continua idêntico (as únicas mudanças neles foram `export` de três funções de validação, para reuso). O Jest não usa os handlers com estado.
- **Reinício:** `POST /__mock/reset` (existe só no servidor de mocks). O spec chama no começo.
- **Fiel ao backend de hoje:** `GET /disponibilidades/minhas` e `GET /propostas/minhas` respondem **404 com HTML do Express**, como o backend real. Então o E2E também prova o **plano B** (disponibilidade ativa e propostas enviadas guardadas no aparelho) de ponta a ponta. A regra de MOPP (aprovada pelo admin e dentro da validade), a ordem por urgência e distância, a contraproposta única, os 409 e a transição `retido → liberado` na entrega seguem `docs/api.md`.
- **Comissão de 7,5 %, de propósito:** o backend usa 5 %. O mock do fluxo devolve 7,5 % para que um app que fixasse ou calculasse a comissão falhasse no teste. O app só exibe o que a API devolve.
- **Sem custo de bundle:** mocks e specs não entram no JS do app (o orçamento confere isso: `mockServiceWorker` e `setupWorker` proibidos).

## 2. Auditoria

### axe

`e2e/a11y.spec.ts`: as 15 rotas de `e2e/rotas.ts`, tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`, tema claro e escuro, mais o reflow em 320 px (sem rolagem horizontal) no projeto `estreito`. **0 violações**, no CI e local. Os specs de cada card cobrem também os diálogos abertos (proposta, aceitar, pagar). Este card acrescenta o axe nos estados com dados reais do fluxo, nos dois temas.

### Lighthouse (mediana de 3 execuções, CI)

Desktop (mesmo run): **100 nas 4 categorias em todas as 15 rotas.**

Mobile (4G simulado, CPU 4x mais lenta), run 39922814359. Acessibilidade, Boas práticas e SEO: **100 em todas as 15 rotas**. Performance:

| Rota | Performance |
|---|---|
| / | 91 |
| /cadastro | 92 |
| /cadastro/empresa | 89 |
| /entrar | 89 |
| /cadastro/motorista | 90 |
| /admin | 91 |
| /empresa/cargas | 88 |
| /empresa/fretes | 88 |
| /empresa/cargas/nova | 85 |
| /empresa/cargas/detalhe | 87 |
| /motorista/cargas | 85 |
| /motorista/disponibilidades | 90 |
| /motorista/disponibilidades/nova | 86 |
| /motorista/fretes | 86 |
| /nao-existe | 92 |

Performance mobile abaixo de 100 é decisão registrada (adendo do ADR 0011): o portão só avisa. O limite de 360 KiB de JS inicial é a causa conhecida; a meta de otimização (TanStack só nas áreas logadas, voltar a ≤ 340 KiB) segue para a janela de 25 a 28/10.

### Orçamento de bundle (CI, run 39922814359, KiB gzip nível 9)

| Rota | JS inicial | Folga até 360 KiB |
|---|---|---|
| / | 356,6 | 3,4 |
| /+not-found | 356,6 | 3,4 |
| /admin | 356,9 | 3,1 |
| /cadastro | 356,9 | 3,1 |
| /empresa/cargas/detalhe | 357,2 | 2,8 |
| /empresa/cargas/nova | 357,2 | 2,8 |
| /cadastro/empresa | 357,7 | 2,3 |
| /empresa/cargas | 358,1 | 1,9 |
| /cadastro/motorista | 358,5 | 1,5 |
| /motorista/cargas | 358,7 | 1,3 |
| /motorista/fretes | 358,7 | 1,3 |
| /motorista/disponibilidades/nova | 358,8 | 1,2 |
| /motorista/disponibilidades | 358,9 | 1,1 |
| /empresa/fretes | 359,3 | 0,7 |
| /entrar | 359,6 | 0,4 |

Outros limites: CSS 0,0 de 15 KiB; fontes (2 woff2) 25,2 de 40 KiB; HTML por rota 8 a 11 de 40 KiB; nenhum chunk de rota passa de 11 KiB (limite 30). **Todas as rotas estão a menos de 4 KiB do limite de 360**: qualquer card novo que some JS ao pacote inicial estoura o portão.

## 3. Achados

| # | Achado | Estado |
|---|---|---|
| 1 | **Bug de fluxo (corrigido).** Na tela "Meus fretes" da empresa, depois de pagar, o cartão e o "Resumo do pagamento" ficavam em "Pago, retido até a entrega" **para sempre**: o status guardado do 201 vencia o status da lista. Quando o motorista entregava, o polling trazia `liberado`, mas a tela não mudava (até recarregar, quando o resumo some). Correção em `CartaoFreteEmpresa`: vale o status da lista; só o `null` usa o que a API acabou de devolver. Teste de unidade e passo A7 do E2E cobrem. | corrigido |
| 2 | A varredura de axe feita logo depois de o diálogo de pagamento fechar acusou `color-contrast` (2 nós) em 2 de 3 execuções, sempre nesse ponto: o axe media um quadro no meio de uma transição. O helper do E2E agora espera as animações terminarem antes de medir; depois disso passou em 3 de 3 execuções locais e no CI. Não reproduz com a tela parada (as varreduras de rota do `a11y.spec.ts` seguem em 0). Fica o registro para quem escrever o próximo teste de axe: esperar o fim da animação. | tratado no teste |
| 3 | `cadastro/__tests__/empresa.test.tsx` falhou uma vez na suíte completa local (Windows, máquina carregada) e passou isolado e no CI. Intermitente já existente, sem relação com este card. | observado |
| 4 | O `npm run orcamento` rodado **no Windows** dá cerca de 2,2 KiB a mais por rota do que no CI (8 rotas acima de 360). É diferença de plataforma do build local, não regressão: o CI, que é o portão, passa. Use sempre o número do CI. | observado |

Nenhum outro bug de fluxo, foco ou anúncio apareceu: o foco não se move quando uma novidade chega por polling, os anúncios saem na ordem certa, e a aba oculta não faz requisições.

## 4. Checklist manual (o que foi coberto por teste automatizado)

| Item | Cobertura |
|---|---|
| Teclado | Specs de cada card: diálogos com foco preso, Esc, Enter, retorno do foco (propostas, fretes, pagamento) |
| Foco visível e foco nunca atrás da barra inferior | `sessao.spec.ts` (WCAG 2.4.11) |
| Leitor de tela | Roles e `aria-*` conferidos por axe e por consultas `getByRole`; anúncios da região viva conferidos no fluxo. **Leitor real não testado** |
| Contraste | axe nos dois temas, todas as rotas e estados do fluxo |
| Zoom 200 % e reflow 320 px | `a11y.spec.ts` (reflow) e `tema.spec.ts` (tela alta rola a 320 × 100) |
| Movimento reduzido | `portao.spec.ts`, `tema.spec.ts` |
| Erros associados aos campos | Specs de cadastro, login, publicar carga e disponibilidade, proposta |
| Navegador | Chromium (Playwright). Safari e Firefox não testados |

## 5. Dívida conhecida (não corrigida neste PR)

- **BarraAbas sticky e `target-size`:** a barra inferior (≤ 720 px) é `position: sticky` na base, tipo que o React Native não prevê e o código contorna com cast (`BarraAbas.tsx`); a regra `target-size` (WCAG 2.5.8) segue como ponto de atenção da barra. Hoje o axe passa e o foco nunca fica escondido atrás dela, mas é a parte mais frágil do layout móvel.
- **Rotas a menos de 4 KiB do limite de 360 KiB** (tabela acima; `/entrar` com 0,4 KiB e `/empresa/fretes` com 0,7 KiB de folga). Meta: voltar a ≤ 340 KiB na janela de 25 a 28/10.
- **Comissão some ao recarregar a página** (Q3 do PRD): `GET /fretes/meus` não traz `percentual_comissao` nem `valor_comissao`; depois do pagamento só aparece `status_pagamento`. Depende do backend (item 9 da seção 11 do PRD).
- **Performance mobile do Lighthouse entre 86 e 93** (aceita, ver acima).
- **Rotas do backend ainda ausentes:** `GET /propostas/minhas` (4a) e `GET /disponibilidades/minhas` (4b). O app funciona no plano B (aparelho), e o E2E prova isso, mas "Minhas propostas" (card 026) não existe, e a disponibilidade e as propostas enviadas não sobrevivem a trocar de aparelho ou limpar o navegador. Também sem rota: cancelar carga e disponibilidade, certificações do motorista e do admin.
- **Telas que não existem no MVP entregue:** minhas propostas (026), certificações (031 e 032), cancelamentos (033 e 034) e mapa (035).
- **Seed de demo:** o E2E usa o motorista com MOPP do mock. O seed real (2 motoristas com e sem MOPP aprovado e válido, senhas reais) é pedido ao Diogo (PRD §11, item 3) e não foi verificado.
- **Jest intermitente** em `cadastro/empresa.test.tsx` sob carga (achado 3).
- **Variação da Performance mobile entre runs** (85 a 93 na mesma base de código): o portão só avisa; não trate uma nota isolada como regressão.

## 6. Não verificado

- **iPhone / Expo Go:** nada foi aberto no aparelho nesta rodada. O E2E é web (react-native-web).
- **VoiceOver, Dynamic Type e leitores de tela reais** (NVDA, JAWS, TalkBack): só roles, rótulos e região viva por teste automatizado.
- **API real** (Render, cold start de ~50 s, CORS da Vercel, seed): tudo aqui roda contra mock. O roteiro hospedado de ≤ 5 min (PRD §8) segue por medir.
- **Navegadores além do Chromium.**

## 7. Como reproduzir

```bash
cd app
EXPO_PUBLIC_API_URL=http://localhost:4010 npm run export:ci
npx playwright test e2e/fluxo-completo.spec.ts --project=desktop   # só o fluxo (~1 min)
npm run e2e                                                         # tudo, com axe
npm run orcamento && npm run lhci:mobile && npm run lhci:desktop
```

Os tempos do fluxo saem no log como `FLUXO {...}` e no anexo `tempos-do-fluxo.json` do relatório do Playwright.


---

# Fase 6 (backend novo): auditoria do card 046

_Executada em 2026-11-12, sobre `origin/front` no commit `2387dd2` (merge do PR #140, card 046). **Números do CI** (Linux, `ubuntu-latest`): run 43171714333, head `2387dd2`, conclusão `success`, lidos do log do run (`gh run view 43171714333 --log`). Nada aqui vem da máquina do desenvolvedor. Esta seção acrescenta à auditoria do card 030 acima; as seções 1 a 7 continuam valendo para o fluxo da Fase 5 e **os números delas não foram atualizados**._

## Resumo (Fase 6)

| Item | Resultado |
|---|---|
| Jest | 198 suítes, 1823 testes, todos passaram (57,6 s) |
| E2E (Playwright, axe incluído) | 544 testes: **461 passaram, 83 pularam, 0 falharam**; nenhuma repetição ("flaky") no log |
| Fluxo da Fase 6 (certificação aprovada pelo admin, proposta, conversa nos dois lados, Pix) | **passa** no CI (29,0 s) |
| Aba oculta por 30 s | **0 requisições** em "Meus fretes" (empresa e motorista), "Propostas da carga" e "Minhas propostas", estes dois também com a conversa aberta |
| Lighthouse desktop, 21 rotas | **100 / 100 / 100 / 100** |
| Lighthouse mobile, 21 rotas | Acessibilidade, Boas práticas e SEO **100**; Performance **92 a 99** (aviso, não reprova) |
| Orçamento de JS inicial (360 KiB) | **respeitado** nas 21 rotas: 345,6 a 348,6 KiB, folga de 11,4 a 14,4 KiB |
| Job `web` | 32 min 23 s |
| iPhone / Expo Go, VoiceOver, Dynamic Type, leitor de tela real, zoom 200 % manual | **não verificados** (ver seção 3) |

## 1. Escopo entregue

Fonte: `docs/front/STATUS.md` e `gh pr list --state merged --base front` (data do merge entre parênteses). Todos em `front`.

| Card | PR | Estado |
|---|---|---|
| INT (contrato das rotas novas) | #108 | mergeado (04/11) |
| 036 Minhas propostas no formato real | #122 | mergeado (04/11) |
| 037 Validação de CPF, CNPJ e placa | #123 | mergeado (04/11) |
| 038 409 de disponibilidade, 404 de perfil, tetos, `nome` nulo | #121 | mergeado (05/11) |
| 040 Admin: casca e resumo | #125 | mergeado (05/11) |
| 026 Minhas propostas (tela) e "Mais" na barra | #124 | mergeado (05/11) |
| 042 Chat da proposta (empresa) | #127 | mergeado (05/11) |
| 031 Certificações do motorista | #126 | mergeado (09/11) |
| 043 Chat da proposta (motorista) | #133 | mergeado (09/11) |
| 032 Admin aprova certificações | #134 | mergeado (10/11) |
| 041 Admin: fretes e usuários | #135 | mergeado (10/11) |
| 035 Mapa sob demanda | #136 | mergeado (10/11) |
| 047 Chave Pix do motorista | #138 | mergeado (12/11) |
| 048 Pagamento por Pix da empresa | #139 | mergeado (12/11) |
| 046 E2E e auditoria da Fase 6 | #140 | mergeado (12/11) |

**Bloqueados pelo Diogo (rota ausente na `main`):** 033 Cancelar carga, 034 Cancelar disponibilidade e 044 Comissão, `proposta_id`, origem e destino em "Meus fretes". Contratos e erros em `docs/front/pedido-ao-diogo.md`; resumo e dúvidas novas em `docs/front/pedido-ao-diogo-2.md`. O 039 (protótipos) foi aprovado pelo Pedro e não tem código. O 045 (roteiro, contas e ensaio) segue aguardando as features e os seeds no Neon.

## 2. Portões no último CI do `front`

### Jest e E2E

| Portão | Resultado |
|---|---|
| Jest (`npm test -- --ci --coverage`) | 198 suítes, 1823 testes, 0 falhas, 57,6 s |
| E2E e axe | 461 passaram, 83 pularam, 0 falharam, 7,1 min (544 testes, projetos `desktop` e `estreito`) |

Os pulados são testes de um só projeto (`test.skip` por projeto: o fluxo e a aba oculta rodam no `desktop`; o reflow, no `estreito`).

Tempos do E2E em `e2e/fluxo-completo.spec.ts`. A linha `FLUXO` do log do CI é do fluxo da Fase 5; o teste da Fase 6 (linha 524) não imprime os reflexos.

| | CI (run 43171714333) |
|---|---|
| Fluxo da Fase 5, completo | 50,1 s |
| Reflexo: proposta chega à empresa (polling real) | 8,5 s |
| Reflexo: andamento muda na empresa (polling real) | 8,9 s |
| Reflexo: entrega chega à empresa (polling real) | 7,4 s |
| Reflexo: frete e pagamento chegam ao motorista (relógio acelerado) | 50 ms e 27 ms |
| Teste "Fase 6: certificação ... conversa nos dois lados e pagamento por Pix" | 29,0 s (cada reflexo com limite de 15 s por `expect.poll`) |

### Lighthouse (mediana de 3 execuções, 21 rotas)

Acessibilidade, Boas práticas e SEO: **100 em todas as 21 rotas, nos dois formatos**. Desktop: Performance **100 em todas**. Mobile (4G simulado, CPU 4x mais lenta): Performance como abaixo. A nota abaixo de 100 é `warn` (adendo do ADR 0011) e não reprova o PR.

| Rota | Performance mobile |
|---|---|
| / | 92 |
| /cadastro | 99 |
| /cadastro/empresa | 99 |
| /entrar | 99 |
| /cadastro/motorista | 98 |
| /admin | 99 |
| /admin/certificacoes | 97 |
| /admin/fretes | 99 |
| /admin/usuarios | 96 |
| /empresa/cargas | 98 |
| /empresa/fretes | 97 |
| /empresa/cargas/nova | 96 |
| /empresa/cargas/detalhe | 97 |
| /motorista/cargas | 94 |
| /motorista/disponibilidades | 97 |
| /motorista/disponibilidades/nova | 98 |
| /motorista/propostas | 96 |
| /motorista/fretes | 96 |
| /motorista/certificacoes | 99 |
| /motorista/chave-pix | 99 |
| /nao-existe | 99 |

Em `/`, uma das 3 execuções deu 0,53 (as outras, 0,92 e 0,95); a mediana é 0,92. Não trate uma execução isolada como regressão (ver a variação já registrada na seção 5 da Fase 5).

### Orçamento de JS inicial (`npm run orcamento`, KiB gzip, limite 360 KiB)

| Rota | JS inicial | Folga |
|---|---|---|
| /+not-found | 345,6 | 14,4 |
| /cadastro | 345,9 | 14,1 |
| /admin/certificacoes | 346,1 | 13,9 |
| /admin/fretes | 346,1 | 13,9 |
| /admin | 346,1 | 13,9 |
| /admin/usuarios | 346,1 | 13,9 |
| /empresa/cargas | 346,1 | 13,9 |
| /empresa/fretes | 346,1 | 13,9 |
| /empresa/cargas/detalhe | 346,2 | 13,8 |
| /empresa/cargas/nova | 346,2 | 13,8 |
| / | 346,3 | 13,7 |
| /cadastro/empresa | 346,7 | 13,3 |
| /cadastro/motorista | 347,5 | 12,5 |
| /motorista/cargas | 347,8 | 12,2 |
| /motorista/certificacoes | 347,8 | 12,2 |
| /motorista/chave-pix | 347,8 | 12,2 |
| /motorista/disponibilidades/nova | 347,8 | 12,2 |
| /motorista/fretes | 347,8 | 12,2 |
| /motorista/propostas | 347,8 | 12,2 |
| /motorista/disponibilidades | 348,0 | 12,0 |
| /entrar | 348,6 | 11,4 |

Outros limites (mesmo log): CSS 0,0 de 15 KiB; fontes (2 woff2) 25,2 de 40 KiB; HTML por rota 8,9 a 10,8 KiB de 40; o maior chunk de rota é `consultas-*.js` (TanStack), com 18,0 KiB de 30; os demais têm 11 KiB ou menos. O pacote inicial passou de 339 a 342 KiB (depois do PR #93, segundo o `STATUS.md`) para 345,6 a 348,6 KiB com as telas da Fase 6; a folga de 11 a 14 KiB comporta uma tela nova pequena, não várias.

### Tempo de cada passo do job `web` (run 43171714333)

| Passo | Tempo |
|---|---|
| Set up job, checkout e setup-node | 7 s |
| `npm ci` | 42 s |
| Exportar web | 33 s |
| `npm run orcamento` | 1 s |
| `npx playwright install --with-deps chromium` | 24 s |
| E2E e axe | 7 min 7 s |
| Lighthouse mobile | 11 min 47 s |
| Lighthouse desktop | 11 min 37 s |
| Resumo das notas e relatórios | 5 s |
| **Total do job** | **32 min 23 s** |

O job `qualidade` levou 1 min 51 s (`npm ci` 29 s, lint 10 s, typecheck 4 s, format 4 s, Jest 58 s). O card 046 pede para registrar o tempo do `web` e só mexer no workflow se passar de 35 min: ficou 2 min 37 s abaixo. O `timeout-minutes` do job é 50 (`.github/workflows/front.yml:54`). Os dois Lighthouse somam 23 min 24 s, cerca de 72 % do job.

## 3. Checklist manual WCAG 2.2 AA da Fase 6

**Ninguém fez este checklist à mão nesta rodada.** O que está como verificado foi lido no código ou provado por teste automatizado no CI do run acima; o que depende de aparelho ou de pessoa está como "não verificado".

| Item | Verificado por código e CI | Não verificado |
|---|---|---|
| Teclado | Specs por tela usam `page.keyboard` (certificações, admin, chat, "Minhas propostas", chave Pix, mapa, diálogos): foco preso, Esc, retorno do foco. O foco de "Cancelar reenvio" volta a "Reenviar" (`e2e/certificacoes-estados.spec.ts:124`). O foco do painel Pix vai ao resumo ou ao título quando o painel some (`components/molecules/PainelPix.tsx`, usado em `CartaoFreteEmpresa.tsx:230`; passo Pix de `fluxo-completo.spec.ts`) | Percorrer cada tela nova só com Tab, de ponta a ponta, por uma pessoa |
| Foco visível e não coberto pela barra | `e2e/sessao.spec.ts:178` (WCAG 2.4.11), herdado da Fase 5 | Nas telas novas sob a barra de 4 colunas, só o que o axe e o E2E enxergam |
| Contraste e `target-size` | axe (`wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`) nas 21 rotas, tema claro e escuro, 1280 e 320 px (`e2e/a11y.spec.ts`), e nos estados: certificações (vazio, erro da lista, erro do catálogo, reenvio, 409), admin, chat, mapa, Pix | `target-size` sob a barra fixa foi **contornado**, não resolvido (achado 3) |
| Reflow em 320 px | Rolagem horizontal ≤ 320 px nas 21 rotas (`a11y.spec.ts:29`), mais casos com texto longo sem espaços em certificações do admin, listas do admin, "Minhas propostas" com a conversa aberta e o mapa | **Zoom de 200 % feito no navegador por uma pessoa: não verificado.** A rolagem de `tema.spec.ts:163` (320 × 100) é só uma aproximação |
| Leitor de tela | Roles e `aria-*` por axe e `getByRole`; anúncios da região viva conferidos no E2E (chat, proposta, pagamento, entrega, Pix) | **VoiceOver, NVDA, JAWS e TalkBack: não verificado.** `Banner role=alert` não anuncia no iOS (achado 4); "Validade" lida duas vezes e a opção "(já aprovada)" selecionável no iOS são pendências **vistas na revisão do código, não confirmadas no aparelho** |
| Dynamic Type e fonte grande | — | **Dynamic Type 2× não verificado.** Risco conhecido pelo código: rótulos quebram no meio da palavra na barra de 4 colunas e no painel "Mais" (`minWidth` fixo de 236) |
| iPhone / Expo Go | — | **Não verificado.** O E2E é web (react-native-web); nada foi aberto no aparelho na Fase 6 |
| Movimento reduzido | `portao.spec.ts`, herdado da Fase 5 | Sem teste específico das telas novas (mapa, painel Pix, conversa) |
| Erros associados aos campos | Specs de certificações, chave Pix, pagamento e chat (telefone recusado no campo) | — |
| Privacidade na tela | O passo 3 do fluxo da Fase 6 afirma que nem CPF nem CNH do motorista aparecem na tela do admin (`fluxo-completo.spec.ts:573-590`) | O console do navegador do admin não é inspecionado por esse passo |
| Navegador | Chromium (Playwright) | Safari, Firefox, Chrome Android |
| API real | — | Tudo roda contra o mock de `mocks/servidor-http.ts`; Render, Neon e o modo de teste do Pix não foram exercitados |

## 4. Achados da Fase 6 e como foram resolvidos

A coluna "Rastro" aponta o PR ou o código. Nenhum achado abaixo tem issue ou card `fix:` com número em `gh issue list` de 12/11 (só as issues dos cards 026 a 046 e a #1). Onde a tabela diz "card `fix:` a criar/confirmar", o número **não foi confirmado**.

| # | Achado | Estado | Rastro |
|---|---|---|---|
| 1 | **Estouro intermitente de 320 px em `/motorista/propostas` (364 px).** Causa: o `Botao` (`Pressable` do react-native-web nasce com `flex-shrink: 0`) com rótulo longo, como "Ver frete de ...", passava da largura do cartão numa linha `flexWrap`. O teste de reflow só esperava o `h1` e media a página vazia, por isso falhava "às vezes". Correção na causa: `maxWidth: '100%'` no `Botao`, quebra de texto no título e na empresa do cartão, e o reflow passou a esperar a rede quieta | corrigido | #140; `components/atoms/Botao.tsx:136-139`; `e2e/a11y.spec.ts:36-38`; `e2e/minhas-propostas.spec.ts` (caso com texto longo e conversa aberta) |
| 2 | **Texto longo sem espaços no chat** estourava a largura. `overflow-wrap: anywhere` nos balões; reaproveitado em `ListaDeFatos`, no cartão de certificação pendente e em "Minhas propostas" | corrigido | #127 e #140; `lib/quebraDeTexto.ts`; `components/organisms/ConversaDaProposta.tsx:83-88` |
| 3 | **`target-size` (WCAG 2.5.8) reprova quando um campo ou botão para sob a barra inferior fixa.** Causa: a barra é `position: sticky` sem folga de rolagem no `TemplateTela`. **Contornado, não corrigido:** o bloco "Sua chave Pix" tem `minHeight` (`telas/CorpoChavePixMotorista.tsx:51-59`), a tela de publicar disponibilidade e a fixture da lista foram ajustadas, e os testes de axe em 320 px voltam ao topo (`window.scrollTo(0, 0)`) antes de medir | contornado; card `fix:` a criar/confirmar (a folga de rolagem está em outro PR, número não confirmado) | `e2e/certificacoes-estados.spec.ts:40`; dívida da seção 5 acima |
| 4 | **`Banner role="alert"` não anuncia no iOS** (achado A1 da auditoria do 040) | **pendente** | `components/molecules/Banner.tsx:68`; só se confirma em VoiceOver |
| 5 | **Foco do painel Pix se perdia** (caía no `body`) quando o painel some ou expira. Agora vai ao resumo do pagamento ou ao título | corrigido | #140; `PainelPix.tsx`; passo Pix de `fluxo-completo.spec.ts` |
| 6 | **Pix malformado** (resposta sem código de cópia): anúncio incoerente. Agora o anúncio e o aviso no cartão dizem o que aconteceu; há instrução de cópia no iPhone | corrigido | #140 |
| 7 | **Trocar o tipo da chave Pix mantinha o erro da chave** (campo e resumo); faltavam testes de `tipo_chave_pix`, 403, 404 e 409 | corrigido | #140 (commit `4a69cc3`) |
| 8 | **Certificações (031):** a ajuda da validade contradizia o erro noturno ("Pode ser hoje ou depois"); lista vazia depois de "Tentar de novo" sem alvo de foco; estados sem axe | corrigido | #140; `e2e/certificacoes-estados.spec.ts:114` |
| 9 | **Mapa (035):** falha dos ladrilhos sem aviso; A e B sobrepostos quando origem = destino; mapa geral não fechava com a lista vazia | corrigido | #140 (commit `134ddc9`); ADR 0017 |
| 10 | **Chat (043) e admin (041):** botão de conversa com o mesmo nome para a mesma empresa e carga (agora leva a data de envio); `maxWidth` sem nome; privacidade das telas admin conferida também por rótulo | corrigido | #140 |
| 11 | **`GET /certificacoes/pendentes` devolve `cpf` e `cnh` ao admin** (conferido em `origin/main` em 12/11, `backend/src/rotas/certificacoes.ts:93-94`). O app descarta os dois campos e o E2E afirma que não aparecem | contornado no front; o backend ainda envia | `fluxo-completo.spec.ts:573-590`; `pedido-ao-diogo-2.md` (P3) |

## 5. Pendências e dívida técnica restantes

Itens de `docs/front/STATUS.md` que seguem abertos depois do #140, mais o que esta rodada acrescentou.

**Acessibilidade e aparelho (nada disso foi verificado em aparelho)**
- **Dynamic Type 2× na barra de 4 colunas** e no painel "Mais" (rótulos quebram no meio da palavra, `minWidth` fixo de 236).
- **`accessibilityHint` do "Mais"** quando a página atual está dentro dele.
- **Salto h2 → h4 no painel da conversa** (card 043).
- **VoiceOver lê "Validade" duas vezes** (card 031).
- **Opção "(já aprovada)" selecionável no iOS** (card 031).
- **Copiar o Pix no iPhone:** sem `expo-clipboard`, o app só dá a instrução de copiar à mão (card 048).
- **`Banner role=alert` no iOS** (achado 4).
- **iPhone / Expo Go, VoiceOver e Dynamic Type** seguem sem sessão no aparelho; é ação do Pedro.

**Layout e privacidade**
- **Barra sticky sem folga de rolagem** (achado 3): o contorno do `minHeight` do bloco "Sua chave Pix" continua no lugar.
- **Privacidade do IP no OSM:** o mapa baixa ladrilhos de um servidor do OpenStreetMap, o que expõe o IP do usuário a ele; só carrega depois do clique, e a CSP futura está no ADR 0017.
- **`cpf` e `cnh` em `GET /certificacoes/pendentes`:** o dado sai do backend, o front só o descarta (achado 11).

**Backend e escopo**
- **Cards 033, 034 e 044** sem rota na `main`; "Minhas disponibilidades" segue no plano B do aparelho e a **comissão some ao recarregar** (Q3 do PRD).
- **Pix:** as duas telas (chave e pagamento) estão no ar e esperam o modo de teste do servidor para mostrar o QR. A parte do backend é o PR #137, aberto como rascunho na data desta auditoria. Dúvidas de contrato em `pedido-ao-diogo-2.md`.
- **Seeds no Neon** (`seed-demo.sql`, `seed-admin.sql`) sem confirmação de que rodaram.

**Testes e CI**
- **Performance mobile do Lighthouse** entre 92 e 99 nesta rodada (85 a 93 na Fase 5); varia de um run para outro, e o portão só avisa.
- **Pendências de baixa severidade das ondas 0 e 1** não tocadas: comentários desatualizados em `usePropostasDoMotorista.ts` e `tipos.ts`, título do teste "recusada ou aceita", campo Placa sem `ajuda`, aviso de perfil sem instrução, `refAviso` recriado a cada render.
- **Lighthouse não roda local:** a fonte das notas é o CI; as portas fixas 4173 e 4010 impedem E2E em paralelo entre worktrees.
- **Cada falha virou card `fix:`?** O critério de aceite do 046 pede número e link; ver a nota da seção 4.

## 6. Como conferir esta seção

```bash
gh run view 43171714333 --log    # Jest, E2E, orçamento, Lighthouse e tempos
gh run view 43171714333 --json jobs --jq '.jobs[].steps[] | [.name,.startedAt,.completedAt] | @tsv'   # tempo por passo
```

O resumo das notas do Lighthouse sai do passo "Resumo das notas do Lighthouse" (`app/scripts/lhci-resumo.mjs`); o relatório completo está no artefato `relatorios-web` do run.
