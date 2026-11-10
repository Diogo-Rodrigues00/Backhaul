# ADR 0017 — Mapa de visualização sob demanda (card 035)

- Status: aceito (2026-11-09)
- Contexto: MVP-23, ADR 0011 item 7, card `035-mapa.md`

## Decisão
O mapa "Ver no mapa" é feito **sem biblioteca de mapa**: ladrilhos (tiles) do OpenStreetMap em `<img>` (web) ou `Image` (iPhone) com um `<svg>`/`react-native-svg` por cima para a rota, o círculo do raio de busca e os marcadores. A matemática (Web Mercator, zoom que enquadra os pontos, ladrilhos que cobrem a área) fica em `MapaRota.logica.ts`, pura e testada em Jest.

- Carregado por `React.lazy` + `import()` (`MapaRota.carregar.ts`) só depois do clique; chunk próprio de ~1 KiB gzip.
- Um código só para web e iPhone (`MapaRota.web.tsx` e `MapaRota.native.tsx` mudam só o desenho). **Sem `react-native-maps`** e sem Leaflet: nenhuma dependência nova, nada a mudar na regra de lint do ADR 0001.
- Sem interação (sem pan, zoom ou controles): nada prende o Tab ou o foco do VoiceOver, e não há animação (`prefers-reduced-motion` atendido por construção).
- Acessibilidade: contêiner `role="img"` com rótulo ("Mapa da rota de A a B"), legenda e atribuição "© OpenStreetMap contributors" em texto; a informação do mapa (origem, destino, distância, local e raio) já está em texto no cartão e na barra de contexto.

## Por que não Leaflet 1.9.4 (escolha do ADR 0011)
O `leaflet.js` minificado tem ~42 KiB gzip, mais os ~4 KiB de CSS e a imagem de ícones: sozinho estoura o chunk de rota do orçamento (30 KiB gzip, ADR 0011) e o CSS total (15 KiB). Para só visualizar uma rota entre dois pontos e um círculo, não vale. O card previa essa saída (ladrilhos estáticos quando a biblioteca é grande demais).

## Custo e riscos
- Rede só ao clicar: ~4 a 12 ladrilhos de `tile.openstreetmap.org` (sem token). Política de uso do OSM: uso leve de demonstração, com atribuição visível. Em produção de verdade seria preciso um provedor de tiles próprio.
- Offline ou bloqueado: os ladrilhos não aparecem (fundo neutro), mas rota, legenda e texto continuam; falha ao baixar o chunk mostra um aviso em texto e a tela segue funcionando (`LimiteDeErro`).
- No iPhone, `Image` envia o User-Agent padrão do sistema; o OSM pode limitar. Verificar no Expo Go.
- Teste: o CI intercepta `tile.openstreetmap.org` com `page.route` (E2E `mapa.spec.ts`); Jest troca `MapaRota.carregar` por um mock.
