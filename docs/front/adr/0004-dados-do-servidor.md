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
