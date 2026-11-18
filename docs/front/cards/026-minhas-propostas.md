# 026 — Motorista: minhas propostas

## Revisão 2026-11-04
- **Reativado** (tinha sido cortado do MVP em 23/10 porque a rota 4a não existia). `GET /propostas/minhas` agora existe na `main`, mas no formato **plano** (`docs/api.md`), não no da proposta 4a.
- **Saiu do escopo:** origem → destino, urgência, certificação, status e vencimento da carga, e o aviso "Carga não está mais disponível". A API não devolve esses campos; voltam só se o Diogo entregar o P3/A5 (`pedido-ao-diogo.md`), em card próprio.
- **Entrou:** item "Minhas propostas" no menu do motorista (`itensDaArea`), corpo carregado sob demanda (padrão `Corpo*.carregar.ts` usado nas outras telas), espaço para o botão "Abrir conversa" do 043.
- Bloqueios: 007, 012, 013 já estão em `front`; agora depende do **036** (tipo `MinhaProposta` plano e mocks) e do **PROTO** (card 039).
- O plano B local (`lib/propostasEnviadas.ts`) **não** entra nesta tela: ele guarda só `cargaId` e tipo, não dá para montar a lista. Continua só em "Cargas próximas" (036).

| Campo | Valor |
|---|---|
| Itens MVP | MVP-15, CT-09, CT-10 |
| Prioridade | Fase 6 |
| Agente / modelo | `dev-front` / **haiku** — lista sobre `TemplateLista`, `CorpoSobDemanda` e polling/anúncio prontos (ADR 0010), mesmo molde de "Meus fretes" do motorista |
| Branch | `feat/026-minhas-propostas` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 036 · PROTO (039) |
| Bloqueia | 043 |
| Onda | 1 |

## Objetivo
`/motorista/propostas`: o motorista acompanha as propostas que fez e descobre, sem recarregar, quando a empresa aceitou ou recusou.

## Rotas da API
`GET /propostas/minhas` ✅ — `{ propostas: [{ id, tipo, valor_proposto, status, criado_em, chamado_carga_id, chamado_disp_id, tipo_carga, valor_oferecido, empresa, frete_id }] }`, mais recentes primeiro. `status`: `pendente | aceita | recusada | expirada`; `frete_id` só quando `aceita`. Erros: 401 · 403 · 404 `perfil de motorista não encontrado`. Hook `useMinhasPropostas` já existe (`src/api/propostas.hooks.ts`).

## Telas / componentes
- `src/app/motorista/propostas.tsx`: casca (`TemplateTela` com `h1` "Minhas propostas", frase fixa, `CorpoSobDemanda` + esqueleto), igual a `src/app/motorista/fretes.tsx`.
- `src/telas/CorpoMinhasPropostas.tsx` + `CorpoMinhasPropostas.carregar.ts`: `TemplateLista`, `useMinhasPropostas({ automatico: true })`, `BotaoAtualizar`, `BarraNovidades`, `useAnunciarNovidades`.
- `src/components/organisms/CartaoMinhaProposta.tsx` (PropostaCard motorista do protótipo 039): título `h3` com tipo de carga; empresa; "Valor oferecido" (`valor_oferecido`) e, na contraproposta, "Seu valor" (`valor_proposto`); tipo em texto ("Aceitou o valor"/"Contraproposta"); status em texto + `Etiqueta`; data do envio; link "Ver frete" (`/motorista/fretes`) **só** quando `frete_id` não é `null`; espaço (`children`/slot) para o botão de conversa do 043.
- `src/lib/descreverMudancasPropostas.ts` (pura, molde de `lib/descreverMudancasFretes.ts`): "Proposta aceita: Grãos", "Proposta recusada: Grãos", "Proposta expirada: Grãos".
- `src/components/organisms/itensDaArea.ts`: motorista ganha `{ href: '/motorista/propostas', rotulo: 'Minhas propostas', icone: <do protótipo; sugestão 'send'> }` (apagar o comentário do corte de 23/10).

## Arquivos e pastas
Os acima + testes (`src/app/__tests__/minhas-propostas.test.tsx`, `minhas-propostas.polling.test.tsx`, `src/lib/descreverMudancasPropostas.test.ts`, `CartaoMinhaProposta.test.tsx`), `e2e/minhas-propostas.spec.ts`, `e2e/rotas.ts` (`{ caminho: '/motorista/propostas', perfil: 'motorista' }`). Fixture: a de `mocks/fixtures/propostas.ts` (formato do 036), com 8 itens para o Lighthouse.

## Passos
1. Casca da rota e corpo sob demanda (copiar o molde de "Meus fretes" do motorista).
2. `CartaoMinhaProposta` com os estados do protótipo.
3. `descreverMudancasPropostas` + teste; ligar no `useAnunciarNovidades`.
4. Menu e `e2e/rotas.ts`.
5. Specs de tela, polling e E2E.

## Critérios de aceite
- [ ] Cada proposta mostra tipo de carga, empresa, valor oferecido, valor proposto (contraproposta), tipo, status em texto e data (MVP-15, sem os campos que a API não tem).
- [ ] Ordem igual à da API.
- [ ] "Ver frete" aparece só quando `frete_id` existe; proposta `aceita` sem `frete_id` não mostra link nem inventa texto.
- [ ] Vazio: "Você ainda não fez propostas" + link "Ver cargas próximas".
- [ ] Erro: 500/rede → `EstadoErro` com "Tentar de novo"; 404 de perfil → mensagem da API; 401 → login com aviso (global).
- [ ] Mudança de status aparece em ≤ 15 s e é anunciada sem mover o foco (CT-09); com a aba oculta, nenhuma requisição.
- [ ] Item "Minhas propostas" no cabeçalho e na barra inferior; rota em `e2e/rotas.ts`.
- [ ] Portões do ADR 0013; JS inicial de `/motorista/propostas` ≤ 360 KiB e do mesmo tamanho das outras telas do motorista (corpo fora do JS inicial).

## Testes exigidos
- Tela (RNTL + MSW): lista, vazio, aceita com link, aceita sem `frete_id`, recusada, expirada, 500, 404 de perfil, 401.
- Polling (ADR 0010): 10 s com foco; 0 requisições em 30 s sem foco; anúncio só na mudança, não na primeira carga.
- Unidade: `descreverMudancasPropostas`.
- E2E: abrir pelo menu com teclado; axe na rota (2 temas × 2 larguras, via `e2e/rotas.ts`).

## Checklist de acessibilidade e performance
- [ ] Status em texto (não só cor); selo com contraste AA nos dois temas.
- [ ] Anúncio educado, sem roubar o foco; polling não remonta a lista (key = `id`).
- [ ] Link "Ver frete" com nome único ("Ver frete de Grãos").
- [ ] Lighthouse com 8 propostas na fixture: A11y/BP/SEO 100; Performance registrada no PR.
