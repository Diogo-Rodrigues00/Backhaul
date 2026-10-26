# Backhaul: app (front-end)

Front-end do Backhaul, plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas (projeto da faculdade, Uniube). O diferencial do produto é o **matching por urgência**: o motorista vê as cargas próximas ordenadas por urgência e depois por distância, e a carga que exige certificação (por exemplo, MOPP) só aparece para quem tem.

É **um código só** em Expo (React Native + TypeScript) que roda:

- no **navegador** (react-native-web), exportado como site estático e **PWA instalável**, publicado na Vercel: <https://backhaul-front.vercel.app>;
- no **iPhone**, pelo app **Expo Go**.

O app não tem banco nem regra de negócio própria. Ele consome a API do repositório (`../backend`, contrato em [`../docs/api.md`](../docs/api.md)). A interface é toda em português do Brasil.

## O que já funciona

Estado em 23/10/2026, conferido no código de `src/app`. O congelamento de funcionalidades é 24/10.

| Perfil | Telas |
|---|---|
| Público | Login (`/entrar`), escolha de perfil (`/cadastro`), cadastro de empresa e de motorista (cadastro já entra logado), tela "Conectando ao servidor" |
| Empresa | Minhas cargas, Publicar carga, Propostas da carga (aceitar e recusar, atualiza sozinha), Meus fretes (acompanha a entrega e paga; mostra a comissão devolvida pela API) |
| Motorista | Minhas disponibilidades (escolhe a ativa), Publicar disponibilidade (cidade da lista ou GPS), Cargas próximas, proposta (aceitar o valor ou uma contraproposta), Meus fretes (inicia transporte e confirma entrega, atualiza sozinha) |
| Administrador | Só uma tela informando que não há telas para esse perfil |

**Fora do MVP:** "Minhas propostas" do motorista (card 026). A rota `/motorista/propostas` não existe e o item foi removido do menu do motorista. Cards "se der" (certificações, cancelamentos, mapa) não foram iniciados.

A página inicial `/` mostra a frase do produto e os botões "Entrar" (`/entrar`) e "Criar conta" (`/cadastro`); quem já tem sessão vai direto para a sua área.

## Pré-requisitos

- **Node.js 22.13 ou mais novo** (`engines` do `package.json`) e npm.
- Git.
- Para o iPhone: app **Expo Go** da App Store e uma conta Expo (gratuita). O Expo Go da loja roda **só o SDK 57**, o mesmo deste projeto; desligue a atualização automática de apps até 12/11 para a loja não trocar a versão (ADR 0001).
- Para os testes de navegador: Chromium do Playwright (`npx playwright install chromium`, uma vez).

## Instalação

```bash
cd app
cp .env.example .env     # no PowerShell: Copy-Item .env.example .env
npm install
```

O arquivo `.env` fica **fora do Git** (já está no `.gitignore`). Nunca coloque senha ou URL de produção no código.

## Variáveis de ambiente

Lidas no `.env` ao iniciar o Expo. Mudou o valor? Pare e rode de novo (`npx expo start --clear`).

| Variável | Para que serve | Valor do `.env.example` |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Endereço da API. É a **única** fonte da URL (`src/api/config.ts`); sem ela o app lança erro na primeira requisição | URL da API de produção |
| `EXPO_PUBLIC_API_MOCK` | Vazia: usa a API de verdade. `msw`: no **navegador**, intercepta as chamadas com dados de teste (ver "Modo mock") | vazia |

Para rodar com a API local do repositório (`backend/`, porta 3000), troque `EXPO_PUBLIC_API_URL` por `http://localhost:3000`.

> A API em produção fica em plano gratuito e **dorme**: a primeira chamada leva cerca de 50 s. O app mostra a tela "Conectando ao servidor" e entra sozinho quando o servidor responde (até 90 s; depois oferece "Tentar de novo").

## Rodar no navegador

```bash
npx expo start --web      # ou: npm run web
```

Abre em <http://localhost:8081>. Esse endereço está liberado no CORS da API de produção; outra porta ou outro domínio pode ser bloqueado pelo navegador.

## Rodar no iPhone (Expo Go)

```bash
npx expo login            # a MESMA conta Expo que está logada no Expo Go
npx expo start
```

Escaneie o QR code do terminal com a câmera do iPhone e abra no Expo Go (o computador e o iPhone precisam enxergar um ao outro na rede). Sem estar na mesma conta Expo, o Expo Go no iPhone físico não abre o projeto. Este caminho não é coberto por teste automático: é conferido à mão (VoiceOver e Dynamic Type nas telas de cada card).

## Modo mock (sem servidor)

Duas opções, ambas com os dados de teste de `mocks/`. Nada disso existe na API real.

**1. No navegador, com o MSW (service worker).** No `.env`:

```bash
EXPO_PUBLIC_API_URL=https://api.mock.backhaul.test
EXPO_PUBLIC_API_MOCK=msw
```

Depois `npx expo start --web --clear`. Entre com `empresa@mock.test`, `motorista@mock.test` ou `admin@mock.test` e **qualquer senha com 8 ou mais caracteres**. Só funciona na web (no iPhone o modo é ignorado). É o mesmo modo dos previews da Vercel. O código do MSW é removido do build de produção, e `npm run orcamento` falha se ele aparecer lá.

**2. Servidor de mock em Node (porta 4010).** Serve para testar o app em qualquer plataforma, inclusive com o Playwright e o Lighthouse CI:

```bash
npx tsx mocks/servidor-http.ts          # sobe o mock em http://localhost:4010
# em outro terminal, com EXPO_PUBLIC_API_URL=http://localhost:4010 no .env:
npx expo start --web --clear
```

No iPhone troque `localhost` pelo IP do computador na rede.

## Comandos úteis

Todos conferidos no `package.json`. Rode dentro de `app/`.

| Comando | O que faz |
|---|---|
| `npm start` / `npm run web` | Servidor de desenvolvimento do Expo (iPhone e web) / só web |
| `npm run lint` | ESLint via `expo lint` (inclui as bibliotecas proibidas do ADR 0001 e a regra de que componentes não importam `src/api`) |
| `npm run typecheck` | `tsc --noEmit` (TypeScript estrito) |
| `npm run format:check` | Prettier em modo verificação |
| `npm test` | Jest + Testing Library + MSW (testes ao lado do código e em `src/app/__tests__`). `npm test -- --ci --coverage` aplica o mínimo de 80% de linhas em `src/lib` e `src/api` |
| `npm run export:ci` | Exporta o site estático para `dist/` (para o CI, com `EXPO_PUBLIC_API_URL=http://localhost:4010`) |
| `npm run orcamento` | Confere o orçamento de bundle em `dist/` (ADR 0011) |
| `npm run e2e` | Playwright + axe contra `dist/` e o mock da API. Precisa do `export:ci` antes |
| `npm run lhci:mobile` / `npm run lhci:desktop` | Lighthouse CI (precisa do `export:ci` antes e de um Chrome instalado) |
| `npm run verificar:proibidos` | URL da API de produção fora do `.env.example`, `.env` versionado, comissão fixa no código e e-mails de demo (variável `DEMO_EMAILS`) |
| `npm run verificar` | Todos os portões acima, na ordem do CI, parando no primeiro que falhar |
| `npm run build:vercel` | Build de produção da Vercel (`expo export -p web` + ajustes de `dist/`) |
| `npm run gerar:icones` | Regera os ícones do PWA |

Uma execução completa, como o CI faz:

```bash
npm run lint && npm run typecheck && npm run format:check
npm test -- --ci --coverage
npm run verificar:proibidos
EXPO_PUBLIC_API_URL=http://localhost:4010 npm run export:ci   # no PowerShell: $env:EXPO_PUBLIC_API_URL="http://localhost:4010"; npm run export:ci
npm run orcamento
npx playwright install chromium     # uma vez
npm run e2e
```

Problemas conhecidos:

- Em máquina lenta ou com muitos núcleos, `npm test` pode estourar o tempo de alguns testes. `npm test -- --maxWorkers=2` resolveu na máquina onde isto foi conferido.
- No Windows, depois do `npm run e2e` os servidores de mock (4010) e do site (4173) podem continuar abertos. Se a próxima execução reclamar de porta em uso, encerre o processo que usa a porta.
- `npm run orcamento` mede o `dist/` gerado na sua máquina. Em 23/10, a exportação local no Windows ficou 0,4 a 1,9 KiB acima do limite de JS inicial (360 KiB) em oito rotas, enquanto o CI (Linux) passou no mesmo commit. O CI é a referência: confira o resultado dele antes de dar o orçamento por quebrado.

## Estrutura

```
app/
├── src/
│   ├── app/          rotas = telas (expo-router). Único lugar que usa src/api
│   ├── components/   atoms → molecules → organisms → templates (atomic design)
│   ├── telas/        corpo das telas pesadas, carregado sob demanda pela rota
│   ├── api/          cliente HTTP, tipos do contrato, fetchers e hooks de dados (TanStack Query, só nas áreas logadas)
│   ├── state/        sessão, tema e disponibilidade ativa
│   ├── lib/          funções puras: formatação, validação, rótulos, erros, armazenamento
│   ├── theme/        tokens do design system, CSS global, tipografia
│   ├── data/         lista fixa de cidades (lat/lng)
│   └── hooks/        hooks genéricos (anúncios, movimento reduzido)
├── mocks/            MSW: handlers e dados de teste (testes, CI e preview)
├── e2e/              Playwright + axe; e2e/rotas.ts é a lista de rotas que o axe e o Lighthouse percorrem
├── scripts/          orçamento de bundle, verificações, servidores do CI, ícones
├── public/           manifesto do PWA, service worker, ícones, fontes
└── vercel.json       cabeçalhos e cache do deploy
```

Onde achar cada resposta técnica: [`../docs/front/mapa-do-codigo.md`](../docs/front/mapa-do-codigo.md). Índice de toda a documentação do front: [`../docs/front/README.md`](../docs/front/README.md).

## Portões de qualidade

Todo PR para a branch `front` roda o workflow [`.github/workflows/front.yml`](../.github/workflows/front.yml) e só entra com tudo verde:

| Portão | Regra |
|---|---|
| Lint, tipos, formatação | `npm run lint`, `typecheck`, `format:check` sem erros |
| Testes | Jest; mínimo de 80% de linhas em `src/lib` e `src/api` |
| Proibidos | Sem URL de produção no código, sem `.env` no Git, sem comissão fixa, sem e-mails de demo |
| Orçamento de JS | Em gzip: JS inicial de cada rota ≤ 360 KiB (368.640 bytes), chunk de rota ≤ 30 KiB, CSS ≤ 15 KiB, fontes ≤ 40 KiB, HTML ≤ 40 KiB; sem código de mock no build. O limite subiu de 220 KB para 360 KiB por decisão do Pedro; a meta de otimização é voltar a ≤ 340 KiB (ADR 0011) |
| Acessibilidade | WCAG 2.2 AA: axe com 0 violações em toda rota, nos temas claro e escuro, em 1280 px e 320 px, mais checklist manual por card (teclado, foco visível, leitor de tela, contraste, zoom 200%, reflow em 320 px, movimento reduzido, erros associados aos campos) |
| Lighthouse | Acessibilidade, Boas práticas e SEO = 100 em mobile e desktop, em todas as rotas; Performance desktop = 100; Performance mobile só avisa (aceita abaixo de 100 por decisão do Pedro) |

## Deploy e PWA

- **Vercel**, projeto com Root Directory `app`. `vercel.json` define o build (`npm run build:vercel`), a pasta `dist` e os cabeçalhos de cache. Produção usa a API real (`EXPO_PUBLIC_API_URL` configurada no painel da Vercel); previews usam o modo mock (`EXPO_PUBLIC_API_MOCK=msw`), porque a URL de cada preview não está no CORS da API (ADR 0014).
- Para publicar em produção a partir do repositório: `vercel deploy --prod --yes` (responsabilidade do Pedro, `docs/front/STATUS.md`).
- A API precisa ter o domínio da Vercel no `CORS_ORIGIN`. Se o site publicado não consegue entrar, é a primeira coisa a conferir.
- **PWA:** manifesto em `public/manifest.webmanifest`, ícones em `public/icones/`, service worker em `public/sw.js` (feito à mão, só guarda arquivos do próprio site; nunca a API), registro em `src/lib/pwa.web.ts` somente no build de produção. Instalável no Chrome e no Edge, e adicionável à tela inicial do iPhone.

## Mais documentação

- Contrato da API: [`../docs/api.md`](../docs/api.md)
- Produto e escopo: [`../docs/front/prd.md`](../docs/front/prd.md), [`../docs/front/mvp.md`](../docs/front/mvp.md)
- Decisões técnicas (ADRs): [`../docs/front/adr/`](../docs/front/adr/) e [`../docs/front/arquitetura.md`](../docs/front/arquitetura.md)
- Design system: [`../docs/front/design-system.md`](../docs/front/design-system.md)
- Roteiro da demonstração: [`../docs/front/roteiro-demo.md`](../docs/front/roteiro-demo.md)
- Regras de trabalho do diretório (para agentes e colaboradores): [`CLAUDE.md`](CLAUDE.md)
