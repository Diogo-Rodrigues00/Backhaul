# 030 — E2E do fluxo principal em duas janelas e auditoria final

| Campo | Valor |
|---|---|
| Itens MVP | CT-01 a CT-10 no conjunto; métrica "≤ 15 s entre janelas" do PRD |
| Prioridade | MVP (janela de correção 25–28/10: não adiciona funcionalidade) |
| Agente / modelo | `dev-front` / **sonnet** — mock com estado em memória e teste com dois contextos de navegador |
| Branch | `feat/e2e-fluxo-principal` |
| Estimativa | M (≈4 h) |
| Bloqueado por | 015–028 em `front` |
| Bloqueia | — |

## Objetivo
Provar o roteiro da demo de ponta a ponta no CI (com mocks) e fechar a auditoria de acessibilidade e Lighthouse de todas as rotas antes do ensaio.

## Rotas da API
Todas do MVP, via `mocks/servidor-http.ts` com **estado em memória** (`mocks/estado.ts`, reiniciado por `POST /__reset` só no servidor de mocks).

## Telas / componentes
Nenhuma nova.

## Arquivos e pastas
- `app/mocks/estado.ts` + ajuste dos handlers para ler/gravar o estado quando `MOCK_COM_ESTADO=1` (os testes Jest continuam com handlers sem estado).
- `app/e2e/fluxo-principal.spec.ts`: contexto A (empresa) e B (motorista), passos 1–9 da seção 4.3 do PRD, com `expect.poll` de até 15 s para o reflexo entre janelas.
- Relatório da auditoria no PR: tabela Lighthouse (rota × mobile/desktop × 4 categorias), axe por rota, checklist manual WCAG (teclado, foco, leitor de tela, contraste, zoom 200%, 320 px, movimento reduzido, erros associados) e checklist iPhone (VoiceOver, Dynamic Type) por tela.

## Critérios de aceite
- [ ] Fluxo 1–9 passa no CI; cada reflexo entre janelas ≤ 15 s sem clique.
- [ ] Todas as rotas de `e2e/rotas.ts` com 100 nas 4 categorias, mobile e desktop.
- [ ] axe 0 violações em todas as rotas, nos dois temas e nas duas larguras.
- [ ] Checklists manuais preenchidos; cada falha vira um card `fix:` separado (não corrigir neste PR).

## Testes exigidos
- O próprio E2E; reexecução do workflow completo.

## Checklist de acessibilidade e performance
- [ ] Teste de regressão: aba oculta 30 s = 0 requisições nas três telas com atualização automática (via `page.evaluate` emulando `visibilitychange`).
- [ ] JS inicial de cada rota registrado frente ao orçamento.
