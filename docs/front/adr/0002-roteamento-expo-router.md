# ADR 0002 — Roteamento com expo-router, saída estática e rotas sem segmento dinâmico

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
Um código para web e iPhone; web hospedada como site estático na Vercel com Lighthouse 100 (inclui SEO e Performance mobile). A saída estática do expo-router pré-renderiza um HTML por rota, o que dá FCP/LCP rápidos. Segmentos dinâmicos (`[id].tsx`) exigem `generateStaticParams` com os ids no build, impossível para ids que nascem na API.

## Decisão
- **expo-router ~57.0.28**, rotas em `app/src/app/` (o repositório já tem a pasta `app/`; `app/app/` confundiria).
- `app.json`: `"web": { "output": "static", "bundler": "metro" }`; plugin `["expo-router", { "asyncRoutes": { "web": "production", "default": false } }]` (divisão do JS por rota na web). Conferir na doc versionada do SDK 57 o formato do `asyncRoutes`; o critério é: `dist/_expo/static/js/web/` tem um chunk por rota.
- `experiments.typedRoutes: true` (links tipados).
- **Sem segmentos dinâmicos.** Id vai na query: `/empresa/cargas/detalhe?id=<uuid>`, lido com `useLocalSearchParams`.
- Layouts usam **`<Slot />`**, nunca `Stack`/`Tabs` (menos JS na web; navegação pelo cabeçalho). No iPhone não há gesto de voltar; o cabeçalho tem os links da área.
- URLs em pt-BR, minúsculas, sem acento. Mapa completo em `docs/front/arquitetura.md`.
- `src/app/+html.tsx`: `<html lang="pt-BR">`, meta viewport, manifesto, `theme-color`, variáveis CSS do tema e script de tema (ADR 0008), `ScrollViewStyleReset`.
- Título e descrição por rota com `<Head>` de `expo-router/head` (no SDK 57 entra no HTML estático), sempre via `TemplateTela` (ADR 0003).
- Proteção de rota nos `_layout.tsx` de `empresa/`, `motorista/`, `admin/`: **nunca** redirecionar durante a renderização estática; o layout renderiza a casca e o `<Slot />`, e o redirecionamento acontece em efeito no cliente depois de restaurar a sessão (ADR 0006).
- Navegação: `<Link href>` (vira `<a>` na web, rastreável para SEO); `router.replace` só em fluxo (após login, 401).
- Código de rota não acessa `window`/`document`/`localStorage` durante a renderização (o HTML é gerado em Node). Use efeitos ou módulos `.web.ts`.

## Alternativas
- **React Navigation puro:** sem saída estática nem URLs por arquivo; pior em SEO e Performance.
- **Segmento dinâmico + reescrita SPA na Vercel:** perde o HTML estático da rota e complica o 404.
- **Stack nativo:** melhor sensação no iPhone, mas mais JS na web; a demo principal é a web.

## Consequências
- Toda rota web tem HTML próprio e é auditável pelo Lighthouse CI.
- Ids sempre por query string; links de detalhe montados com `{ pathname, params: { id } }`.
- Sem gesto de voltar no iPhone (aceitável: Expo Go é prova rápida).
