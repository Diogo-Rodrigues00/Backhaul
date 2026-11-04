# 040 — Admin: casca e resumo

| Campo | Valor |
|---|---|
| Itens | D-PO-10 (substituído), painel admin mínimo (decisão 3 da Fase 6) |
| Tipo | feature |
| Agente / modelo | `dev-front` / **sonnet** — primeira tela da área admin: navegação nova, padrão que 041 e 032 vão copiar |
| Branch | `feat/040-admin-resumo` |
| Estimativa | M (≈3 h) |
| Bloqueado por | INT (hooks de `/admin/*` em `front`) · **sem PROTO** (decisão do Pedro em 04/11: segue o design system) |
| Bloqueia | 041, 032, 045 |
| Onda | 1 |

## Objetivo
Trocar o placeholder "Perfil de administrador sem telas nesta versão" (`/admin`) por um resumo da plataforma com navegação própria do admin, base para as telas de fretes, usuários (041) e certificações (032).

## Rotas da API
`GET /admin/resumo` ✅ (só admin): `{ resumo: { motoristas, empresas, cargas_abertas, propostas_pendentes, fretes_aceitos, fretes_em_transito, fretes_entregues, certificacoes_pendentes, volume_liberado, comissao_total, comissao_retida } }`. Erros: 401 · 403. `comissao_total` soma **só** pagamentos já `liberado` (frete entregue); `comissao_retida`, os que aguardam a entrega; `volume_liberado` é o valor dos fretes liberados.

**Consome as peças do `integracao-api`** (`feat/contrato-fase6`): tipo `ResumoAdmin`, fetcher, `useResumoAdmin`, chave `admin.resumo` e handler MSW. Não recriar.

## Telas / componentes
- `src/app/admin/index.tsx`: casca (`TemplateTela`, `h1` "Resumo da plataforma", frase fixa, `CorpoSobDemanda`). Remove o texto de D-PO-10 e o botão "Sair" solto (o "Sair" já está no cabeçalho).
- `src/telas/CorpoResumoAdmin.tsx` + `.carregar.ts`: grupos com `h2` e `ListaDeFatos`:
  - **Pessoas:** Motoristas, Empresas.
  - **Operação:** Cargas abertas, Propostas pendentes, Certificações aguardando aprovação.
  - **Fretes:** Aceitos, Em trânsito, Entregues.
  - **Dinheiro:** "Valor repassado (fretes entregues)" = `volume_liberado`; "Comissão recebida (fretes entregues)" = `comissao_total`; "Comissão retida (aguardando entrega)" = `comissao_retida`. Valores com `formatarMoeda`, **exatamente** o que a API devolveu (nada de percentual ou conta no front; `verificar:proibidos` continua passando).
- Sem atualização automática; `BotaoAtualizar` no topo.
- `src/components/organisms/itensDaArea.ts`: `admin: [{ href: '/admin', rotulo: 'Resumo', icone: 'inbox' }]` (ícone existente; troca se o designer pedir). **041 e 032 acrescentam os próprios itens** quando as rotas deles existirem: nunca link para rota que ainda não existe.
- Conta de demo: `database/seed-admin.sql` (credenciais fora do repositório).

## Arquivos e pastas
Os acima + `src/app/__tests__/admin-resumo.test.tsx`, ajuste de `src/app/__tests__/rotas-base.test.tsx` (se testar o texto antigo), `e2e/admin-resumo.spec.ts`. `e2e/rotas.ts` já tem `/admin` (perfil admin): só conferir que a fixture do resumo responde.

## Passos
1. Conferir em `front` as peças do INT para `/admin/resumo`.
2. Corpo com os quatro grupos; esqueleto com a mesma altura.
3. Casca e menu do admin; `BarraAbas` precisa funcionar com 1 item (hoje a lista do admin é vazia).
4. Testes e E2E.

## Critérios de aceite
- [ ] `/admin` mostra os 11 números da API, agrupados, com rótulos em pt-BR; dinheiro em R$.
- [ ] Rótulos de comissão dizem o que o número é (recebida × retida), sem percentual fixo.
- [ ] Carregando (esqueleto + "Carregando resumo…"), erro 500/rede com "Tentar de novo", 401 → login, 403 → guarda da área.
- [ ] Cabeçalho e barra inferior do admin com o item "Resumo"; nome nulo do admin (038) não quebra o cabeçalho.
- [ ] Portões do ADR 0013; JS inicial de `/admin` ≤ 360 KiB e menor ou igual ao das outras áreas (corpo fora do JS inicial).

## Testes exigidos
- Tela (RNTL + MSW): números renderizados com os rótulos; zero em todos os campos; 500; 401.
- E2E: entrar como admin (token de mock), ver o resumo, navegar por Tab até "Atualizar"; axe na rota (2 temas × 2 larguras).

## Checklist de acessibilidade e performance
- [ ] Um `h1`, grupos com `h2`, números em lista de termos e definições (`ListaDeFatos`), não em grade só visual.
- [ ] Reflow a 320 px sem rolagem horizontal.
- [ ] "Atualizar" anuncia "Resumo atualizado" sem mover o foco.
- [ ] Lighthouse `/admin`: A11y/BP/SEO 100; Performance registrada no PR.
