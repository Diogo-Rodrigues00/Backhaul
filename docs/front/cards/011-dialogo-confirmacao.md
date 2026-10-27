# 011 — Diálogo de confirmação acessível

| Campo | Valor |
|---|---|
| Itens MVP | base de MVP-13, MVP-14, MVP-16, MVP-17 (D-PO-06, D-PO-08, D-PO-09) |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — diálogo modal com foco preso, retorno de foco e Esc, na web e no iPhone |
| Branch | `feat/dialogo-confirmacao` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 008 · DS |
| Bloqueia | 021, 025, 027, 028 |

## Objetivo
Um único diálogo de confirmação (ConfirmDialog do DS, seções 5.3 e 7) para ações irreversíveis (aceitar/recusar proposta, avançar status, pagar, enviar contraproposta).

## Rotas da API
Nenhuma.

## Telas / componentes
`organisms/DialogoConfirmacao`: props `aberto`, `titulo`, `descricao`, `children?` (conteúdo extra, ex.: campo de contraproposta ou resumo do pagamento), `rotuloConfirmar`, `rotuloCancelar = 'Cancelar'`, `variante?: 'padrao' | 'perigo'`, `carregando?`, `erro?: string`, `aoConfirmar`, `aoFechar`, `refRetorno` (elemento que abriu).
- Visual do DS: borda 3 px `border.strong`, sombra `dialog` (web `var(--shadow-dialog)`), raio `lg`.
- `Modal` do React Native (`transparent`, `animationType` `none` com movimento reduzido, senão `fade`); conteúdo com `role="alertdialog"`, `aria-modal`, `aria-labelledby` (título) e `aria-describedby` (descrição); `accessibilityViewIsModal` no iPhone.
- Foco inicial em "Cancelar"; Esc e `onRequestClose` fecham; ao fechar, foco volta a `refRetorno`.
- `carregando`: botão de confirmar com rótulo de progresso e desabilitado; Cancelar também desabilitado.
- `erro`: texto em `role="alert"` dentro do diálogo, diálogo continua aberto.

## Arquivos e pastas
`src/components/organisms/DialogoConfirmacao.tsx` + teste.

## Critérios de aceite
- [ ] Na web, Tab circula só dentro do diálogo enquanto aberto.
- [ ] Esc fecha e devolve o foco ao botão que abriu.
- [ ] Leitor de tela anuncia título e descrição ao abrir.
- [ ] Confirmar com `carregando` não dispara segunda chamada (CT-01).
- [ ] 320 px: diálogo ocupa a largura disponível sem rolagem horizontal; conteúdo longo rola dentro do diálogo.
- [ ] Botões ≥ 44 px; `perigo` usa o token de perigo e mantém texto explícito.

## Testes exigidos
- RNTL: abre com papel `alertdialog` e nome; confirmar chama `aoConfirmar`; cancelar chama `aoFechar`; `carregando` desabilita; `erro` aparece com `role="alert"`.
- Playwright (numa tela que use o diálogo, a partir do card 021): foco preso, Esc, retorno de foco, axe 0 com o diálogo aberto.

## Checklist de acessibilidade e performance
- [ ] Animação desligada com `prefers-reduced-motion`.
- [ ] VoiceOver fica preso no diálogo (`accessibilityViewIsModal`).
- [ ] Nenhuma biblioteca de modal externa.
