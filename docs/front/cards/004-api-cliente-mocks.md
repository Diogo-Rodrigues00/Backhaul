# 004 — Camada de API: tipos, cliente, erros, hooks de dados e mocks MSW

| Campo | Valor |
|---|---|
| Itens MVP | base de MVP-02 a MVP-17 (RNF-09, CT-03, CT-04) |
| Prioridade | MVP |
| Agente / modelo | `integracao-api` / **sonnet** — integração central com normalização de erros, 401 global e rotas propostas (4a/4b) |
| Branch | `feat/api-cliente-mocks` |
| Estimativa | G (≈6 h) |
| Bloqueado por | 001 |
| Bloqueia | 009, 013, 014 e todos os cards de tela |

## Objetivo
Tudo que fala com a API, num lugar só (ADR 0004, 0005, 0010): tipos, cliente `fetch`, `ErroApi`, `QueryClient`, hooks por recurso, portão do servidor, e handlers MSW para **todas** as rotas do MVP.

## Rotas da API
Todas do MVP: `GET /saude`, `POST /login`, `GET /eu`, `POST /cadastro/empresa`, `POST /cadastro/motorista`, `GET /certificacoes`, `POST /cargas`, `GET /cargas/minhas`, `POST /disponibilidades`, `GET /cargas/proximas`, `POST /propostas`, `GET /cargas/:id/propostas`, `POST /propostas/:id/responder`, `GET /fretes/meus` (formato motorista e empresa), `PATCH /fretes/:id/status`, `POST /fretes/:id/pagamento`.
**Propostas de contrato (rotas inexistentes, só MSW):** `GET /propostas/minhas` (relatório 4a) e `GET /disponibilidades/minhas` (relatório 4b), exatamente nos formatos do relatório.

## Telas / componentes
Nenhum componente visual.

## Arquivos e pastas
- `src/api/config.ts`, `cliente.ts` (`requisitar`, `configurarCliente`), `tipos.ts`, `chaves.ts`, `consulta.ts` (`criarQueryClient`, `INTERVALO_ATUALIZACAO_MS = 10_000`), `foco.web.ts` / `foco.native.ts`.
- `src/lib/erros.ts` (`ErroApi`, `separarMensagens`, `eErro4xx`), `src/lib/numeros.ts` (`paraNumero`).
- `src/api/saude.ts`: `usePortaoServidor()` → `{ estado: 'verificando' | 'lento' | 'pronto' | 'falhou', tentativa, totalTentativas, tentarDeNovo() }` (o DS mostra "Tentativa 3 de 18") (ADR 0005: timeout 5 s, intervalo 5 s, limite 90 s, `lento` após 500 ms, uma vez por abertura).
- `src/api/sessao.ts` (`entrarNaApi`, `buscarEu`, `cadastrarEmpresa`, `cadastrarMotorista` + hooks de mutação), `certificacoes.ts`, `cargas.ts`, `disponibilidades.ts`, `propostas.ts`, `fretes.ts`. Hooks de leitura de propostas da carga, minhas propostas e meus fretes aceitam `{ automatico?: boolean }` (ADR 0010).
- Invalidações: publicar carga → `cargas.minhas`; publicar disponibilidade → `disponibilidades.minhas`; fazer proposta → `propostas.minhas`, `cargas.proximas`; responder → `propostas.daCarga(id)`, `cargas.minhas`, `fretes.meus`; status/pagamento → `fretes.meus`.
- `mocks/fixtures/*.ts`, `mocks/handlers/{saude,sessao,certificacoes,cargas,disponibilidades,propostas,fretes}.ts`, `mocks/handlers/index.ts`, `mocks/node.ts`; `jest.setup.ts` liga o servidor MSW.
- Variantes de erro acionáveis nos testes por `server.use(...)` com helpers `respostaErros(400, [...])`, `respostaErro(409, '...')`, `respostaHtml(500)`.
- Usuários de mock e tokens do ADR 0005 (`empresa@mock.test` etc.).
- devDeps/deps: `@tanstack/react-query`, `msw@^2.15`.

## Critérios de aceite
- [ ] Nenhuma URL no código: base só de `EXPO_PUBLIC_API_URL`.
- [ ] `ErroApi` correto para: 400 `erros`, 400 `erro`, 401, 403, 404, 409, 500 JSON, 500 HTML, corpo vazio, falha de rede, timeout (CT-03).
- [ ] 401 em requisição autenticada chama `aoSessaoExpirada` **uma** vez (mesmo com 3 requisições simultâneas); 401 no `POST /login` não chama (D-PO-11).
- [ ] `separarMensagens` envia `cpf deve ter 11 dígitos` ao campo `cpf` e mensagens sem campo ao resumo.
- [ ] `usePortaoServidor`: 503 e falha contam como erro; 200 → `pronto`; após 90 s → `falhou`; `tentarDeNovo` reinicia; segunda montagem na mesma sessão não refaz a verificação (MVP-02).
- [ ] Polling: com `automatico: true` e foco, 1 requisição a cada 10 s; com `focusManager.setFocused(false)` por 30 s, 0 requisições (CT-09).
- [ ] Handlers cobrem todas as rotas listadas, com fixtures no formato **exato** de `docs/api.md` e do relatório 4a/4b (incluindo `GET /fretes/meus` nas duas formas e `validade` em `YYYY-MM-DD` e ISO).
- [ ] Decisão sobre `msw/node` × plano B (`getResponse`) registrada no PR (ADR 0005).
- [ ] Texto da proposta de contrato 4a/4b citado em comentário nos tipos (`// PROPOSTA relatório 4a…`).

## Testes exigidos
- Unidade: `cliente`, `erros`, `numeros`, `usePortaoServidor` (timers falsos), cada hook (sucesso + 1 erro) com MSW, invalidações após mutação, polling.
- Cobertura ≥ 80% em `src/api` e `src/lib/erros.ts`.

## Checklist de acessibilidade e performance
- [ ] Nenhuma dependência além de `@tanstack/react-query` em runtime.
- [ ] `QueryClient` criado uma vez; nada pesado no escopo de módulo.
- [ ] MSW só em `devDependencies` e em `mocks/` (nunca importado por `src/` exceto o `import()` dinâmico do preview do card 003).
