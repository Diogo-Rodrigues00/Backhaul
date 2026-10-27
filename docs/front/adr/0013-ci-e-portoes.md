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

## Adendo — 2026-10-21 (card 002)
- **Lighthouse mobile:** por decisão do Pedro (adendo do ADR 0011), a categoria Performance mobile é `warn` em `lighthouserc.mobile.cjs`: a nota aparece no log e no resumo do job (`scripts/lhci-resumo.mjs`) e não reprova o PR. Acessibilidade, Boas práticas e SEO = 100 (`error`) em mobile e desktop; Performance desktop = 100 (`error`).
- **Servidor de CI e rotas inexistentes:** o `serve dist` responde 404 para caminho que não existe e o Lighthouse aborta a auditoria com 404 real. `scripts/servidores-ci.mjs` sobe `scripts/servidor-site.mjs`, que serve `x.html` e `x/index.html` como a Vercel (`cleanUrls`) e devolve `/+not-found.html` com status 200 só para caminho sem extensão que não existe. Vale apenas no CI; na Vercel a rota inexistente continua 404 (ADR 0014). Arquivos que não existem (`robots.txt`, `.js`) seguem 404. (A primeira versão reescrevia por `rewrites` do `serve`, que o serve-handler aplica antes de procurar o arquivo: toda rota sem extensão devolvia o HTML da página 404 e a hidratação falhava, erro #418. Achado do card 013.)
- **`/_sitemap`:** resolvido no card 003: `"sitemap": false` no plugin `expo-router` a remove do export, então não existe em `dist/` e não é medida nem auditada.
- **Cobertura:** o `coverageThreshold` de 80% de linhas (`src/lib` e `src/api`) entrou com o card 004 e vale no job `qualidade`.
- **Executar TypeScript no CI:** `mocks/servidor-http.ts` roda com `tsx` (devDependency só para o CI): os handlers do card 004 importam sem extensão, o que o `--experimental-strip-types` do Node não resolve.
- **Paths filter e proteção de branch:** como o workflow só dispara com mudança em `app/**`, um PR só de docs para `front` não gera os checks `qualidade` e `web`; com proteção exigindo-os, esse PR fica bloqueado (o Pedro faz o merge como admin ou remove a exigência).
- **Rotas e orçamento:** `scripts/lhci-rotas.cjs` lê `e2e/rotas.ts` e `servidores-ci.mjs` falha se faltar `dist/<rota>.html` (exceto a marcada `naoEncontrada: true`). O orçamento usa KiB (1024 B) e limites em bytes (`ORCAMENTO_*_BYTES`); o Lighthouse CI avalia a mediana das 3 execuções (`aggregationMethod: 'median'`).
