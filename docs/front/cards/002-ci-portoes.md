# 002 — CI com todos os portões (lint, testes, export, orçamento, axe, Lighthouse)

| Campo | Valor |
|---|---|
| Itens MVP | transversal (CT-05, CT-06, RNF-01, RNF-02, RNF-10, RNF-11) |
| Prioridade | MVP |
| Agente / modelo | `devops` / **sonnet** — Lighthouse CI com login por token, dois servidores e axe em matriz de temas não tem padrão anterior |
| Branch | `feat/ci-portoes` |
| Estimativa | G (≈5 h) |
| Bloqueado por | 001 |
| Bloqueia | merge de qualquer card de tela (todo PR passa a ter os portões) |

## Objetivo
Workflow do GitHub Actions e scripts locais que bloqueiam o PR se qualquer portão falhar (ADR 0012 e 0013).

## Rotas da API
Nenhuma real. Usa `mocks/servidor-http.ts` (este card cria) sobre `mocks/handlers/index.ts` (esqueleto do 001, completado pelo 004).

## Telas / componentes
Nenhuma.

## Arquivos e pastas
- `.github/workflows/front.yml` (jobs `qualidade` e `web`, ADR 0013), `.github/pull_request_template.md`.
- `app/mocks/servidor-http.ts` (porta 4010, `@mswjs/http-middleware`, CORS `*`).
- `app/scripts/servidores-ci.mjs` (mock 4010 + `serve dist -l 4173` com `cleanUrls`; imprime `pronto`).
- `app/scripts/orcamento-bundle.mjs` (limites do ADR 0011; lê cada `.html` de `dist/`, soma gzip dos `<script src>`; falha também se algum chunk contiver `mockServiceWorker` ou `setupWorker`).
- `app/scripts/verificar-proibidos.mjs`: `onrender.com` fora de `.env.example`; `.env` versionado (`git ls-files`); padrões de comissão fixa em `src/` (`0.05`, `5%`, `* 5 / 100`, `percentual_comissao =`); e-mails da variável `DEMO_EMAILS` (lista separada por vírgula, vinda de secret, nunca do código).
- `app/scripts/lhci-login.cjs` (puppeteer): para URLs `/empresa/*`, `/motorista/*`, `/admin*` grava `localStorage['backhaul.token']` = `mock-empresa` / `mock-motorista` / `mock-admin` antes de navegar.
- `app/lighthouserc.mobile.cjs`, `app/lighthouserc.desktop.cjs`: URLs geradas de `e2e/rotas.ts` (base `http://localhost:4173`), `numberOfRuns: 3`, `assert` `categories:performance|accessibility|best-practices|seo` `minScore: 1`, `upload.target: filesystem`.
- `app/playwright.config.ts` (`webServer` = `servidores-ci.mjs`; projetos `desktop` 1280×800 e `estreito` 320×640).
- `app/e2e/fixtures.ts` (entrar por token de mock), `app/e2e/a11y.spec.ts` (para cada rota × `colorScheme` claro/escuro × projeto: axe com tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` = 0 violações; em 320 px, `scrollWidth ≤ 320`).
- `app/package.json`: scripts `export:ci`, `orcamento`, `e2e`, `lhci:mobile`, `lhci:desktop`, `verificar:proibidos`, `verificar`; devDeps `@playwright/test`, `@axe-core/playwright`, `@lhci/cli@0.15.1`, `puppeteer`, `serve`, `msw@^2.15`, `@mswjs/http-middleware`.

## Critérios de aceite
- [ ] PR deste card mostra os jobs `qualidade` e `web` verdes com as rotas do 001.
- [ ] Um PR de teste (não mergeado) com `h1` removido ou contraste quebrado deixa `web` vermelho (registrar o link no PR).
- [ ] Baixar temporariamente o limite do orçamento faz `npm run orcamento` falhar (registrar a saída).
- [ ] `npm run verificar:proibidos` falha com `onrender.com` num arquivo de `src/` e passa sem ele.
- [ ] `npm run verificar` roda localmente todos os portões na ordem do CI.
- [ ] Tempo total do workflow ≤ 15 min.
- [ ] Descrição do PR traz o comando `gh api` para o Pedro proteger a `front` exigindo `qualidade` e `web` (não executar).

## Testes exigidos
- O próprio workflow; `a11y.spec.ts` rodando nas rotas de `e2e/rotas.ts`.

## Checklist de acessibilidade e performance
- [ ] Lighthouse com 3 execuções (mediana) para reduzir ruído.
- [ ] Mocks não geram 4xx durante a auditoria (erro no console derruba Boas práticas).
- [ ] axe roda nos dois temas e nas duas larguras.

## Notas
- Se o `@lhci/cli` não funcionar com o `puppeteer` mais novo, usar a versão de `puppeteer` que o LHCI aceita e registrar no PR.
