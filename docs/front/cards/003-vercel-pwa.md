# 003 — Vercel (produção + preview com MSW) e PWA instalável

| Campo | Valor |
|---|---|
| Itens MVP | MVP-01 (URL pública, instalável no Chrome/Edge e no iPhone) |
| Prioridade | MVP |
| Agente / modelo | `devops` / **sonnet** — service worker convivendo com o worker do MSW e modo mock no preview exigem cuidado de integração |
| Branch | `feat/vercel-pwa` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 001 · (suave) logo do designer para os ícones finais |
| Bloqueia | 029 (ensaio da demo) |

## Objetivo
Publicar a web na Vercel (produção com API real, preview por PR com MSW) e torná-la PWA instalável (ADR 0014).

## Rotas da API
Produção: todas via `EXPO_PUBLIC_API_URL`. Preview: MSW no navegador com `mocks/handlers` (o 004 completa os handlers; até lá só `/saude`).

## Telas / componentes
Nenhuma tela. Ajustes em `+html.tsx` e `_layout.tsx`.

## Arquivos e pastas
- `app/vercel.json` (cleanUrls, cabeçalhos de cache e segurança, ADR 0014).
- `app/public/manifest.webmanifest`, `app/public/icones/` (192, 512, 512-maskable, apple-touch-icon-180), `app/public/favicon.ico`, `app/public/robots.txt` (`User-agent: *` / `Allow: /`).
- `app/public/sw.js` (cache com versão; mesma origem; nunca a API nem `mockServiceWorker.js`).
- `app/public/mockServiceWorker.js` (`npx msw init public`).
- `app/src/lib/pwa.web.ts` / `pwa.native.ts`; `app/mocks/browser.ts`.
- `app/src/app/+html.tsx`: manifesto, apple-touch-icon, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`.
- `app/src/app/_layout.tsx`: se `EXPO_PUBLIC_API_MOCK === 'msw'`, `await import('@/../mocks/browser')` e `worker.start({ onUnhandledRequest: 'bypass' })` antes de montar; senão, registrar o `sw.js` em produção.

## Critérios de aceite
- [ ] Comandos para o Pedro no PR (não executar): `vercel link` com Root Directory `app`; `vercel env add EXPO_PUBLIC_API_URL production`; `vercel env add EXPO_PUBLIC_API_MOCK preview` (valor `msw`); `vercel env add EXPO_PUBLIC_API_URL preview` (valor `https://api.mock.backhaul.test`).
- [ ] URL de produção abre no Chrome desktop e no Safari do iPhone sem erro no console (MVP-01).
- [ ] Chrome/Edge oferecem instalar; o app abre em janela própria com nome "Backhaul" e ícone (MVP-01).
- [ ] Safari do iPhone: "Adicionar à Tela de Início" mostra o ícone e abre em tela cheia (MVP-01).
- [ ] Preview do PR responde `/saude` pelo MSW (aba Rede mostra a requisição interceptada) e não registra o `sw.js`.
- [ ] `curl -I` na produção mostra os cabeçalhos de cache de `/_expo/static/` e `no-cache` em `/sw.js`.
- [ ] Orçamento do ADR 0011 continua verde (o código do MSW não aparece em nenhum chunk de produção).

## Testes exigidos
- Jest: `pwa.web.ts` não registra com `EXPO_PUBLIC_API_MOCK=msw` nem fora de produção.
- Playwright: `manifest.webmanifest` válido (campos obrigatórios) e `sw.js` registrado na rota `/` do build de produção.

## Checklist de acessibilidade e performance
- [ ] Registro do service worker só após `load` (não compete com o carregamento inicial).
- [ ] `theme-color` com variantes claro/escuro (valores dos tokens).
- [ ] `favicon.ico` presente (evita 404 no console).
- [ ] Lighthouse das rotas existentes continua 100.
