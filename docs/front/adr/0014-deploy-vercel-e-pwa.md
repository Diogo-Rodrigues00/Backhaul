# ADR 0014 — Deploy na Vercel e PWA instalável

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
Decisões fechadas: web estática na Vercel com preview por PR; PWA instalável (manifesto, ícones, service worker). Q4: previews usam MSW (a URL do preview não está no `CORS_ORIGIN`). O Lighthouse 12 não tem mais categoria PWA, mas a instalação é critério do MVP-01.

## Decisão
**Vercel**
- Projeto com **Root Directory `app`**, framework "Other", install `npm ci`, build `npx expo export -p web`, output `dist`.
- Variáveis (configuradas pelo Pedro no painel ou com `vercel env add`; o devops só entrega os comandos):
  - Production: `EXPO_PUBLIC_API_URL=https://backhaul-api.onrender.com`.
  - Preview: `EXPO_PUBLIC_API_MOCK=msw` e `EXPO_PUBLIC_API_URL=https://api.mock.backhaul.test` (endereço fictício interceptado pelo MSW no navegador).
- `app/vercel.json`: `cleanUrls: true`, `trailingSlash: false`; cabeçalhos `Cache-Control: public, max-age=31536000, immutable` em `/_expo/static/(.*)` e `/icones/(.*)`; `Cache-Control: no-cache` em `/sw.js` e `/manifest.webmanifest`; `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Domínio de produção da Vercel vai para o `CORS_ORIGIN` do Render (pedido ao Diogo; já no STATUS).

**PWA**
- `public/manifest.webmanifest`: `name` "Backhaul", `short_name` "Backhaul", `lang` "pt-BR", `start_url` "/", `scope` "/", `display` "standalone", `background_color`/`theme_color` dos tokens (tema claro), ícones 192, 512 e 512 `maskable` em `public/icones/`.
- `+html.tsx`: `<link rel="manifest">`, `<link rel="apple-touch-icon" href="/icones/apple-touch-icon-180.png">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `apple-mobile-web-app-title`, `favicon.ico`.
- Ícones gerados a partir do logo do designer (SVG). Até o logo existir, ícone provisório com o texto "B" nas cores do token primário, trocado sem mudar código.
- `public/sw.js` escrito à mão (~60 linhas, sem Workbox):
  - `install`: pré-cache de `/` e `/entrar`.
  - `fetch` só da **mesma origem** e método GET: `/_expo/static/*` e `/icones/*` cache-first; navegações network-first com retorno ao cache se offline. Nunca intercepta a API (outra origem) nem `mockServiceWorker.js`.
  - `activate`: apaga caches de versões antigas (nome com a versão).
- Registro em `src/lib/pwa.web.ts` (no `_layout` raiz, após o evento `load`), só se `process.env.NODE_ENV === 'production'` **e** `EXPO_PUBLIC_API_MOCK` vazio (no preview o service worker do MSW ocupa o escopo). `pwa.native.ts` vazio.

## Alternativas
- **Workbox / plugin de PWA:** mais dependências e configuração para um cache simples.
- **Preview com API real:** bloqueado pelo CORS (comparação exata de origem).

## Consequências
- Produção e preview se comportam diferente nos dados (real × mock); a demo usa só produção.
- Mudança de `sw.js` exige trocar a versão do cache.
