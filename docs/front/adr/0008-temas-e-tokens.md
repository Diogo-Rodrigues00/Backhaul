# ADR 0008 — Tema claro/escuro, consumo dos tokens, fonte e responsivo

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
- Tema claro e escuro: segue o sistema; alternância manual salva (MVP-01). AA nos dois.
- O designer publicou `docs/front/design-system.md` com o bloco `tokens.ts` pronto (seção 3.5): `colors.light` / `colors.dark` com papéis aninhados (`bg.page`, `text.primary`, `urgency.critico.bg` …), variáveis CSS equivalentes (`--bg-page`, `--text-primary` …), tema em `<html data-theme="light|dark">` (sem atributo = sistema), alternância em 3 estados (Sistema → Claro → Escuro), fonte Barlow 500/700 e pontos de quebra por largura. Ele deixou a hospedagem da fonte para o tech-lead.
- A web é HTML estático gerado em Node: o servidor não sabe o tema nem a largura do usuário. Decidir tema ou layout só em JavaScript faz a página piscar e gera diferença de hidratação (erro no console derruba Boas práticas).

## Decisão
**Tokens**
- `src/theme/tokens.ts` = bloco 3.5 do design-system **colado sem mudança de nomes** (`colors`, `brand`, `fonts`, `type`, `space`, `radius`, `border`, `touch`, `breakpoints`, `shadow`, `motion`, `urgencyLabel`, `urgencyIcon`). Fonte da verdade: o `design-system.md`; mudança de token só pelo designer.
- Toda cor existe pronta nos dois temas; o código nunca calcula cor (sem opacidade ou mistura em JS).

**Web: variáveis CSS**
- `src/theme/css.ts` → `gerarCssGlobal()` achata `colors.light` em `:root{--bg-page:…;--text-primary:…;--urgency-critico-bg:…}` (caminho com hífen, camelCase vira kebab: `onInverse` → `on-inverse`), `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){…dark}}` e `:root[data-theme="dark"]{…dark}`. Sombras viram `--shadow-card` / `--shadow-dialog` (texto CSS da tabela 3.4).
- `src/app/+html.tsx` injeta esse CSS em `<style>` e um script inline mínimo antes do corpo que lê `localStorage['backhaul.tema']` (`light` | `dark`; ausente = sistema) e põe `data-theme` no `<html>`. Dois `<meta name="theme-color">` com `media`.
- Na web, `useTema().colors.bg.page` vale `'var(--bg-page)'` (string constante): o react-native-web repassa ao CSS. Sombra na web: `boxShadow: 'var(--shadow-card)'`; no iPhone, `shadow.light|dark.card`.

**iPhone: valores** — `useTema()` devolve os hex do esquema efetivo (`useColorScheme()` + preferência).

**API única** (`src/state/tema/`)
- `TemaProvider`; `useTema(): { preferencia: 'sistema' | 'claro' | 'escuro', esquema: 'light' | 'dark', colors, alternar() }` + reexporta `space`, `radius`, `type`, `touch`, `motion`.
- `alternar()` cicla Sistema → Claro → Escuro (DS, ThemeToggle), grava `backhaul.tema` (apaga a chave em "Sistema") e, na web, atualiza `document.documentElement.dataset.theme`.
- `useEstilos(criarEstilos)`: memoiza `StyleSheet.create(criarEstilos(tema))` por esquema.
- `useMovimentoReduzido()` em `src/hooks/`.

**Tipografia e fonte (decisão de hospedagem pedida pelo designer)**
- Web: Barlow 500 e 700 **hospedadas no próprio site** (`public/fontes/barlow-latin-500.woff2`, `barlow-latin-700.woff2`, copiadas do pacote `@fontsource/barlow` 5.3.0, licença OFL), `@font-face` no CSS global com `font-display: optional` e `<link rel="preload" as="font" crossorigin>` dos dois arquivos. `optional` evita troca de fonte no meio da carga (CLS 0) e nunca atrasa o LCP; na visita seguinte a fonte já está em cache. Nada de Google Fonts.
- iPhone: `@expo-google-fonts/barlow` (`Barlow_500Medium`, `Barlow_700Bold`) carregado com `useFonts` **só** em `src/theme/fontes.native.ts` (o pacote não entra no bundle web).
- `fonte(nivel)` em `src/theme/tipografia.ts` devolve o estilo pronto por plataforma: web `{ fontFamily: fonts.fallbackWeb, fontWeight: '500'|'700', fontSize: '1.0625rem', lineHeight: '1.625rem' }` (rem a partir de `type`, como o DS pede); iPhone `{ fontFamily: 'Barlow_500Medium'|'Barlow_700Bold', fontSize: 17, lineHeight: 26 }` com `maxFontSizeMultiplier: 2` no `Texto`.

**Responsivo sem JS na primeira pintura**
- Layout fluido por padrão (`flexWrap`, `maxWidth`, `width: '100%'`).
- Onde o DS troca estrutura por largura (barra inferior ≤ 720 px, navegação do cabeçalho, grade de 2 colunas ≤ 720, lateral que some ≤ 900): na web, a View recebe `dataSet={{ bp: 'so-celular' | 'sem-celular' | … }}` (vira `data-bp`) e o CSS global gerado de `breakpoints` esconde/mostra com `@media`; no iPhone, `useWindowDimensions()`. Helper `src/theme/responsivo.ts` com os nomes permitidos.
- CSS global também traz: `scroll-padding-bottom` da barra inferior (DS seção 8) e `font-variant-numeric: tabular-nums` para `[data-num]`.

**Restrições para componentes**
- Sem `ActivityIndicator` (cor por atributo SVG não lê variável CSS): `Carregando`/Spinner próprio.
- `brand.hazardStripe` (gradiente) só em arquivo `.web.tsx` via `style={{ backgroundImage }}`; no iPhone, SVG repetido.

## Alternativas
- **Tema só em JS também na web:** pisca no escuro e gera erro de hidratação.
- **Google Fonts (como no protótipo):** ida a outro domínio + CSS bloqueante; pior no Lighthouse.
- **`@expo-google-fonts` também na web:** carrega TTF inteiro, sem subconjunto (≈ 4× maior).
- **`useWindowDimensions` na web:** o HTML estático não sabe a largura; layout pula na hidratação.

## Consequências
- Mudar o DS = colar de novo o bloco 3.5; o CSS se regenera.
- Contraste verificado nos dois temas pelo axe (Playwright emula `prefers-color-scheme` e `data-theme`).
