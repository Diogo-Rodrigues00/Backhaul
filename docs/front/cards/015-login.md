# 015 — Login e roteamento por perfil

| Campo | Valor |
|---|---|
| Itens MVP | MVP-03, aviso de MVP-04 / CT-04, D-PO-11 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — primeiro formulário real; vira a referência do padrão de formulário para os cards Haiku |
| Branch | `feat/login` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 009, 013 · PROTO |
| Bloqueia | (referência para 016, 017, 023) |

## Objetivo
Tela `/entrar` com e-mail e senha que leva cada perfil à sua área e mostra os avisos de sessão.

## Rotas da API
`POST /login` ✅ (401 → erro do formulário, D-PO-11), `GET /eu` ✅ (via `useSessao().entrar`).

## Telas / componentes
- `templates/TemplateAutenticacao` (AuthTemplate) + `organisms/PainelMarca` (AuthHero, decorativo; a chamada é `<p>`, o `h1` é "Entrar"); ≤ 900 px empilha (`dataSet`).
- `src/app/entrar.tsx` com `TemplateAutenticacao`, `CampoTexto` e-mail (`autoComplete="email"`, `inputMode="email"`), `CampoSenha` (`autoComplete="current-password"`), `ResumoErros`, `Botao` "Entrar" (progresso "Entrando…"), `Link` "Criar conta" → `/cadastro`.
- Avisos por query (`Banner` aviso, `role="status"`): `?aviso=sessao-expirada` → "Sua sessão expirou. Entre de novo."; `?aviso=conta-nao-encontrada` → texto do PROTO; mostrados no topo e anunciados (CT-04). `?email=` preenche o e-mail (fallback de D-PO-01).

## Arquivos e pastas
`src/components/templates/TemplateAutenticacao.tsx`, `src/components/organisms/PainelMarca.tsx`, `src/app/entrar.tsx`, `src/app/__tests__/entrar.test.tsx`, `e2e/login.spec.ts`, `e2e/rotas.ts` (`/entrar`).

## Critérios de aceite
- [ ] Empresa válida → abre "Minhas cargas" e o cabeçalho mostra o `nome` de `GET /eu` (MVP-03).
- [ ] Motorista → abre "Cargas próximas" (ou o estado vazio de D-PO-04) (MVP-03).
- [ ] Admin → tela de D-PO-10 com "Sair" (MVP-03).
- [ ] 401 → "E-mail ou senha inválidos" no formulário, foco na mensagem, usuário continua na tela (MVP-03, D-PO-11).
- [ ] Campo vazio → erro junto do campo sem chamar a API (MVP-03).
- [ ] Mostrar/ocultar senha por teclado e leitor de tela; `autocomplete` de e-mail e senha (MVP-03).
- [ ] "Criar conta" leva à escolha entre motorista e empresa (MVP-03).
- [ ] Aviso de sessão expirada exibido e anunciado (CT-04).
- [ ] Clique duplo em "Entrar" = 1 requisição (CT-01); 500/HTML/falha de rede → "Algo deu errado. Tente de novo." (CT-03).
- [ ] Atende CT-05 a CT-08 (axe 0 nos dois temas, Lighthouse 100 mobile/desktop, 320 px, Expo Go).

## Testes exigidos
- Tela (RNTL + MSW): sucesso dos 3 perfis (destino), 401, 400 `erros`, 500 HTML, campos vazios, aviso por query, clique duplo.
- Playwright: login com `empresa@mock.test` chega a `/empresa/cargas`; Enter no campo de senha envia.

## Checklist de acessibilidade e performance
- [ ] Ordem de foco: aviso (se houver) → e-mail → senha → mostrar senha → Entrar → Criar conta.
- [ ] Erro de login associado ao formulário e anunciado.
- [ ] VoiceOver: campos com rótulo; Dynamic Type sem corte; teclado de e-mail no iPhone.
- [ ] Chunk da rota ≤ 30 KB gzip.
