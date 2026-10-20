# ADR 0009 — Padrões de acessibilidade no Expo (web e iPhone)

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
WCAG 2.2 AA, axe 0 violações nos dois temas, Lighthouse Acessibilidade 100, VoiceOver e Dynamic Type no iPhone (decisão fechada "A11y no Expo"). O react-native-web transforma `role` e `aria-*` em HTML semântico; o iOS ignora parte dos `aria-*` (ex.: `aria-labelledby`, `aria-live`), então cada padrão precisa de uma versão nativa.

## Decisão
Todo padrão abaixo mora em **um** atom/molecule; telas não repetem `aria-*` à mão. Utilitários de plataforma em `src/lib/a11y.ts` (+ `.web.ts`/`.native.ts`).

| Necessidade | Web (react-native-web) | iPhone | Onde |
|---|---|---|---|
| Título da tela | `Text role="heading" aria-level={1}` (vira `<h1>`); 1 por tela | mesmo `role` (VoiceOver: "título") | atom `Titulo` (`nivel` 1–3) |
| Landmarks | `View role="banner"` (`<header>`), `"navigation"` (`<nav>`), `"main"` (`<main>`, `id="conteudo"`), `"contentinfo"` | sem efeito, sem prejuízo | `TemplateTela`, `Cabecalho` |
| Pular para o conteúdo | primeiro link do cabeçalho, visível ao receber foco | não renderiza | `Cabecalho` |
| Lista | `role="list"` + `role="listitem"`, renderizada com `.map` (sem `FlatList`: listas do MVP são curtas e `FlatList` na web perde semântica) | idem | `Lista` (molecule) |
| Botão | `Pressable role="button"`, `aria-disabled`, `aria-busy` quando carregando; texto visível = nome acessível | `accessibilityState` derivado | atom `Botao` |
| Link | `Link` do expo-router (vira `<a href>`) | `role="link"` | atom `Link` |
| Campo | `TextInput id`, rótulo `Text id` + `aria-labelledby`; erro `Text id` + `aria-describedby` + `aria-invalid` | `accessibilityLabel` = rótulo; `accessibilityHint` = erro | molecules `CampoTexto`, `CampoSenha`, `CampoNumero` via `propsDeCampo()` |
| Radio (ChoiceChip, UrgencyPicker, DeadlinePicker) | `role="radiogroup"` com rótulo (legenda) + `role="radio"` `aria-checked`, check visível na opção escolhida | idem | molecule `GrupoOpcoes` |
| Select (certificação) | `@react-native-picker/picker` vira `<select>` com `aria-labelledby` | seletor nativo com `accessibilityLabel` | molecule `CampoSelecao` |
| Combobox de cidade (CityCombobox) | `TextInput role="combobox"` + `aria-expanded`, `aria-controls`, `aria-activedescendant`; lista `role="listbox"`/`option`; setas, Enter, Esc; contagem em `role="status"` | lista de opções como botões abaixo do campo (VoiceOver não tem combobox) | organism `SeletorLocal` |
| Mostrar senha | `Pressable role="switch"` `aria-checked`, rótulo "Mostrar senha" | idem | `CampoSenha` |
| Anúncio sem mover foco | região global `role="status"` `aria-live="polite"` no `_layout` raiz | `AccessibilityInfo.announceForAccessibility` | `anunciar(mensagem)` em `src/lib/a11y` + atom `RegiaoViva` |
| Resumo de erros | `View role="alert"` com `tabIndex={-1}`; recebe foco após envio com erro | `setAccessibilityFocus` | molecule `ResumoErros` |
| Carregando | texto visível + `aria-busy` na área; animação parada com movimento reduzido | idem | atom `Carregando` |
| Diálogo de confirmação | `Modal` do RN (na web prende o foco) com `role="alertdialog"`, `aria-modal`, `aria-labelledby`/`aria-describedby`; foco inicial em "Cancelar"; Esc fecha; foco volta ao botão que abriu | `accessibilityViewIsModal` | organism `DialogoConfirmacao` |
| Foco ao trocar de rota | navegação no cliente: foco no `h1` (`tabIndex={-1}`); carga inicial: não mexe | `setAccessibilityFocus` no `h1` | `TemplateTela` + `moverFoco(ref)` |
| Selo de urgência / etiqueta de status | texto + forma (círculo, triângulo, octógono) + cor; nome lido "Urgência: Crítico" | idem | atoms `SeloUrgencia`, `Etiqueta` |

**Regras gerais**
- Foco visível (regra única do DS): `outline` 3 px `colors.focus.ring`, afastado 3 px (2 px nos campos); no cabeçalho asfalto, `focus.ringOnInverse`. Aplicado quando `focused` (estado do `Pressable` na web e `onFocus`/`onBlur` no campo). Nunca remover sem substituto.
- Alvos: `touch.control` (48) em controles, `touch.primary` (56) no botão principal do motorista, `touch.min` (44) no cabeçalho; nunca abaixo de `touch.absoluteMin` (24).
- Texto: tamanhos dos tokens; nada de altura fixa em contêiner de texto; `allowFontScaling` padrão (Dynamic Type). `maxFontSizeMultiplier` ≥ 2 se precisar limitar.
- Reflow 320 px: contêiner com `maxWidth` do token e `width: '100%'`; linhas com `flexWrap: 'wrap'`; sem largura fixa em px acima de 288.
- Movimento: toda animação consulta `useMovimentoReduzido()`.
- Campos: `autoComplete` (`email`, `current-password`, `new-password`, `name`), `inputMode` (`email`, `numeric`, `decimal`), `textContentType` no iOS; `onSubmitEditing` envia o formulário.
- Ordem de foco = ordem visual (sem `tabIndex` positivo).
- Testes de componente consultam por papel e nome (`getByRole('button', { name: 'Entrar' })`); se o teste não acha pelo papel, o componente está errado.

## Alternativas
- **Elementos HTML diretos (`<h1>`, `<form>`) via `.web.tsx`:** duplica componentes; o react-native-web já gera o HTML certo a partir de `role`.
- **Biblioteca de UI acessível (ex.: React Native Paper):** +peso e estilo próprio; o designer decide o estilo.

## Consequências
- Atoms e molecules de a11y (cards 008, 009, 011) são sonnet e viram referência obrigatória.
- Checklist nativo (VoiceOver, Dynamic Type) é manual, por card, registrado no PR.
