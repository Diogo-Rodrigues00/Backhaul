# Arquitetura do front-end — Backhaul

_Versão 1.0 · 2026-10-20 · Autor: tech-lead · Status: proposto (aguarda aprovação do Pedro)._

Resumo para quem vai codar: Expo SDK 57 + expo-router (saída estática na web), TanStack Query para dados, react-hook-form com validadores próprios, tema por variáveis CSS na web, MSW só em testes/CI/preview. Cada decisão tem um ADR em `docs/front/adr/`.

## 1. ADRs

| # | Tema | Decisão em uma linha |
|---|---|---|
| [0001](adr/0001-expo-sdk-e-versoes.md) | SDK e versões | Expo SDK 57 (o Expo Go da App Store ainda não roda o 58); versões fixadas; lista de libs proibidas |
| [0002](adr/0002-roteamento-expo-router.md) | Roteamento | expo-router em `src/app`, `web.output: static`, divisão por rota, `<Slot />`, ids por query string |
| [0003](adr/0003-estrutura-atomic-design.md) | Estrutura | Atomic design com direção de import; nomes de domínio em pt-BR; tokens só em `src/theme` |
| [0004](adr/0004-dados-do-servidor.md) | Dados | TanStack Query; chaves centralizadas; invalidação após mutação |
| [0005](adr/0005-camada-api-erros-mocks.md) | API | Cliente `fetch` + `ErroApi`; 401 global; portão `/saude`; MSW em Jest, servidor de mocks (CI) e worker (preview) |
| [0006](adr/0006-sessao-e-token.md) | Sessão | SecureStore no iPhone, `localStorage` na web; `SessaoProvider`; guardas em efeito |
| [0007](adr/0007-formularios-e-validacao.md) | Formulários | react-hook-form + validadores próprios; `aplicarErroApi` com foco no resumo |
| [0008](adr/0008-temas-e-tokens.md) | Tema | Tokens em `src/theme/tokens.ts`; web via variáveis CSS + `data-tema`; iPhone via valores |
| [0009](adr/0009-acessibilidade-no-expo.md) | Acessibilidade | Tabela de padrões web × iPhone, cada um num atom/molecule |
| [0010](adr/0010-atualizacao-automatica.md) | Polling | `refetchInterval` 10 s + `focusManager`; `useAnunciarNovidades` |
| [0011](adr/0011-performance-e-lighthouse.md) | Performance | HTML estático com `h1` fixo, orçamento de bundle, portão de viabilidade no card 001 |
| [0012](adr/0012-testes.md) | Testes | Jest + RNTL + MSW; Playwright + axe; LHCI mobile/desktop; checklist iPhone |
| [0013](adr/0013-ci-e-portoes.md) | CI | GitHub Actions `qualidade` + `web`; proteção da `front` pelo Pedro |
| [0014](adr/0014-deploy-vercel-e-pwa.md) | Deploy/PWA | Vercel com root `app`; preview com MSW; `sw.js` à mão |
| [0015](adr/0015-formatacao-pt-br-e-textos.md) | Formatação | `Intl` pt-BR, rótulos e vencimento em `src/lib` |

## 2. Árvore de `app/`

```
app/
├── CLAUDE.md                     # regras do front (já existe)
├── app.json                      # nome, scheme, web.output "static", plugin expo-router (asyncRoutes web), typedRoutes
├── package.json                  # scripts: start, web, lint, typecheck, test, export:ci, orcamento, e2e, lhci:*, verificar
├── package-lock.json
├── tsconfig.json                 # strict, noUncheckedIndexedAccess, paths "@/*" → "src/*"
├── eslint.config.js              # eslint-config-expo + no-restricted-imports (libs proibidas, src/api fora das telas)
├── .prettierrc
├── .env.example                  # EXPO_PUBLIC_API_URL=  · EXPO_PUBLIC_API_MOCK=  (sem valores reais além do exemplo)
├── jest.config.js                # preset jest-expo, setup MSW, coverageThreshold src/lib e src/api
├── jest.setup.ts
├── playwright.config.ts          # webServer = scripts/servidores-ci.mjs; projetos 1280 px e 320 px
├── lighthouserc.mobile.cjs       # URLs de e2e/rotas.ts, minScore 1 nas 4 categorias
├── lighthouserc.desktop.cjs      # idem com preset desktop
├── vercel.json                   # cleanUrls, cabeçalhos de cache e segurança
├── public/                       # copiado para dist/
│   ├── manifest.webmanifest
│   ├── sw.js                     # service worker do PWA (ADR 0014)
│   ├── mockServiceWorker.js      # gerado por `npx msw init public` (só usado em preview)
│   ├── robots.txt
│   ├── fontes/                   # barlow-latin-500.woff2, barlow-latin-700.woff2 (ADR 0008)
│   ├── favicon.ico
│   └── icones/                   # 192, 512, 512-maskable, apple-touch-icon-180
├── scripts/
│   ├── orcamento-bundle.mjs      # soma gzip dos <script> de cada HTML de dist/ (ADR 0011)
│   ├── verificar-proibidos.mjs   # onrender.com, comissão fixa, .env, e-mails de demo
│   ├── servidores-ci.mjs         # sobe mocks (4010) + serve dist (4173) e imprime "pronto"
│   └── lhci-login.cjs            # grava token de mock no localStorage antes de cada URL logada
├── mocks/                        # MSW: só testes, CI e preview
│   ├── fixtures/                 # cargas, propostas, fretes, disponibilidades, certificações, usuários
│   ├── handlers/                 # saude.ts, sessao.ts, certificacoes.ts, cargas.ts, disponibilidades.ts,
│   │                             # propostas.ts, fretes.ts, index.ts (criarHandlers(baseUrl))
│   ├── node.ts                   # setupServer (Jest)
│   ├── browser.ts                # setupWorker (preview Vercel)
│   └── servidor-http.ts          # @mswjs/http-middleware na porta 4010 (Playwright e LHCI)
├── e2e/
│   ├── rotas.ts                  # lista única de rotas web + perfil (axe e Lighthouse leem daqui)
│   ├── fixtures.ts               # login por token de mock
│   ├── a11y.spec.ts              # axe em toda rota × 2 temas × 2 larguras
│   └── <card>.spec.ts            # caminho feliz de cada card
└── src/
    ├── app/                      # ROTAS = TELAS (único lugar que usa src/api)
    │   ├── +html.tsx             # <html lang="pt-BR">, meta, manifesto, CSS do tema, script data-tema
    │   ├── +not-found.tsx
    │   ├── _layout.tsx           # QueryClientProvider, TemaProvider, SessaoProvider, PortaoServidor, RegiaoViva, PWA
    │   ├── index.tsx             # "/" apresentação; com sessão → área do perfil
    │   ├── entrar.tsx
    │   ├── cadastro/
    │   │   ├── index.tsx         # escolha motorista × empresa
    │   │   ├── empresa.tsx
    │   │   └── motorista.tsx
    │   ├── empresa/
    │   │   ├── _layout.tsx       # guarda tipo "empresa" + Cabecalho com navegação da empresa
    │   │   ├── cargas/
    │   │   │   ├── index.tsx     # minhas cargas
    │   │   │   ├── nova.tsx      # publicar carga
    │   │   │   └── detalhe.tsx   # ?id= propostas da carga
    │   │   └── fretes.tsx
    │   ├── motorista/
    │   │   ├── _layout.tsx       # guarda tipo "motorista" + DisponibilidadeAtivaProvider + Cabecalho
    │   │   ├── cargas.tsx        # cargas próximas + fazer proposta (diálogo)
    │   │   ├── disponibilidades/
    │   │   │   ├── index.tsx
    │   │   │   └── nova.tsx
    │   │   ├── propostas.tsx
    │   │   ├── fretes.tsx
    │   │   └── certificacoes.tsx # se der
    │   └── admin/
    │       ├── _layout.tsx       # guarda tipo "admin"
    │       └── index.tsx         # D-PO-10 (ou aprovação de certificações, se der)
    ├── components/
    │   ├── atoms/                # Texto, Titulo, Botao, Link, SeloUrgencia, Etiqueta, MarcadorKm, Preco, Carregando, Esqueleto,
    │   │                         # DivisorEstrada, Logo, RegiaoViva, TextoOculto, Icone(.web/.native), icones.ts
    │   ├── molecules/            # CampoTexto, CampoSenha, CampoNumero, CampoSelecao, GrupoOpcoes, ResumoErros, formulario.ts,
    │   │                         # Banner, BarraNovidades, BotaoAtualizar, Lista, EstadoVazio, EstadoErro, AbaNavegacao, AlternarTema,
    │   │                         # LinhaRota, ListaDeFatos, AndamentoFrete, ResumoCarga, ResumoMotorista, ResumoFrete, ResumoPagamento
    │   ├── organisms/            # Cabecalho, BarraAbas, CartaoFormulario, PainelMarca, BarraContexto,
    │   │                         # DialogoConfirmacao, PortaoServidor, SeletorLocal, FormularioProposta,
    │   │                         # CartaoCargaEmpresa, CartaoProposta, CartaoDisponibilidade, CartaoCargaProxima,
    │   │                         # CartaoMinhaProposta, CartaoFreteMotorista, CartaoFreteEmpresa
    │   └── templates/            # TemplateTela, TemplateLista, TemplateFormulario, TemplateFormularioComPrevia,
    │                             # TemplateCentralizado, TemplateAutenticacao
    ├── api/
    │   ├── config.ts             # lê EXPO_PUBLIC_API_URL / EXPO_PUBLIC_API_MOCK
    │   ├── cliente.ts            # requisitar(), configurarCliente()
    │   ├── tipos.ts              # tipos do contrato + propostas 4a/4b
    │   ├── chaves.ts             # chaves do TanStack Query
    │   ├── consulta.ts           # QueryClient, INTERVALO_ATUALIZACAO_MS
    │   ├── foco.web.ts / foco.native.ts   # focusManager × AppState
    │   └── saude.ts, sessao.ts, certificacoes.ts, cargas.ts, disponibilidades.ts, propostas.ts, fretes.ts
    ├── state/
    │   ├── sessao/               # SessaoProvider, useSessao
    │   ├── tema/                 # TemaProvider, useTema, useEstilos
    │   └── disponibilidade-ativa/ # DisponibilidadeAtivaProvider (D-PO-03)
    ├── hooks/                    # useMovimentoReduzido, useAnunciarNovidades
    ├── lib/                      # erros (ErroApi, separarMensagens), formatacao, rotulos, vencimento, prazos, validacao, numeros,
    │                             # armazenamento(.web/.native), a11y(.web/.native), pwa(.web/.native), cidades
    ├── data/
    │   └── cidades.ts            # lista fixa {nome, uf, lat, lng} (fornecida pelos membros, Q1)
    └── theme/
        ├── tokens.ts             # bloco 3.5 do design-system colado sem mudança (ADR 0008)
        ├── css.ts                # gera CSS global: variáveis dos 2 temas, @font-face, @media dos pontos de quebra
        ├── tipografia.ts         # fonte(nivel) por plataforma (rem na web, número no iPhone)
        ├── responsivo.ts         # nomes de dataSet permitidos (web) + useLargura (iPhone)
        └── fontes.native.ts      # useFonts da Barlow (só iPhone)
```

## 3. Mapa rota → tela → itens MVP

| Rota web | Arquivo (`src/app/…`) | Tela | Perfil | Itens | Atualiza sozinha | Card |
|---|---|---|---|---|---|---|
| (sobreposição) | `_layout.tsx` | Conectando ao servidor | todos | MVP-02 | tentativas de 5 s | 014 |
| `/` | `index.tsx` | Apresentação + "Entrar" / "Criar conta" | público | MVP-01 | — | 001 (casca), 013 (redireciona) |
| `/entrar` | `entrar.tsx` | Login (+ aviso de sessão expirada) | público | MVP-03, MVP-04 | — | 015 |
| `/cadastro` | `cadastro/index.tsx` | Escolher motorista ou empresa | público | MVP-03 | — | 016 |
| `/cadastro/empresa` | `cadastro/empresa.tsx` | Cadastro de empresa | público | MVP-05 | — | 016 |
| `/cadastro/motorista` | `cadastro/motorista.tsx` | Cadastro de motorista | público | MVP-06 | — | 017 |
| `/empresa/cargas` | `empresa/cargas/index.tsx` | Minhas cargas | empresa | MVP-09 | não (botão) | 020 |
| `/empresa/cargas/nova` | `empresa/cargas/nova.tsx` | Publicar carga | empresa | MVP-08, MVP-07 | — | 019 (018) |
| `/empresa/cargas/detalhe?id=` | `empresa/cargas/detalhe.tsx` | Propostas da carga, aceitar/recusar | empresa | MVP-14 (MVP-21 se der) | sim | 021 (033) |
| `/empresa/fretes` | `empresa/fretes.tsx` | Meus fretes + pagar | empresa | MVP-17 | sim | 028 |
| `/motorista/cargas` | `motorista/cargas.tsx` | Cargas próximas + fazer proposta | motorista | MVP-12, MVP-13 | não (botão) | 024, 025 |
| `/motorista/disponibilidades` | `motorista/disponibilidades/index.tsx` | Minhas disponibilidades, escolher ativa | motorista | MVP-11 (MVP-22 se der) | não (botão) | 022 (034) |
| `/motorista/disponibilidades/nova` | `motorista/disponibilidades/nova.tsx` | Publicar disponibilidade | motorista | MVP-10, MVP-07 | — | 023 (018) |
| `/motorista/propostas` | `motorista/propostas.tsx` | Minhas propostas | motorista | MVP-15 | sim | 026 |
| `/motorista/fretes` | `motorista/fretes.tsx` | Meus fretes + status | motorista | MVP-16 | sim | 027 |
| `/motorista/certificacoes` | `motorista/certificacoes.tsx` | Minhas certificações | motorista | MVP-19 (se der) | — | 031 |
| `/admin` | `admin/index.tsx` | Perfil admin sem telas (D-PO-10) / aprovar certificações | admin | D-PO-10, MVP-20 (se der) | — | 013 (032) |
| qualquer outra | `+not-found.tsx` | Página não encontrada | todos | MVP-01 | — | 001 |

Navegação do cabeçalho: empresa → Minhas cargas · Publicar carga · Meus fretes; motorista → Cargas próximas · Disponibilidades · Minhas propostas · Meus fretes. Sempre: nome do usuário (`GET /eu`), alternar tema, Sair.

## 4. Fluxo de dados

```
tela (src/app) ──usa──▶ hook de dados (src/api/<recurso>.ts) ──▶ requisitar() ──▶ API (EXPO_PUBLIC_API_URL)
   │                          │ TanStack Query (cache, polling, invalidação)          │
   │                          └──────── ErroApi ◀──── normaliza erro/erros/não-JSON ◀──┘
   ├──▶ template ─▶ organisms ─▶ molecules ─▶ atoms   (dados por props; estilo por useTema/useEstilos)
   └──▶ src/state (sessão, tema, disponibilidade ativa) ─▶ src/lib/armazenamento (SecureStore | localStorage)
401 em rota protegida ─▶ aoSessaoExpirada() ─▶ sair('sessao-expirada') ─▶ /entrar?aviso=sessao-expirada
```

## 5. Rotas da API usadas

| Rota | Situação | Usada por (card) |
|---|---|---|
| `GET /saude` | ✅ | 014 |
| `POST /login`, `GET /eu` | ✅ | 013, 015, 016, 017 |
| `POST /cadastro/empresa` / `motorista` | ✅ | 016 / 017 |
| `GET /certificacoes` | ✅ | 019 (031) |
| `POST /cargas`, `GET /cargas/minhas` | ✅ | 019, 020, 021 |
| `POST /disponibilidades` | ✅ | 023 |
| `GET /disponibilidades/minhas` | 🔜 proposta 4b, MSW | 022, 024 |
| `GET /cargas/proximas` | ✅ | 024 |
| `POST /propostas` | ✅ | 025 |
| `GET /propostas/minhas` | 🔜 proposta 4a, MSW | 024, 025, 026 |
| `GET /cargas/:id/propostas`, `POST /propostas/:id/responder` | ✅ | 021 |
| `GET /fretes/meus`, `PATCH /fretes/:id/status`, `POST /fretes/:id/pagamento` | ✅ | 027, 028 |
| C1, C2, D1–D5 (relatório 4c/4d) | 🔜 só "se der", com rota em `main` | 031–034 |

## 6. Componentes do design-system → código

O `design-system.md` usa nomes em inglês; o código usa pt-BR (ADR 0003). Esta tabela é a ponte. Estados e visual: sempre os do DS.

| DS | Código | Nível | Card |
|---|---|---|---|
| Button | `Botao` | atom | 008 |
| Link | `Link` | atom | 008 |
| UrgencyBadge | `SeloUrgencia` | atom | 008 |
| StatusTag | `Etiqueta` | atom | 008 |
| KmMarker | `MarcadorKm` | atom | 008 |
| Price | `Preco` | atom | 008 |
| Icon | `Icone` (`.web`/`.native`) | atom | 008 |
| Spinner | `Carregando` (sempre com texto) | atom | 008 |
| Skeleton | `Esqueleto` | atom | 008 |
| RoadDivider | `DivisorEstrada` | atom | 008 |
| Logo | `Logo` | atom | 008 |
| — | `Texto`, `Titulo`, `RegiaoViva`, `TextoOculto` | atom | 008 |
| TextInput + FormField | `CampoTexto` | molecule | 009 |
| PasswordField | `CampoSenha` | molecule | 009 |
| AffixField | `CampoNumero` | molecule | 009 |
| Select | `CampoSelecao` | molecule | 009 |
| ChoiceChip, UrgencyPicker, DeadlinePicker | `GrupoOpcoes` | molecule | 009 |
| ErrorSummary | `ResumoErros` | molecule | 009 |
| FormCard | `CartaoFormulario` | organism | 009 |
| FormPageTemplate | `TemplateFormulario` | template | 009 |
| FormWithPreviewTemplate | `TemplateFormularioComPrevia` | template | 009 |
| AppHeader | `Cabecalho` (variantes `completo` e `simples`) | organism | 010 |
| TabBar | `BarraAbas` | organism | 010 |
| NavTab | `AbaNavegacao` | molecule | 010 |
| ThemeToggle | `AlternarTema` | molecule | 010 |
| Banner | `Banner` | molecule | 010 |
| LiveBar | `BarraNovidades` (+ `BotaoAtualizar`) | molecule | 010 |
| EmptyState | `EstadoVazio` | molecule | 010 |
| AppPageTemplate | `TemplateTela` | template | 010 |
| ListTemplate | `TemplateLista` | template | 010 |
| ConfirmDialog | `DialogoConfirmacao` | organism | 011 |
| RouteLine | `LinhaRota` | molecule | 012 |
| FactList | `ListaDeFatos` | molecule | 012 |
| Stepper | `AndamentoFrete` | molecule | 012 |
| — | `ResumoCarga`, `ResumoMotorista`, `ResumoFrete` | molecule | 012 |
| CenteredTemplate | `TemplateCentralizado` | template | 014 |
| AuthTemplate / AuthHero | `TemplateAutenticacao` / `PainelMarca` | template / organism | 015 |
| CityCombobox + GpsButton | `SeletorLocal` | organism | 018 |
| CargaCard (empresa) | `CartaoCargaEmpresa` | organism | 020 |
| PropostaCard (empresa) | `CartaoProposta` | organism | 021 |
| CargaCard (motorista) | `CartaoCargaProxima` | organism | 024 |
| ContextBar | `BarraContexto` | organism | 024 |
| PropostaCard (motorista) | `CartaoMinhaProposta` | organism | 026 |
| FreteCard | `CartaoFreteMotorista` / `CartaoFreteEmpresa` | organism | 027 / 028 |
| PaymentSummary | `ResumoPagamento` | molecule | 028 |
