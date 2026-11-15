# 034 — Motorista: cancelar disponibilidade

## Revisão 2026-11-04
- O contrato de referência agora é o **P2/A2** de `docs/front/pedido-ao-diogo.md` (substitui o "C2" do relatório 4c): também recusa as propostas **pendentes** feitas com a disponibilidade. A rota **ainda não existe** na `main` nem em `docs/api.md`.
- **Só executa** com a rota em `main` **e** documentada em `docs/api.md`. Se o contrato real divergir do P2, vale o `docs/api.md` (atualizar este card antes de começar).
- **Novo:** enquanto `GET /disponibilidades/minhas` (4b/A3) não existir, a lista vem do **plano B local**; cancelar precisa **apagar a cópia guardada no aparelho** e o provider recalcula a ativa.
- PROTO saiu dos bloqueios (botão de perigo + diálogo em tela já existente). 011 e 022 já estão em `front`.

| Campo | Valor |
|---|---|
| Itens MVP | MVP-22 |
| Prioridade | Fase 6 (condicional à rota) |
| Agente / modelo | `dev-front` / **haiku** — botão com diálogo sobre tela e provider existentes (sobe para sonnet se o provider precisar de mais que uma função nova) |
| Branch | `feat/034-cancelar-disponibilidade` |
| Estimativa | P (≈2 h) |
| Bloqueado por | **ROTA-P2** (em `main` + `docs/api.md`) |
| Bloqueia | — |
| Onda | 2 (só se a rota existir) |

## Objetivo
Botão "Cancelar disponibilidade" em "Minhas disponibilidades", para o motorista sair da busca.

## Rotas da API
**P2 (proposta, conferir em `docs/api.md`)**: `POST /disponibilidades/:id/cancelar`, sem corpo → status `cancelado`; propostas `pendente` feitas com ela → `recusada`.
- `200 { "disponibilidade": { "id": "uuid", "status": "cancelado" } }`
- `400` · `401` · `403` · `404 "disponibilidade não encontrada"` (também de outro motorista) · `409 "disponibilidade não está aberta"`.

O card cria fetcher, hook (invalida `disponibilidades.minhas`, `propostas.minhas`, `cargas.proximas`) e handler MSW no formato de `docs/api.md`.

## Telas / componentes
- `src/components/organisms/CartaoDisponibilidade.tsx`: botão "Cancelar disponibilidade" só em aberta e não vencida; `DialogoConfirmacao` ("Cancelar esta disponibilidade? Você sai da busca e as propostas pendentes feitas com ela serão recusadas.").
- `src/state/disponibilidade-ativa/DisponibilidadeAtivaProvider.tsx` (+ `DisponibilidadeAtivaContext.ts`): função `marcarCancelada(id)` (ou `descartar(id)`) que, no plano B (`origem === 'local'`), apaga a cópia guardada; em qualquer origem, a ativa é recalculada (próxima aberta e no prazo, ou nenhuma → "Cargas próximas" pede para publicar, D-PO-04).

## Arquivos e pastas
`src/api/disponibilidades.ts`, `.hooks.ts`, `src/api/tipos.ts`, `mocks/handlers/disponibilidades.ts`, `CartaoDisponibilidade.tsx`, `src/app/motorista/disponibilidades/index.tsx` (ou o corpo dela), provider e `lib/disponibilidadeAtiva.ts` se a função de armazenamento estiver lá, testes.

## Implementação (PR #156)
- Contrato: `docs/api.md` (`POST /disponibilidades/:id/cancelar`, sem corpo). O backend confere com o doc. 404 e 409 vêm como `{ erro }` e a tela mostra o texto da API.
- Sem sobreposição local de "cancelado": o 200 relê a lista (invalidação do hook, a mutation só termina depois) e só então a tela anuncia a troca de ativa. No 409/404 nada é marcado como cancelado: a escolha e a cópia do plano B saem, e a lista é relida (`await atualizar()`), para a API dizer o estado (ex.: "Expirada").
- Anúncio da troca de ativa sai depois da releitura, por último na região viva (o "Lista atualizada" do `BotaoAtualizar` sai antes, pelo efeito do filho).
- Rota de Minhas disponibilidades com corpo sob demanda (`CorpoMinhasDisponibilidades.carregar.ts`). Se o chunk das consultas falhou antes, o corpo relê uma vez ao montar: um "Tentar de novo" basta (`e2e/chunk-falha.spec.ts`).

## Critérios de aceite
- [x] Botão só em disponibilidade aberta e não vencida (MVP-22). Testes em `CartaoDisponibilidade.test.tsx`.
- [x] `200` → "Cancelada" no cartão; se era a ativa, a ativa troca (ou some) e a troca é anunciada (`minhas-disponibilidades-cancelar-ativa.test.tsx`, `-nao-ativa`, `-plano-b`).
- [x] Plano B: a cópia guardada no aparelho é apagada (`-plano-b.test.tsx`, assert em `ler(CHAVES.disponibilidadeAtiva)` = `null`).
- [x] `409` → mensagem da API e releitura; `404` → mensagem e releitura (`-409.test.tsx`, `-404.test.tsx`).
- [x] "Voltar" fecha sem enviar POST (`minhas-disponibilidades-cancelar-voltar.test.tsx`); foco inicial em "Voltar" (`DialogoConfirmacao.dom.test.tsx`).
- [x] Portões: typecheck, `npx expo lint`, Prettier, Jest serial, E2E `chunk-falha`, `minhas-disponibilidades`, `publicar-disponibilidade`, `cargas-proximas`, `fazer-proposta` e `a11y` (cópia em portas altas, não commitada).
- [ ] **Pendência:** E2E próprio de cancelar (não implementado).
- [ ] **Pendência:** o mock com estado `comEstado.ts` (tokens `fluxo-*`, usado pelo E2E do fluxo completo e pela demo com roteiro de dois navegadores) não tem o `POST /disponibilidades/:id/cancelar`. Quem cancela com token de fluxo recebe 404 do mock. Os handlers sem estado (`mocks/handlers/disponibilidades.ts`) têm o POST.
- [ ] JS inicial: medido na mesma máquina, com `npx expo export -p web -c` e `EXPO_PUBLIC_API_URL=http://localhost:5120`: base `origin/front` (4d7da5b) máximo **351,3 KiB**; PR máximo **350,0 KiB**; variação por rota entre −1,5 e 0 KiB. Limite 360 KiB, `npm run orcamento` respeitado.

## Testes exigidos
Tela (RNTL + MSW): botão visível só quando permitido; 200 com troca da ativa (origem `api` e origem `local`); 409; armazenamento local apagado no plano B.

## Checklist de acessibilidade e performance
- [x] Nome único do botão por item ("Cancelar disponibilidade perto de Uberlândia - MG, expira em 22/10/2026, 12:00"); foco inicial em "Voltar" no diálogo.
- [x] Troca da ativa anunciada sem mover o foco.
- [ ] iPhone (Expo Go) e VoiceOver não verificados.
