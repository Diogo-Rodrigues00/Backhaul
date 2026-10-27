# 005 — Tema, tokens, fonte Barlow e CSS global

| Campo | Valor |
|---|---|
| Itens MVP | MVP-01 (tema segue o sistema e alternância persiste), RNF-03 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — mecanismo novo: variáveis CSS na web, valores no iPhone, fonte por plataforma, sem erro de hidratação |
| Branch | `feat/tema` |
| Estimativa | M (≈4 h) |
| Bloqueado por | 001 · DS (bloco `tokens.ts` da seção 3.5 do `design-system.md`, já publicado) |
| Bloqueia | 008 e todos os componentes |

## Objetivo
Implementar o ADR 0008: tokens do designer, CSS global gerado (temas, fonte, pontos de quebra), `TemaProvider` com 3 estados, tipografia por plataforma e `useMovimentoReduzido`.

## Rotas da API
Nenhuma.

## Telas / componentes
Sem componente visual próprio (o `AlternarTema` fica no card 010). Aplicar fundo `bg.page`, texto `text.primary` e `fonte('base')` em `/` e `+not-found` para provar o mecanismo.

## Arquivos e pastas
- `src/theme/tokens.ts`: bloco 3.5 do `design-system.md` **colado sem mudar nomes nem valores**.
- `src/theme/css.ts` (`gerarCssGlobal()`: variáveis `--bg-page`… dos dois temas, `--shadow-card`/`--shadow-dialog`, `@font-face` Barlow 500/700 com `font-display: optional`, `@media` por `breakpoints` para `[data-bp=…]`, `scroll-padding-bottom`, `[data-num]{font-variant-numeric:tabular-nums}`).
- `src/theme/tipografia.ts` (`fonte(nivel)`), `src/theme/responsivo.ts` (nomes de `dataSet` + `useLargura()` no iPhone), `src/theme/fontes.native.ts` / `fontes.web.ts` (vazio).
- `src/state/tema/TemaProvider.tsx`, `useTema.ts`, `useEstilos.ts`; `src/hooks/useMovimentoReduzido.ts`.
- `public/fontes/barlow-latin-500.woff2`, `barlow-latin-700.woff2` (copiados de `@fontsource/barlow` 5.3.0; script `scripts/copiar-fontes.mjs` no `postinstall` ou arquivos versionados — escolher e registrar; licença OFL citada em `public/fontes/LICENSE.txt`).
- `src/app/+html.tsx`: `<style>` do CSS global, `<link rel="preload" as="font" type="font/woff2" crossorigin>` dos 2 arquivos, script inline de `data-theme`, dois `theme-color` (`#14181D` claro e escuro, conforme DS seção 4).
- `src/app/_layout.tsx`: `TemaProvider`; no iPhone, aguarda `useFonts` antes de mostrar o conteúdo.
- Armazenamento: usar `src/lib/armazenamento` se o 006 já estiver em `front`; senão, implementar só a chave `backhaul.tema` com o mesmo contrato e deixar nota para o 006 unificar.
- Instalar `expo-font`, `@expo-google-fonts/barlow`, `@fontsource/barlow` (dev).

## Critérios de aceite
- [ ] Web com sistema escuro: primeira abertura já pinta escuro, sem piscar.
- [ ] `alternar()` cicla Sistema → Claro → Escuro; após recarregar (web) ou reabrir (iPhone) a escolha continua; "Sistema" volta a seguir o sistema (MVP-01).
- [ ] Nenhum aviso de hidratação no console.
- [ ] iPhone: `useTema().colors` devolve hex do esquema efetivo e a Barlow aparece; web: `var(--…)` e a Barlow vem de `/fontes/` (nenhuma requisição a Google Fonts).
- [ ] `fonte('base')` na web gera `font-size` em `rem`.
- [ ] Um `View` com `dataSet={{ bp: 'so-celular' }}` some acima de 720 px sem JS.
- [ ] Nenhuma cor literal fora de `src/theme/tokens.ts`.
- [ ] Orçamento: fontes ≤ 40 KB juntas; Lighthouse de `/` continua 100 (CLS 0).

## Testes exigidos
- Unidade: `gerarCssGlobal` (as 3 regras de tema com todas as chaves, `@font-face`, `@media`); `useTema` cicla e grava; `useEstilos` memoiza por esquema; `fonte` por plataforma; `useMovimentoReduzido` com mock.
- Playwright: `colorScheme: 'dark'` → fundo `#0E1216`; `localStorage['backhaul.tema']='light'` com sistema escuro → fundo `#EDEFF2`.

## Checklist de acessibilidade e performance
- [ ] Script inline < 1 KB, sem dependências.
- [ ] `font-display: optional` + preload (sem troca de fonte visível, CLS 0).
- [ ] Texto em `rem` (respeita a fonte padrão do navegador) e Dynamic Type no iPhone (`maxFontSizeMultiplier` 2).
- [ ] Sem `ActivityIndicator`.
