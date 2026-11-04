# 035 — Mapa de visualização sob demanda

## Revisão 2026-11-04
- **Escopo menor:** só **"Cargas próximas"** (motorista) e **"Minhas cargas"** (empresa), que já recebem `origem` e `destino` da API. Mapa em "Meus fretes" (027/028) **só depois do P4/A4** (`origem`/`destino` em `GET /fretes/meus`), dentro do card 044 ou num card próprio.
- Bloqueios atualizados: 020, 021, 024, 027, 028 já estão em `front`; fica só **PROTO** (039: estado fechado/aberto e equivalente em texto).
- Arquivos atualizados para a estrutura atual (corpos em `src/telas/`, organismos de cartão já existentes).
- Versões conferidas em 2026-11-04: `leaflet` **1.9.4** (`npm view leaflet` → `latest` 1.9.4; a 2.0 ainda é beta) e `react-native-maps` **1.27.2** (versão que o Expo SDK 57 traz em `bundledNativeModules.json`; instalar com `npx expo install`). A decisão de carregar por `import()` já está no ADR 0011 (item 7): sem ADR novo.
- Performance desktop agora é `warn` (decisão de 04/11), mas o mapa continua sem entrar no JS inicial.

| Campo | Valor |
|---|---|
| Itens MVP | MVP-23 |
| Prioridade | Fase 6 |
| Agente / modelo | `dev-front` / **sonnet** — implementação por plataforma, carregamento sob demanda (JS e CSS) e risco direto ao orçamento e ao Lighthouse |
| Branch | `feat/035-mapa` |
| Estimativa | G (≈6 h) |
| Bloqueado por | PROTO (039) |
| Bloqueia | — |
| Onda | 2 |

## Objetivo
"Ver no mapa" mostra a rota origem → destino da carga e, para o motorista, as cargas em volta do local ativo, sem custo para quem não clica e sem ser o único meio de nenhuma informação.

## Rotas da API
Nenhuma nova: `GET /cargas/proximas` e `GET /cargas/minhas` já trazem `origem` e `destino` (`{lat,lng}`); o local ativo vem do `DisponibilidadeAtivaProvider`.

## Telas / componentes
- `src/components/organisms/MapaRota.tsx` (interface comum: `pontos`, `linha?`, `circulo?`, `descricao`) com:
  - `MapaRota.web.tsx`: Leaflet por `import('leaflet')` **dentro** do componente carregado sob demanda; marcadores com `L.circleMarker` (sem imagens de ícone, que quebram no bundler); `L.polyline` para a rota; tiles `https://tile.openstreetmap.org/{z}/{x}/{y}.png` com atribuição "© OpenStreetMap contributors" visível.
  - CSS do Leaflet: **não** pode ir para o HTML inicial. Preferido: copiar `leaflet/dist/leaflet.css` (1.9.4) para `public/vendor/leaflet-1.9.4.css` e inserir o `<link>` só ao abrir o mapa. Se usar `import 'leaflet/dist/leaflet.css'`, provar no `dist/` que o CSS não aparece no HTML de nenhuma rota.
  - `MapaRota.native.tsx`: `react-native-maps` (Apple Maps no iPhone, sem chave). O ADR 0001 proíbe `react-native-maps` **na web**: só o arquivo `.native.tsx` importa a lib (ajustar a regra de lint para permitir esse arquivo, se ela bloquear).
  - `MapaRota.carregar.ts`: `import()` do componente, no molde de `FormularioProposta.carregar.ts`.
- `CartaoCargaProxima` e `CartaoCargaEmpresa`: botão "Ver no mapa"/"Fechar mapa" (`aria-expanded`, `aria-controls`) que abre o mapa abaixo do cartão com `Suspense` + `Carregando`. Um mapa aberto por tela.
- "Cargas próximas": botão "Ver cargas no mapa" na `BarraContexto` com o local ativo, o raio e as origens das cargas listadas.
- Equivalente em texto sempre ao lado: origem → destino (`LinhaRota`), distância; no mapa geral, a própria lista é o equivalente.

## Arquivos e pastas
`src/components/organisms/MapaRota*.tsx`, `MapaRota.carregar.ts`, `public/vendor/leaflet-1.9.4.css` (se for o caminho escolhido), `CartaoCargaProxima.tsx`, `CartaoCargaEmpresa.tsx`, `BarraContexto.tsx`, `src/telas/CorpoCargasProximas.tsx`, `src/telas/CorpoMinhasCargas.tsx`, `package.json` (`leaflet@1.9.4`, `@types/leaflet`, `react-native-maps` via `npx expo install`), testes, `e2e/mapa.spec.ts`.

## Critérios de aceite
- [ ] Rotas sem clique em "Ver no mapa" não baixam JS nem CSS de mapa, nem tiles (conferir no `dist/`, no `npm run orcamento` e no Playwright) (MVP-23).
- [ ] Rota da carga (origem → destino) nas duas telas; para o motorista, local ativo + raio + origens das cargas (MVP-23).
- [ ] Toda informação do mapa também em texto; nenhuma ação depende do mapa (MVP-23).
- [ ] Orçamento: JS inicial de `/motorista/cargas` e `/empresa/cargas` igual ao de `front` (≤ 360 KiB).
- [ ] Lighthouse das duas rotas: A11y/BP/SEO 100; Performance registrada no PR (CT-06).
- [ ] iPhone (Expo Go): mapa abre e fecha; registrado no PR (ou "não verificado" explícito).
- [ ] Portões do ADR 0013.

## Testes exigidos
- RNTL: botão abre/fecha, `aria-expanded` muda, foco volta ao botão ao fechar; `MapaRota` mockado.
- Playwright: nenhuma requisição a `leaflet`, `leaflet-1.9.4.css` ou `tile.openstreetmap.org` antes do clique; depois do clique o mapa aparece; axe com o mapa aberto.

## Checklist de acessibilidade e performance
- [ ] Conteúdo gráfico fora da árvore de acessibilidade (`aria-hidden`/`importantForAccessibility="no-hide-descendants"`), com rótulo descritivo no contêiner ("Mapa da rota de Uberlândia - MG a Uberaba - MG").
- [ ] Mapa não prende o Tab (controles de zoom do Leaflet desligados ou fora da ordem de Tab; `keyboard: false`).
- [ ] `prefers-reduced-motion`: sem animação de zoom/pan (`zoomAnimation: false`, `fadeAnimation: false`).
- [ ] Atribuição do OpenStreetMap legível nos dois temas.
