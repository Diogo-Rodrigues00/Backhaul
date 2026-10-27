# Auditoria final do front (card 030)

_Executada em 2026-10-23, sobre `origin/front` (commit 6ddab38) + PR #89 do card 030. **Números do CI** (Linux, `ubuntu-latest`): run 39922814359, commit b372346, que tem o mesmo código do app do HEAD do PR (o commit seguinte só altera este documento). Os números marcados como "local" vêm da máquina Windows 11 do desenvolvedor, **não estão em nenhum log do CI** e são só referência. `#88` (só docs) entrou em `front` depois do run citado e não muda o JS; o `#90` ainda não estava em `front`: depois que entrar, rode `npm run orcamento` de novo (a home nova mexe em `/`; `/entrar` tem só 0,4 KiB de folga)._

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
