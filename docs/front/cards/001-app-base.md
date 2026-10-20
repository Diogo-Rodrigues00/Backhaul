# 001 — Base do app (Expo SDK 57 + expo-router + estrutura)

| Campo | Valor |
|---|---|
| Itens MVP | MVP-01 (parcial: app rodando na web e no Expo Go, `lang`, títulos, 404) |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — fundação nova, sem padrão anterior, com portão de viabilidade |
| Branch | `feat/app-base` (a partir de `front`) |
| Estimativa | G (≈5 h) |
| Bloqueado por | — |
| Bloqueia | 002, 003, 004, 005, 006, 007 |

## Objetivo
Projeto Expo em `app/` rodando no navegador e no iPhone (Expo Go), com a estrutura de pastas da arquitetura, configs de lint/TS/Jest, e a medição inicial de bundle e Lighthouse que diz se a meta de Performance 100 é viável.

## Rotas da API
Nenhuma. Criar só `mocks/handlers/index.ts` com `criarHandlers(baseUrl)` contendo `GET /saude` 200 (esqueleto para os cards 002 e 004).

## Telas / componentes
- `/` (`src/app/index.tsx`): `View role="main"` com `h1` "Backhaul" e um parágrafo de descrição (texto provisório; sem estilo além do padrão).
- `+not-found.tsx`: `h1` "Página não encontrada" + link para `/`.
- `+html.tsx`: `<html lang="pt-BR">`, meta viewport, `<title>` padrão "Backhaul", meta description, `ScrollViewStyleReset`.
- `_layout.tsx`: `<Slot />` (providers entram nos cards seguintes).

## Arquivos e pastas
- Criar o projeto em pasta temporária e mover para `app/` (a pasta já tem `CLAUDE.md`): `npx create-expo-app@latest tmp-app --template blank-typescript@sdk-57 --no-install`.
- `npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-system-ui react-native-web react-dom @expo/metro-runtime`; `"main": "expo-router/entry"`.
- `app.json`: `name` "Backhaul", `slug` "backhaul", `scheme` "backhaul", `userInterfaceStyle` "automatic", `web.output` "static", `web.bundler` "metro", plugin `expo-router` com `asyncRoutes` web em produção (ADR 0002), `experiments.typedRoutes`.
- `tsconfig.json` (strict, `noUncheckedIndexedAccess`, `paths` `@/*`), `eslint.config.js` (`npx expo lint` + `no-restricted-imports` com a lista de proibidos do ADR 0001 e proibição de `@/api` em `src/components/**`), `.prettierrc`, `jest.config.js` (preset `jest-expo`), `jest.setup.ts`.
- `app/.gitignore`: `node_modules`, `.expo`, `dist`, `.env`, `.env.*` (exceto `.env.example`), `coverage`, `.lighthouseci`, `playwright-report`, `test-results`.
- `.env.example`: `EXPO_PUBLIC_API_URL=https://backhaul-api.onrender.com` e `EXPO_PUBLIC_API_MOCK=` (vazio).
- Pastas vazias com `.gitkeep`: `src/components/{atoms,molecules,organisms,templates}`, `src/{api,state,hooks,lib,data,theme}`, `mocks/fixtures`, `e2e`, `scripts`, `public`.
- `e2e/rotas.ts`: `export const rotas = [{ caminho: '/', perfil: null }, { caminho: '/nao-existe', perfil: null }]`.
- `package.json`: `engines.node` `>=22.13`; scripts `start`, `web`, `lint`, `typecheck` (`tsc --noEmit`), `test`, `export:ci`.
- `app/CLAUDE.md`: preencher "Comandos do app" (incluir `npx expo login` e login na mesma conta no Expo Go do iPhone).

## Critérios de aceite
- [ ] `npm install` + `npx expo start --web` abre `/` com o `h1` "Backhaul", sem erro no console.
- [ ] `npx expo start` + Expo Go no iPhone (logado na mesma conta Expo) abre a mesma tela. Se não houver iPhone disponível, registrar no PR como "não verificado" e pedir ao Pedro.
- [ ] `npx expo export -p web` gera `dist/index.html` com `lang="pt-BR"`, `<title>` e meta description; `dist/` tem chunks separados por rota (`/` e `+not-found`).
- [ ] `/nao-existe` mostra a página de não encontrada com `h1`.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` passam.
- [ ] `package.json` só com as libs do ADR 0001 (nenhuma proibida; template sem reanimated/gesture-handler).
- [ ] Busca por `onrender.com` em `app/` encontra só `.env.example`.
- [ ] **Portão de viabilidade (ADR 0011):** medir o JS inicial gzip de `dist/index.html` e rodar Lighthouse mobile e desktop em `/` (ex.: `npx serve dist` + `npx @lhci/cli@0.15.1 collect --url=http://localhost:3000/ && npx @lhci/cli@0.15.1 assert`); colocar os números no PR. **Se Performance mobile < 100, parar e reportar ao orquestrador** sem tentar contornar fora dos ADRs.

## Testes exigidos
- RNTL: `/` tem um `heading` nível 1 "Backhaul"; `+not-found` tem `heading` e link para `/`.

## Checklist de acessibilidade e performance
- [ ] `lang="pt-BR"` e `<title>` no HTML estático.
- [ ] Um único `h1` por tela; `role="main"` na tela.
- [ ] Nenhuma fonte externa, nenhum script de terceiros.
- [ ] JS inicial de `/` registrado (KB gzip) e abaixo de 220 KB.
- [ ] Notas Lighthouse (4 categorias × mobile/desktop) registradas.

## Notas
- Não instalar TanStack, RHF, MSW etc. aqui; cada card instala o que usa (`npx expo install`).
