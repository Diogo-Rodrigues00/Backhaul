# 035 — Mapa de visualização sob demanda (se der)

| Campo | Valor |
|---|---|
| Itens MVP | MVP-23 |
| Prioridade | **Se der** — só se começar antes de 24/10 (não depende de rota nova) |
| Agente / modelo | `dev-front` / **sonnet** — implementação diferente por plataforma, carregamento sob demanda e risco direto ao Lighthouse |
| Branch | `feat/mapa` |
| Estimativa | G (≈6 h) |
| Bloqueado por | 021, 024, 027 ou 028 (telas onde o botão entra) · PROTO (Leaflet e `react-native-maps` já previstos no ADR 0011) |
| Bloqueia | — |

## Objetivo
"Ver no mapa" mostra a rota origem → destino da carga/frete e, para o motorista, as cargas em volta do local ativo, sem custo para quem não clica.

## Rotas da API
Nenhuma nova (coordenadas já devolvidas por `GET /cargas/proximas`, `GET /cargas/minhas`).

## Telas / componentes
- `organisms/MapaRota` com `Mapa.web.tsx` (Leaflet 1.9.4 por `import()` dinâmico, CSS junto, tiles OpenStreetMap com atribuição visível) e `Mapa.native.tsx` (`react-native-maps` 1.27.2, já no Expo Go).
- Botão "Ver no mapa" abre o mapa abaixo do cartão (`React.lazy` + `Suspense` com `Carregando`); "Fechar mapa" devolve o foco.
- Toda informação do mapa repetida em texto ao lado (origem, destino, distância) e o mapa com `aria-hidden` no conteúdo gráfico + rótulo descritivo; nenhuma ação depende do mapa.

## Critérios de aceite
- [ ] Rotas sem clicar em "Ver no mapa" não baixam código de mapa (conferir na aba Rede e no orçamento) (MVP-23).
- [ ] Mostra origem → destino e, para o motorista, as cargas em volta do local ativo (MVP-23).
- [ ] Toda informação também em texto; o mapa não é o único meio de nenhuma ação (MVP-23).
- [ ] Lighthouse 100 mantido nas rotas que oferecem o mapa (MVP-23, CT-06).
- [ ] Atende CT-05 e CT-08.

## Testes exigidos
RNTL: botão abre/fecha e devolve foco; mapa mockado. Playwright: nenhuma requisição a tiles/Leaflet antes do clique.

## Checklist de acessibilidade e performance
- [ ] Mapa não prende o foco do teclado (tiles fora da ordem de Tab).
- [ ] Movimento reduzido: sem animação de zoom.
- [ ] Atribuição do OpenStreetMap legível nos dois temas.
