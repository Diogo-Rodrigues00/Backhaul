# 041 — Admin: fretes e usuários

| Campo | Valor |
|---|---|
| Itens | painel admin mínimo (decisão 3 da Fase 6) |
| Tipo | feature |
| Agente / modelo | `dev-front` / **haiku** — duas listas somente leitura copiando o molde do 040 e de "Meus fretes" |
| Branch | `feat/041-admin-fretes-usuarios` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 040 · INT · **sem PROTO** (decisão do Pedro em 04/11) |
| Bloqueia | 046 |
| Onda | 2 |

## Objetivo
Duas telas de acompanhamento para o admin: os fretes mais recentes (com pagamento e comissão) e os usuários cadastrados.

## Rotas da API
- `GET /admin/fretes` ✅: até 100, mais recentes primeiro: `{ fretes: [{ id, tipo_carga, valor_final, status_entrega, coleta_em, entrega_em, criado_em, empresa: 'texto', motorista: 'texto', veiculo_placa, status_pagamento, valor_comissao }] }`. `status_pagamento` e `valor_comissao` são `null` enquanto a empresa não pagou.
- `GET /admin/usuarios` ✅: até 200, mais recentes primeiro: `{ usuarios: [{ id, email, tipo, ativo, criado_em, nome }] }`, sem senha, CPF ou CNPJ. Admin vem com `nome: null`.
- Erros das duas: 401 · 403.

**Consome as peças do `integracao-api`** (tipos `FreteAdmin`/`UsuarioAdmin`, fetchers, hooks `useFretesAdmin`/`useUsuariosAdmin`, chaves, MSW). Não recriar.

## Telas / componentes
- `src/app/admin/fretes.tsx` + `src/telas/CorpoFretesAdmin.tsx` (+ `.carregar.ts`): `TemplateLista`, `BotaoAtualizar`, sem atualização automática. Cada item é um cartão (`h3` com o tipo de carga) com `ListaDeFatos`: Empresa, Motorista, Placa, Valor do frete, Entrega (rótulo de `status_entrega` de `lib/rotulos.ts`), Pagamento (rótulo de `status_pagamento`, ou **"Não pago"** quando `null`), Comissão (`formatarMoeda(valor_comissao)`, ou **"Ainda não calculada"** quando `null`; texto em vez de "—", que o leitor de tela lê como "travessão"), Criado em.
- `src/app/admin/usuarios.tsx` + `src/telas/CorpoUsuariosAdmin.tsx` (+ `.carregar.ts`): cartão com `h3` = nome (ou o e-mail quando `nome` é `null`), E-mail, Perfil (`rotuloDoPerfil`), Situação ("Ativo"/"Inativo"), Cadastrado em.
- Quando a lista chegar no limite (100 fretes / 200 usuários): aviso "Mostrando os 100 mais recentes."
- Cartões em lista, não tabela: reflow a 320 px sem rolagem horizontal.
- `itensDaArea.ts`: admin ganha "Fretes" (`truck`) e "Usuários" (`user`), depois de "Resumo".

## Arquivos e pastas
Os acima + `src/components/organisms/CartaoFreteAdmin.tsx` e `CartaoUsuarioAdmin.tsx` (ou um único `CartaoFatos` se o 040 tiver criado), testes, `e2e/admin-listas.spec.ts`, `e2e/rotas.ts` (`/admin/fretes` e `/admin/usuarios`, perfil admin).

## Critérios de aceite
- [ ] `/admin/fretes`: ordem da API; campos acima; `null` de pagamento e comissão em texto ("Não pago", "Ainda não calculada"); comissão exatamente a da API.
- [ ] `/admin/usuarios`: ordem da API; nome ou e-mail no título; perfil e situação em texto; nenhum documento.
- [ ] Vazio: "Nenhum frete ainda" / "Nenhum usuário cadastrado".
- [ ] Erro 500/rede com "Tentar de novo"; 401 → login; 403 → guarda.
- [ ] Menu do admin com Resumo, Fretes, Usuários; duas rotas em `e2e/rotas.ts`.
- [ ] Portões do ADR 0013; JS inicial das duas rotas ≤ 360 KiB.

## Testes exigidos
- Tela (RNTL + MSW): lista, vazio, `null` de pagamento/comissão, admin com `nome: null`, aviso de limite (fixture com 100 itens gerados), 500, 401.
- E2E: navegar Resumo → Fretes → Usuários pelo menu com teclado; axe nas duas rotas.

## Checklist de acessibilidade e performance
- [ ] Um `h1` por tela, cartões com `h3`, campos como lista de termos e definições.
- [ ] Status em texto, não só cor.
- [ ] Lighthouse com a fixture de 20 fretes e 20 usuários: A11y/BP/SEO 100; Performance registrada no PR (lista longa: conferir que o corpo segue fora do JS inicial).
