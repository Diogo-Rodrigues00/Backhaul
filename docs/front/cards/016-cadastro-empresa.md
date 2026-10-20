# 016 — Escolha de perfil e cadastro de empresa

| Campo | Valor |
|---|---|
| Itens MVP | MVP-05, link "Criar conta" de MVP-03, D-PO-01, D-PO-14 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **haiku** — formulário simples seguindo o ADR 0007 e o padrão do login (015) |
| Branch | `feat/cadastro-empresa` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 009, 013 · PROTO · (recomendado) 015 em `front` como referência |
| Bloqueia | — |

## Objetivo
`/cadastro` (escolher "Sou motorista" ou "Sou empresa") e `/cadastro/empresa` com entrada automática após o 201.

## Rotas da API
`POST /cadastro/empresa` ✅ (201, 400, 409), `POST /login` ✅ e `GET /eu` ✅ (entrada automática via `useSessao().entrar`).

## Telas / componentes
- `src/app/cadastro/index.tsx`: `TemplateFormulario` + dois `Link` "como botão": "Sou motorista" → `/cadastro/motorista`, "Sou empresa" → `/cadastro/empresa`; link "Já tenho conta" → `/entrar`.
- `src/app/cadastro/empresa.tsx` com `TemplateFormulario` + `CartaoFormulario`: campos e-mail (`autoComplete="email"`), senha (`CampoSenha`, `autoComplete="new-password"`), razão social, CNPJ (`inputMode="numeric"`); `Botao` "Criar conta" ("Criando conta…").
- Validação local (D-PO-14): e-mail válido e ≤ 150, senha ≥ 8, razão social obrigatória e ≤ 150, CNPJ com 14 dígitos (pontuação aceita).
- Mapa de campos da API: `{ email: 'email', senha: 'senha', razao_social: 'razaoSocial', cnpj: 'cnpj' }`.
- Após 201: `entrar(email, senha)`; se o login automático falhar, `router.replace('/entrar?email=…')` (D-PO-01).

## Arquivos e pastas
`src/app/cadastro/index.tsx`, `src/app/cadastro/empresa.tsx`, testes em `src/app/cadastro/__tests__/`, `e2e/cadastro-empresa.spec.ts`, `e2e/rotas.ts` (`/cadastro`, `/cadastro/empresa`).

## Critérios de aceite
- [ ] Formulário com e-mail, senha, razão social e CNPJ e validação de D-PO-14 (MVP-05).
- [ ] 201 → entra automaticamente e abre "Minhas cargas" (MVP-05, D-PO-01).
- [ ] 409 `e-mail ou CNPJ já cadastrado` → mensagem no formulário e dados (exceto senha) continuam preenchidos (MVP-05).
- [ ] 400 → cada mensagem junto do campo correspondente (`cnpj …` no CNPJ) (MVP-05, CT-03).
- [ ] Clique duplo = 1 requisição (CT-01).
- [ ] Atende CT-05 a CT-08.

## Testes exigidos
- Tela (RNTL + MSW): sucesso com entrada automática, login automático falhando, 409, 400 com mensagens por campo, 500 HTML, validação local.
- Playwright: caminho feliz até `/empresa/cargas`.

## Checklist de acessibilidade e performance
- [ ] Um `h1` por tela nas duas rotas; rótulos visíveis.
- [ ] Senha limpa após 409, foco no resumo.
- [ ] 320 px sem rolagem horizontal; Dynamic Type sem corte.
