# ADR 0011 — Performance, orçamento de bundle e estratégia para Lighthouse 100

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
Portão: Lighthouse **100** em Performance, Acessibilidade, Boas práticas e SEO, **mobile e desktop, em todas as rotas web**. Performance mobile (CPU 4× mais lenta, rede 4G simulada) é o maior risco técnico: react-dom + react-native-web + expo-router já somam um JS inicial considerável, e o tempo de hidratação vira Total Blocking Time (30% da nota).

## Decisão
### Estratégia
1. **HTML estático por rota** (ADR 0002): título `h1` e um parágrafo de descrição estáticos em toda tela, renderizados pelo `TemplateTela` no HTML. Eles são o maior texto da primeira dobra e definem o LCP antes do JS. Cartões de lista usam textos curtos (não podem virar o maior elemento).
2. **Divisão por rota** (`asyncRoutes` web em produção): cada tela é um chunk; dados estáticos (lista de cidades) só entram nos chunks de quem usa (`SeletorLocal` e telas que mostram nome de cidade), nunca no `_layout`.
3. **Dependências mínimas** (lista de proibidos no ADR 0001). Nova dependência de runtime só com ADR.
4. **Ícones:** `atoms/Icone.web.tsx` renderiza `<svg>` direto, com os paths do conjunto Lucide listado no DS (seção 4); zero biblioteca na web. `Icone.native.tsx` usa `react-native-svg` com os mesmos paths. Paths num único `atoms/icones.ts`. Proibido `@expo/vector-icons` e `lucide-react-native` (pacote inteiro).
5. **Fontes:** Barlow 500 e 700 do design-system, hospedadas no próprio site (2 `woff2` latinos, ≤ 40 KB juntos), `preload` + `font-display: optional` (sem troca no meio da carga, sem CLS, sem atrasar LCP). Nada de CDN externa. Detalhes no ADR 0008.
6. **Sem terceiros:** sem analytics, sem fontes ou scripts de CDN, sem iframes.
7. **Mapa ("se der"):** `React.lazy` só ao clicar "Ver no mapa"; web com Leaflet 1.9.4 importado dinamicamente (CSS junto), iPhone com `react-native-maps`. Nenhuma rota baixa código de mapa sem o clique.
8. **MSW nunca no bundle de produção:** ramo `EXPO_PUBLIC_API_MOCK` eliminado no build; o orçamento confere que nenhum chunk contém `mockServiceWorker`/`msw`.
9. **Sem layout shift:** áreas que carregam dados reservam altura mínima (`Carregando` com a mesma altura do estado vazio); imagens com `width`/`height`; fonte (se houver) com métricas compatíveis.
10. **Boas práticas:** zero erro no console (sem 4xx nos mocks durante a auditoria, sem aviso de hidratação, `favicon.ico` presente), HTTPS na Vercel, `vercel.json` com cache imutável para `/_expo/static/`.
11. **SEO:** `lang="pt-BR"`, `<title>` e `meta description` únicos por rota (via `TemplateTela`), links como `<a href>`, `robots.txt` válido, sem `noindex`.

### Orçamento (verificado por `scripts/orcamento-bundle.mjs` no CI, falha o PR se estourar)
| Item | Limite (gzip) |
|---|---|
| JS inicial de qualquer rota (todos os `<script>` do HTML da rota) | **≤ 300 KB** (era 220 KB; revisado em 2026-10-20, ver adendo) |
| Chunk próprio de cada rota | ≤ 30 KB |
| CSS total | ≤ 15 KB |
| Fontes | 2 arquivos `woff2` (Barlow 500/700), ≤ 40 KB juntos |
| HTML de cada rota | ≤ 40 KB |
| Imagens na primeira dobra | só SVG inline ≤ 5 KB |

Metas de métrica no Lighthouse mobile (orientação; o portão é a nota): FCP ≤ 1,2 s, LCP ≤ 1,5 s, TBT ≤ 60 ms, CLS = 0.

### Portão de viabilidade (card 001)
O card da base mede o JS inicial vazio (expo-router + react-native-web, uma rota com `h1` e parágrafo) e roda o Lighthouse mobile no `dist/` servido localmente. Registra os números no PR. **Se a base vazia não fizer 100 em Performance mobile, o card para e reporta**: é decisão do Pedro (ver "Consequências"), não do executor.

## Alternativas
- **Web separada em Next.js/Vite (sem react-native-web):** melhor Performance, mas viola a decisão fechada "um código só".
- **Pré-carregar dados no build:** impossível; dados são por usuário.
- **Desligar a divisão por rota:** um chunk só, maior TBT nas rotas leves.

## Consequências
- Se o portão de viabilidade falhar, as saídas possíveis (todas exigem o Pedro) são: aceitar Performance mobile < 100 com nota registrada; reduzir o escopo do portão a desktop para Performance; ou trocar a stack web. Nenhuma é tomada pelo time sem aprovação.
- Revisor rejeita dependência nova sem ADR e qualquer estouro de orçamento.

## Adendo — 2026-10-20 (aprovado pelo Pedro)
A base do card 001 mediu **289,7 KB gzip** de JS inicial, quase todo do núcleo (react-dom 175 KB, react-native-web 276 KB e expo-router 409 KB, brutos). Os chunks por rota têm menos de 1 KB. Reduzir exigiria trocar ou podar o roteador, sem garantia e com risco ao prazo.

Decisão: o orçamento de JS inicial passa a **≤ 300 KB gzip**, com uma regra extra: **nenhum card pode aumentar o JS inicial** em relação à base (≈ 290 KB). Código de tela fica no chunk da rota (≤ 30 KB). Performance mobile < 100 é aceita com a nota registrada no PR. Acessibilidade, Boas práticas e SEO continuam 100.
