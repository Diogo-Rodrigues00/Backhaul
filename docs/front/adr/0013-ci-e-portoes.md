# ADR 0013 — CI (GitHub Actions) e portões do PR

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
PR de cada card vai para `front`; merge (squash) só com todos os portões verdes. O CI não pode depender da API real (cold start, CORS) e precisa ser determinístico.

## Decisão
Workflow único `.github/workflows/front.yml` (raiz do repositório), `defaults.run.working-directory: app`.
- **Gatilhos:** `pull_request` para `front` e `push` em `front`, com `paths: ['app/**', '.github/workflows/front.yml']`. `concurrency` por branch, cancelando execução anterior.
- **Node 22.x** (≥ 22.13), `actions/setup-node` com cache npm (`cache-dependency-path: app/package-lock.json`); `npm ci`.

| Job | Passos | Falha se |
|---|---|---|
| `qualidade` | `npm run lint` · `npm run typecheck` · `npm test -- --ci --coverage` · `npm run verificar:proibidos` | qualquer erro; cobertura abaixo do limite; `onrender.com` em `app/` fora de `.env.example`; constante de comissão; e-mails de conta de demo; `.env` versionado |
| `web` (depois de `qualidade`) | `npm run export:ci` (`EXPO_PUBLIC_API_URL=http://localhost:4010`) · `npm run orcamento` · `npx playwright install --with-deps chromium` · `npm run e2e` (inclui axe) · `npm run lhci:mobile` · `npm run lhci:desktop` | export falha; orçamento estoura (ADR 0011); teste E2E ou axe falha; qualquer categoria < 100 em qualquer rota |

- Servidores no CI: `scripts/servidores-ci.mjs` sobe o mock (porta 4010) e o `serve dist` (porta 4173, `cleanUrls`) e imprime `pronto`; usado pelo `webServer` do Playwright e pelo `startServerCommand` do LHCI.
- Artefatos: relatório do Playwright e `.lighthouseci/` via `actions/upload-artifact` (7 dias).
- `pull_request_template.md` (raiz `.github/`): card, critérios marcados, checklist manual WCAG, checklist iPhone (VoiceOver, Dynamic Type), o que não foi verificado.
- **Proteção da branch `front`:** exigir os checks `qualidade` e `web` e PR antes do merge. Configuração feita pelo Pedro (o devops entrega o comando `gh api` pronto; agentes não mexem em configuração do repositório).
- Meta de duração: ≤ 15 min por PR.
- Vercel faz o preview por PR pela integração com o GitHub (ADR 0014), fora do Actions.

## Alternativas
- **Lighthouse só na Vercel preview:** URL muda, depende de rede e não bloqueia o merge de forma confiável.
- **Um job só:** mais lento para dar retorno de lint/teste.

## Consequências
- Todo card que cria rota atualiza `e2e/rotas.ts` e, se precisar, os handlers de mock.
- Um card de tela pode ficar vermelho por Lighthouse de outra rota; a correção é do card que causou (o revisor aponta).
