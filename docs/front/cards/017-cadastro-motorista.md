# 017 — Cadastro de motorista

| Campo | Valor |
|---|---|
| Itens MVP | MVP-06, D-PO-01, D-PO-04, D-PO-14 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **haiku** — formulário de 8 campos no mesmo padrão do 015/016 |
| Branch | `feat/cadastro-motorista` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 009, 013 · PROTO · (recomendado) 015 em `front` |
| Bloqueia | — |

## Objetivo
`/cadastro/motorista` com dados pessoais e do veículo, entrada automática e chegada ao estado vazio de "Cargas próximas".

## Rotas da API
`POST /cadastro/motorista` ✅ (201, 400, 409), `POST /login` ✅, `GET /eu` ✅.

## Telas / componentes
- `src/app/cadastro/motorista.tsx` com `TemplateFormulario` + `CartaoFormulario` (2 colunas no desktop): e-mail, senha (`new-password`), nome completo (`autoComplete="name"`), CPF (`numeric`), CNH, tipo de veículo, placa (`autoCapitalize="characters"`), capacidade (`CampoNumero` com sufixo "kg", teclado numérico no iPhone); `Botao` "Criar conta".
- Validação (D-PO-14): e-mail ≤ 150, senha ≥ 8, nome ≤ 150, CPF 11 dígitos com pontuação aceita, CNH ≤ 20, tipo ≤ 50, placa ≤ 10, capacidade número > 0. Envia `capacidade_kg` como número.
- Mapa: `{ email, senha, nome_completo: 'nomeCompleto', cpf, cnh, veiculo_tipo: 'veiculoTipo', veiculo_placa: 'veiculoPlaca', capacidade_kg: 'capacidadeKg' }`.
- Após 201: `entrar`; destino `/motorista/cargas` (estado vazio D-PO-04 é do card 024; até lá, a tela provisória do 013).

## Arquivos e pastas
`src/app/cadastro/motorista.tsx`, teste, `e2e/cadastro-motorista.spec.ts`, `e2e/rotas.ts` (`/cadastro/motorista`).

## Critérios de aceite
- [ ] 8 campos com validação de D-PO-14 (MVP-06).
- [ ] Capacidade aceita só números; teclado numérico no iPhone (MVP-06).
- [ ] 201 → entra e abre "Cargas próximas" com a ação "Publicar disponibilidade" (MVP-06; a ação aparece quando o 024 estiver em `front`).
- [ ] 409 `e-mail ou CPF já cadastrado` → mensagem, dados (exceto senha) mantidos (MVP-06).
- [ ] Cadastro completo executável em ≤ 60 s (sem passos extras; Enter avança/enviar) (MVP-06).
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
- Tela (RNTL + MSW): sucesso, 409, 400 por campo (`cpf …`, `capacidade_kg …`), 500 HTML, validação local, capacidade enviada como número.
- Playwright: caminho feliz até `/motorista/cargas`.

## Checklist de acessibilidade e performance
- [ ] `onSubmitEditing` leva ao próximo campo (ordem visual) e o último envia.
- [ ] Sufixo "kg" faz parte do nome acessível ("Capacidade em kg").
- [ ] 320 px e Dynamic Type sem corte.
