# ADR 0004 — Dados do servidor com TanStack Query

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
Telas listam dados da API, enviam ações e três delas atualizam sozinhas a cada ~10 s só com a aba visível. Precisamos de cache, invalidação após ações, deduplicação e polling que pare com a aba oculta, na web e no iPhone.

## Decisão
- **@tanstack/react-query ^5.104.5** (~12 KB gzip). Um `QueryClient` criado em `src/api/consulta.ts` e provido no `src/app/_layout.tsx`.
- Padrões: `queries: { retry: (falhas, erro) => !eErro4xx(erro) && falhas < 1, staleTime: 5_000, refetchOnWindowFocus: true, refetchIntervalInBackground: false }`, `mutations: { retry: 0 }`.
- `focusManager`: na web o padrão do TanStack (`visibilitychange`) basta. No nativo, ligar ao `AppState` em `src/api/foco.native.ts` (e `foco.web.ts` vazio).
- Chaves em `src/api/chaves.ts` (`chaves.cargas.minhas()`, `chaves.propostas.daCarga(id)` …). Proibido chave literal fora desse arquivo.
- Um módulo por recurso em `src/api/` (`sessao.ts`, `saude.ts`, `certificacoes.ts`, `cargas.ts`, `disponibilidades.ts`, `propostas.ts`, `fretes.ts`) exportando funções de requisição puras (`listarMinhasCargas()`) e hooks (`useMinhasCargas()`, `usePublicarCarga()`).
- Após mutação com sucesso: `invalidateQueries` das chaves afetadas, listadas no próprio hook. Sem atualização otimista.
- Queries da área logada só ficam `enabled` com sessão autenticada e servidor pronto (ADR 0005).
- Estado que não vem do servidor: `useState` local; contextos só para sessão, tema e disponibilidade ativa (`src/state`). Sem biblioteca de estado global.
- Atualização automática: ADR 0010.

## Alternativas
- **Hooks próprios com `fetch` + `useEffect`:** zero dependência, mas teríamos de escrever cache, deduplicação, polling com visibilidade e invalidação; mais chance de erro em 4 dias.
- **SWR:** menor, mas sem integração pronta com `AppState` e menos controle de mutação.

## Consequências
- Um único padrão de dados para todos os agentes; revisor confere chaves e invalidações.
- Custo de bundle aceito dentro do orçamento (ADR 0011).

## Adendo — 2026-10-25 (meta aprovada pelo Pedro no adendo 3 do ADR 0011): o TanStack Query só carrega nas áreas logadas
**Por quê.** O `QueryClientProvider` no `_layout.tsx` raiz e o `SessaoProvider` com `useQueryClient` levavam o pacote (~18 KiB gzip) ao JS inicial de toda rota, inclusive `/entrar` e `/`. Mover o provider para dentro de `AreaProtegida` não resolve: o Metro (serializador do Expo) põe no chunk `__common`, que o `entry` exige em toda página, qualquer módulo que dois chunks assíncronos importam, e as telas das áreas importam os hooks. Medido: com o provider em `AreaProtegida` o JS inicial não mudou.

**Decisão.** (a ordem Tema → Query → Sessão acima passa a valer assim: Tema → Sessão → Portão no layout raiz; a Query só existe dentro das telas de dados)
- **Fetchers puros.** `src/api/<recurso>.ts` só tem as chamadas (`listarMinhasCargas()`, `entrarNaApi()`...), sem TanStack. Telas públicas (login, cadastro) e a sessão usam só estes.
- **Hooks.** `src/api/<recurso>.hooks.ts` (`useMinhasCargas`, `usePublicarCarga`...) importam `useQuery`, `useMutation` e `useQueryClient` de `src/api/tanstack.ts`, uma ponte tipada que repassa ao pacote registrado por `definirTanstack`. Opções de polling ficam em `src/api/leitura.ts`. ESLint proíbe `import` do pacote fora dos arquivos que o carregam.
- **Um só carregador.** `src/state/consultas/consultas.tsx` é o único módulo do app que importa `@tanstack/react-query` (com `api/consulta.ts` e `api/foco.native.ts`, que só ele usa). Ao carregar, registra o pacote na ponte e a limpeza do cache na sessão. Fica num chunk próprio (~18 KiB gzip), aberto por `import()`.
- **Abertura sob demanda.** Cada corpo de tela que usa hooks abre por `React.lazy` depois da hidratação (padrão do ADR 0011: casca com `h1` no HTML estático, corpo depois), e o seu `*.carregar.ts` usa `carregarComConsultas`, que traz o chunk das consultas junto e entrega o corpo já dentro do `QueryClientProvider`. Minhas cargas e Meus fretes da empresa viraram casca + corpo; a consulta de disponibilidades do motorista também abre sob demanda.
- **Cliente único e limpeza.** Há um `QueryClient` por abertura do app (`clienteDeConsultas()`), como antes. `SessaoProvider` não conhece o TanStack: `entrar` e `sair` rodam as limpezas registradas em `src/state/sessao/limpezas.ts`, e o módulo das consultas registra `clienteUnico.clear()` ao carregar, mesmo sem tela de dados montada. Nada de uma conta aparece na seguinte.
- **Portão do servidor.** `api/saude.ts` já era um store próprio (sem TanStack): inalterado.
- **Testes.** O Jest não executa `import()`: `jest.setup.ts` registra o pacote na ponte e troca os `*.carregar.ts` pelos componentes na hora; cada teste continua dando o seu `QueryClientProvider` (`mocks/utils-teste.tsx`).
- **Portão de CI.** `npm run orcamento` falha se o texto do TanStack aparecer em qualquer `<script>` do HTML de uma rota.

**Consequências.** JS inicial de toda rota ~17,5 KiB menor (ver adendo 4 do ADR 0011). Tela nova que use hooks de dados: corpo em `src/telas`, `lazy` + `CorpoSobDemanda`, loader com `carregarComConsultas`. Um corpo que chame um hook sem passar por ele recebe o erro "O TanStack Query ainda não foi carregado".
