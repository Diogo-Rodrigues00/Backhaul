# 013 — Sessão de 7 dias, guardas de rota, sair e área admin

| Campo | Valor |
|---|---|
| Itens MVP | MVP-04, D-PO-10, parte de MVP-03 (roteamento por perfil) |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — estado global de sessão, 401 global, guardas sem quebrar a renderização estática |
| Branch | `feat/sessao-guardas` |
| Estimativa | G (≈5 h) |
| Bloqueado por | 004, 006, 010 · PROTO (casca logada e tela admin) |
| Bloqueia | 015, 016, 017, 019, 020, 021, 022, 026, 027, 028 |

## Objetivo
Implementar o ADR 0006: `SessaoProvider`, registro no cliente HTTP, layouts protegidos por perfil com o cabeçalho de cada área, redirecionamento de `/`, sair e a tela de admin de D-PO-10.

## Rotas da API
`POST /login` (via `entrar`), `GET /eu` (restaurar sessão); 401 de qualquer rota protegida (CT-04).

## Telas / componentes
- `src/state/sessao/` (`SessaoProvider`, `useSessao`).
- `src/app/_layout.tsx`: `QueryClientProvider` + `SessaoProvider` (ordem: Tema → Query → Sessão).
- `src/app/empresa/_layout.tsx`, `motorista/_layout.tsx`, `admin/_layout.tsx`: guarda em efeito + `Cabecalho` variante `completo` e `BarraAbas` com os links da área (ver `arquitetura.md` seção 3), `nomeUsuario` de `GET /eu`, `aoSair`.
- `src/app/admin/index.tsx`: "Perfil de administrador sem telas nesta versão" + "Sair" (D-PO-10).
- Rotas provisórias com só `TemplateTela` (título e descrição do PROTO) para os destinos: `empresa/cargas/index.tsx` e `motorista/cargas.tsx` (os cards 020 e 024 preenchem).
- `src/app/index.tsx`: com sessão `autenticado`, redireciona para a área do perfil.

## Arquivos e pastas
Acima + `e2e/rotas.ts` (adicionar `/admin`, `/empresa/cargas`, `/motorista/cargas` com perfil) + `e2e/sessao.spec.ts`.

## Critérios de aceite
- [ ] Login feito, recarregar a página (web) ou reabrir o app (iPhone) mantém o usuário na sua área sem novo login (MVP-04).
- [ ] "Sair" apaga token e disponibilidade ativa, limpa o cache e abre `/entrar`; voltar no navegador não mostra dados da sessão anterior (MVP-04).
- [ ] Qualquer 401 em rota protegida leva a `/entrar?aviso=sessao-expirada` (o texto é exibido pelo card 015) (CT-04).
- [ ] `GET /eu` 404 apaga o token e leva ao login com aviso `conta-nao-encontrada` (MVP-04).
- [ ] Motorista que abre `/empresa/cargas` é levado a `/motorista/cargas` (e vice-versa); anônimo é levado a `/entrar`.
- [ ] Admin vê a tela de D-PO-10 com "Sair".
- [ ] HTML estático das rotas protegidas mostra cabeçalho + `h1` (sem redirecionar no build); sem aviso de hidratação.
- [ ] Lighthouse 100 e axe 0 em `/admin`, `/empresa/cargas`, `/motorista/cargas` (logado por token de mock).

## Testes exigidos
- RNTL + MSW: restaurar sessão (token válido, 401, 404), `sair`, 401 vindo de outra query, guarda por tipo, redirecionamento de `/`.
- Playwright: entrar por token de mock, recarregar e continuar logado; sair e voltar no navegador.

## Checklist de acessibilidade e performance
- [ ] Redirecionamentos não roubam foco de forma inesperada (foco vai ao `h1` da tela de destino).
- [ ] Nome do usuário no cabeçalho lido pelo VoiceOver.
- [ ] Nenhum `localStorage` lido durante a renderização.
