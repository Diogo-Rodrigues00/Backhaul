# ADR 0012 — Testes: unidade, componente, tela, E2E web, axe e Lighthouse

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
Portões por PR: lint, typecheck, testes, export web, axe 0 violações, Lighthouse 100. Expo Go não permite E2E nativo automatizado (Detox/Maestro pedem build próprio); o iPhone é verificado à mão.

## Decisão
| Nível | Ferramenta | O que cobre | Onde |
|---|---|---|---|
| Unidade | Jest (`jest-expo` ~57.0.6, Jest 29) | `src/lib/**`, `src/api/**` (cliente, erros, `separarMensagens`), funções `descrever` de anúncio | `*.test.ts` ao lado |
| Componente | `@testing-library/react-native` ^14.1 | atoms, molecules, organisms, templates: papel, nome, estado (`disabled`, `busy`, `checked`), erro associado, variações | `*.test.tsx` ao lado |
| Tela | RNTL + `renderRouter` de `expo-router/testing-library` + MSW (`mocks/node.ts`) | cada rota: carregando, vazio, sucesso, cada formato de erro (`erros`, `erro`, não-JSON/500), 401 → login; polling (ADR 0010) | `src/app/**/__tests__/*.test.tsx` |
| E2E web | Playwright ^1.64 (Chromium) no `dist/` de produção + `mocks/servidor-http.ts` | caminho feliz de cada card; teclado (Tab chega à ação principal); 320 px sem rolagem horizontal (`scrollWidth ≤ 320`) | `app/e2e/*.spec.ts` |
| Acessibilidade web | `@axe-core/playwright` ^4.14 | **toda rota**, temas claro e escuro (`colorScheme`), 1280 px e 320 px; tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa`; 0 violações | `app/e2e/a11y.spec.ts` (lista de rotas única em `e2e/rotas.ts`) |
| Lighthouse | `@lhci/cli` 0.15.1 | toda rota de `e2e/rotas.ts`, mobile e desktop, 3 execuções, `minScore: 1` nas 4 categorias | `lighthouserc.mobile.cjs`, `lighthouserc.desktop.cjs` |
| iPhone | manual no Expo Go | VoiceOver (rótulos, ordem, estados, anúncios) e Dynamic Type (maior tamanho sem corte) nas telas do card | checklist no PR |

**Regras**
- Consulta por papel e nome; `testID` só quando não houver papel (ex.: região viva).
- Sem snapshot de árvore.
- Rotas logadas no Playwright/Lighthouse: script grava o token de mock (`mock-empresa`, `mock-motorista`, `mock-admin`) no `localStorage` antes de abrir a URL (`scripts/lhci-login.cjs` e fixture do Playwright).
- Toda rota nova entra em `e2e/rotas.ts` no próprio card (é a lista que o axe e o Lighthouse percorrem).
- Cobertura mínima: 80% de linhas em `src/lib` e `src/api` (`coverageThreshold`).
- Scripts em `app/package.json`: `lint`, `typecheck`, `test`, `export:ci`, `orcamento`, `e2e`, `lhci:mobile`, `lhci:desktop`, `verificar:proibidos`, `verificar` (roda todos).

## Alternativas
- **Cypress:** mais pesado no CI e sem vantagem aqui.
- **Detox/Maestro:** exigem build nativo; fora do Expo Go.
- **Testar telas só no Playwright:** lento para estados de erro; Jest + MSW cobre melhor e mais rápido.

## Consequências
- Um card só fecha com testes de tela cobrindo CT-01 a CT-04 (e CT-09 quando houver atualização automática).
- Pendências de verificação nativa ficam explícitas no PR.
