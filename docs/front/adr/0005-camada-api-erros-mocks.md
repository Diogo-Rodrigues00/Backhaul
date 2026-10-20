# ADR 0005 — Camada de API: cliente, erros, portão do servidor e mocks (MSW)

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
- URL só por `EXPO_PUBLIC_API_URL`; token Bearer; erros chegam como `{ erro }`, `{ erros: [] }` ou corpo não-JSON (HTML do Express, 413 virando 500).
- 401 em rota protegida leva ao login com aviso, exceto `POST /login` (D-PO-11). O Render dorme (~50 s).
- `GET /propostas/minhas` e `GET /disponibilidades/minhas` ainda não existem: proposta em `relatorio-api-inicial.md` seções 4a e 4b.
- MSW só em testes, Lighthouse CI e previews da Vercel (Q4).

## Decisão
**Cliente** (`src/api/cliente.ts`)
- `requisitar<T>(metodo, caminho, { corpo?, autenticado = true, timeoutMs = 60_000 }): Promise<T>` sobre o `fetch` global. Base lida **uma vez** de `process.env.EXPO_PUBLIC_API_URL` em `src/api/config.ts`; se vazia, lança erro claro.
- Cabeçalhos: `Content-Type: application/json` quando há corpo; `Authorization: Bearer <token>` quando `autenticado`. O token e a reação ao 401 são registrados pela sessão: `configurarCliente({ obterToken, aoSessaoExpirada })` (evita import circular entre `api` e `state`).
- Timeout com `AbortController`.
- Erros viram `ErroApi` (`src/lib/erros.ts`, em `lib` porque os formulários também usam e componentes não importam `src/api`):
  - `tipo: 'validacao' | 'mensagem' | 'sessao' | 'falha'`, `status: number | null`, `mensagens: string[]`.
  - 400 com `erros` → `validacao`; 400 com `erro` → `mensagem`.
  - 401 → `sessao`; se a requisição era `autenticado`, chama `aoSessaoExpirada()` uma única vez. O login não é autenticado, então o 401 dele vira `mensagem` (D-PO-11).
  - 403, 404, 409 com `erro` → `mensagem`.
  - 5xx, corpo não-JSON, JSON sem `erro`/`erros`, timeout, falha de rede → `falha` com a mensagem fixa "Algo deu errado. Tente de novo." Nunca expor HTML, stack ou JSON cru.
- `separarMensagens(erro, campos)` e `eErro4xx(erro)` em `src/lib/erros.ts`: mensagens que começam com o nome de um campo (`cpf deve ter 11 dígitos` → `cpf`) vão para o campo; as demais, para o resumo. Usado pelos formulários (ADR 0007).
- Leitura de números: valores monetários e de peso passam por `paraNumero()` (`src/lib/numeros.ts`, aceita `number` ou texto numérico), porque NUMERIC do Postgres pode chegar como texto. Envio sempre como `number`.

**Tipos** (`src/api/tipos.ts`): escritos à mão a partir de `docs/api.md` e das propostas 4a/4b (não há OpenAPI). Enums como uniões literais (`type Urgencia = 'normal' | 'urgente' | 'critico'`). Rotas 🔜 marcadas com `// PROPOSTA relatório 4a: conferir quando entrar em docs/api.md`.

**Portão do servidor** (`src/api/saude.ts`, usado pelo card 014)
- Uma verificação por abertura do app (estado de módulo, não por navegação).
- `GET /saude` com timeout de 5 s; nova tentativa a cada 5 s até 90 s (D-PO-15); 503 conta como falha.
- O hook expõe `tentativa` e `totalTentativas` (o DS mostra "Tentativa 3 de 18").
- A tela "Conectando ao servidor" só aparece se a verificação não terminou em **500 ms** (não pisca com servidor acordado e não atrasa o LCP). As queries da área logada esperam `servidorPronto`.

**Mocks** (`app/mocks/`)
- `handlers/<recurso>.ts` com **todas** as rotas do MVP (inclusive 4a e 4b), com sucesso e variantes de erro (`erros`, `erro`, não-JSON, 401, 409). Criados por `criarHandlers(baseUrl)`; dados em `fixtures/`.
- Login de mock: `empresa@mock.test`, `motorista@mock.test`, `admin@mock.test` (qualquer senha com 8+ caracteres) devolvem tokens `mock-empresa`, `mock-motorista`, `mock-admin`; `GET /eu` responde conforme o token. Nada disso existe na API real.
- `node.ts` (`setupServer`) para Jest. Plano B, se o `msw/node` não interceptar o `fetch` do `jest-expo`: `fetch` de teste que chama `getResponse(handlers, request)` do MSW (mesmos handlers, sem interceptação). Decidir dentro do card 004.
- `servidor-http.ts`: servidor Node na porta **4010** com `@mswjs/http-middleware` e CORS liberado, usado por Playwright e Lighthouse CI. O bundle auditado é o de produção, exportado com `EXPO_PUBLIC_API_URL=http://localhost:4010`.
- `browser.ts` (`setupWorker`) só em previews da Vercel: ativado quando `EXPO_PUBLIC_API_MOCK === 'msw'`, por `import()` dinâmico antes de montar o app; em produção o ramo some no build. `public/mockServiceWorker.js` gerado por `npx msw init public`.

## Alternativas
- **axios:** +13 KB e interceptadores que não usamos.
- **Gerar tipos de OpenAPI:** não existe especificação.
- **MSW no navegador também no Lighthouse CI:** atrasaria a renderização inicial e mediria um bundle diferente do de produção.

## Consequências
- Telas nunca chamam `fetch` nem `response.json()` diretamente.
- Quando 4a/4b entrarem em `main` e em `docs/api.md`, só tipos e handlers mudam se o formato divergir; as telas não.
