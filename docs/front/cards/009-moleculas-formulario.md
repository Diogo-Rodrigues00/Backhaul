# 009 — Formulários: campos, resumo de erros, cartão e templates de formulário

| Campo | Valor |
|---|---|
| Itens MVP | base de MVP-03, 05, 06, 08, 10, 13 (CT-01, CT-03, CT-05) |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — associação rótulo/erro diferente na web e no iPhone, foco no resumo e Select nativo são acessibilidade não trivial |
| Branch | `feat/moleculas-formulario` |
| Estimativa | M (≈4 h) |
| Bloqueado por | 004 (`src/lib/erros.ts`), 006, 008, 010 · DS (seções 5.2–5.4) |
| Bloqueia | 015, 016, 017, 018, 019, 023, 025 |

## Objetivo
Campos acessíveis, o helper que leva erros 400/409/500 ao campo certo ou ao resumo (ADR 0007), e os templates de página de formulário do DS.

## Rotas da API
Nenhuma diretamente (usa `ErroApi` de `src/lib/erros.ts`).

## Telas / componentes
`src/components/molecules/`:
- `CampoTexto` (TextInput + FormField): rótulo visível acima ("(opcional)" quando for), ajuda, erro (borda 3 px + ícone + texto), altura 48; repassa `autoComplete`, `inputMode`, `textContentType`, `secureTextEntry`, `onSubmitEditing`; usa `propsDeCampo`.
- `CampoSenha` (PasswordField): botão "Mostrar senha"/"Ocultar senha" com `aria-pressed`, alvo 44.
- `CampoNumero` (AffixField): prefixo "R$" ou sufixo "kg"/"km" `aria-hidden` (unidade no rótulo), `inputMode` `numeric`/`decimal`.
- `CampoSelecao` (Select): `@react-native-picker/picker` (na web `<select>`), mesmo visual do campo, rótulo e erro associados.
- `GrupoOpcoes` (ChoiceChip + UrgencyPicker + DeadlinePicker): `role="radiogroup"` com legenda; opção `role="radio"` `aria-checked`, selecionada com fundo `bg.highlight` + check; variante com `SeloUrgencia` dentro.
- `ResumoErros` (ErrorSummary): `Banner` de erro + lista de links que focam o campo; `role="alert"`, `tabIndex={-1}`, `ref` para foco; texto "Corrija N campos para continuar."; botão opcional "Tentar de novo".
- `formulario.ts`: `aplicarErroApi(erro, { setError, campos, definirResumo, focarResumo })`.
`src/components/organisms/CartaoFormulario.tsx` (FormCard): grade de 2 colunas (1 coluna ≤ 720 via `dataSet`), rodapé de ações à direita, `role="form"` com nome.
`src/components/templates/`:
- `TemplateFormulario` (FormPageTemplate): `Cabecalho` simples + página ≤ 760 px + link "Voltar" + `CartaoFormulario`; `h1` e descrição estáticos.
- `TemplateFormularioComPrevia` (FormWithPreviewTemplate): `TemplateTela` + grade formulário + lateral de 340 px que some ≤ 900 (`dataSet`).

## Arquivos e pastas
Acima + testes. Instalar `react-hook-form` e `@react-native-picker/picker`.

## Critérios de aceite
- [ ] Web: `TextInput` com `id`, rótulo por `aria-labelledby`, erro e ajuda por `aria-describedby`, `aria-invalid` com erro; `getByLabelText('E-mail')` encontra o campo.
- [ ] iPhone: VoiceOver lê rótulo e o erro como dica.
- [ ] `aplicarErroApi` com `validacao` `['cpf deve ter 11 dígitos', 'erro geral']` → 1ª no campo `cpf`, 2ª no resumo, foco no resumo (CT-03).
- [ ] `mensagem` (409) → resumo com o texto da API; `falha` → "Algo deu errado. Tente de novo." + "Tentar de novo".
- [ ] Sem resumo, foco no primeiro campo com erro; links do resumo focam o campo.
- [ ] `GrupoOpcoes` com nome do grupo; seleção indicada por check, não só cor.
- [ ] `CampoSelecao` vira `<select>` rotulado na web.
- [ ] Templates: 1 `h1`, landmarks, 320 px sem rolagem horizontal; 2 colunas viram 1 sem JS.

## Testes exigidos
- RNTL: cada molecule (rótulo, erro associado, estados); `CampoSenha` alterna; `GrupoOpcoes` muda valor; `aplicarErroApi` com os 4 tipos de `ErroApi`; formulário de teste com `useForm` (erro local não chama envio; clique duplo = 1 envio).

## Checklist de acessibilidade e performance
- [ ] Rótulo sempre visível (placeholder nunca é rótulo).
- [ ] Zoom 200% e 320 px: rótulo, campo e erro empilham sem cortar.
- [ ] Dynamic Type: campo cresce com o texto.
- [ ] Teclado numérico/decimal no iPhone nos `CampoNumero`.
