# 008 — Atoms do design system

| Campo | Valor |
|---|---|
| Itens MVP | base de todas as telas (CT-01, CT-05, D-PO-13) |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — define os padrões de acessibilidade (ADR 0009) que todos os outros componentes copiam |
| Branch | `feat/atomos` |
| Estimativa | G (≈5 h) |
| Bloqueado por | 005, 006 · DS (seções 4, 5.1 e 6) |
| Bloqueia | 010, 011, 012 (e, por eles, 009) |

## Objetivo
Atoms da seção 5.1 do design-system com todos os estados (P, H, F, Pr, D, C) e semântica explícita na web e no iPhone. Nomes no código: tabela da seção 6 de `docs/front/arquitetura.md`.

## Rotas da API
Nenhuma.

## Telas / componentes
`src/components/atoms/`:
- `Texto` (níveis de `type` via `fonte()`; `numerico` liga `dataSet={{ num: '' }}` para algarismos tabulares), `Titulo` (`nivel` 1–3 → `role="heading"` + `aria-level`; aceita `ref` e `tabIndex={-1}`), `TextoOculto`.
- `Botao` (Button): variantes `primario`, `secundario`, `perigo`, `texto`; tamanhos `md` 48 / `lg` 56 / `bloco`; `carregando` com Spinner + rótulo de progresso ("Publicando…"), `aria-busy` e `aria-disabled`, ignora toques (1 clique = 1 requisição); `desabilitado` real; ícone à esquerda decorativo; Pr desce 1 px (sem movimento com movimento reduzido).
- `Link`: texto `text.link` sublinhado 2 px (H 3 px); envolve o `Link` do expo-router (vira `<a href>`); variante "como botão".
- `SeloUrgencia` (UrgencyBadge, DS seção 6): texto em caixa alta + forma (círculo/triângulo/octógono) + cor; tamanhos md 32 / lg 40; nome acessível "Urgência: Crítico".
- `Etiqueta` (StatusTag): variantes `neutro`, `ok`, `erro`, `info`, `novo`, `tracejada`; sempre ícone + texto.
- `MarcadorKm` (KmMarker): "12,4 km até a coleta" (recebe número; usa `formatarDistancia`).
- `Preco` (Price): `formatarMoeda`, `text.accent`, 30 px tabular; variante `expirado`.
- `Icone.web.tsx` (`<svg>` com paths) / `Icone.native.tsx` (`react-native-svg`), `icones.ts` com os ícones listados no DS seção 4; decorativo por padrão (`aria-hidden`), `rotulo` opcional para ícone sozinho.
- `Carregando` (Spinner): pequeno/grande, sempre com texto; parado com movimento reduzido.
- `Esqueleto` (Skeleton): linhas/blocos, `aria-hidden`, brilho desligado com movimento reduzido.
- `DivisorEstrada` (RoadDivider), `Logo` (link "Backhaul, início", SVG do `docs/front/identidade/`).
- `RegiaoViva`: assina `anunciar` de `src/lib/a11y`; `role="status"`, `aria-live="polite"`, visualmente oculta. Montada uma vez no `_layout`.

## Arquivos e pastas
Os arquivos acima + testes ao lado; `src/app/_layout.tsx` (monta `RegiaoViva`). Instalar `react-native-svg`. Sem página de vitrine (evita rota extra).

## Critérios de aceite
- [ ] Só tokens (`useTema`/`useEstilos`/`fonte`); nenhuma cor, espaço ou tamanho literal.
- [ ] `Botao` com `carregando`: dois toques rápidos chamam `aoPressionar` uma vez; nome acessível vira o rótulo de progresso (CT-01).
- [ ] `Titulo nivel={1}` gera `<h1>` no HTML exportado; `Link` gera `<a href>`.
- [ ] Foco visível: outline 3 px `focus.ring`, offset 3 px, nos dois temas.
- [ ] Alvos: `Botao` ≥ 48 px; nada interativo abaixo de 24 px.
- [ ] `SeloUrgencia` distinto em escala de cinza (texto + forma) e lido como "Urgência: …" (D-PO-13).
- [ ] `RegiaoViva` anuncia `anunciar()` sem mover o foco.
- [ ] Nenhum código de `react-native-svg` no bundle web.

## Testes exigidos
- RNTL por atom: papel, nome acessível, estados (`disabled`, `busy`), clique duplo com `carregando`, `Titulo` com `aria-level`, selo com texto e prefixo oculto, `RegiaoViva` recebendo `anunciar`, movimento reduzido parando Spinner/Esqueleto.
- Diferença do JS inicial de `/` antes/depois registrada no PR.

## Checklist de acessibilidade e performance
- [ ] Ordem de foco natural; sem `tabIndex` positivo.
- [ ] VoiceOver: "botão", "título", "link"; Dynamic Type sem corte (Expo Go ou "não verificado" no PR).
- [ ] Sem `ActivityIndicator`, sem `@expo/vector-icons`, sem `lucide-react-native`.
