# 036 — Minhas propostas no formato real (CRÍTICO)

| Campo | Valor |
|---|---|
| Itens | correção de produção (R1 da spec da Fase 6), MVP-13, D-PO-05 |
| Tipo | fix |
| Agente / modelo | `dev-front` / **sonnet** — muda um tipo usado em produção, o mock com estado do E2E e o plano B; regressão silenciosa se errar |
| Branch | `fix/036-minhas-propostas-formato-real` |
| Estimativa | M (≈4 h) |
| Bloqueado por | 6.0 (PR #105 `chore/trazer-main` em `front`) |
| Bloqueia | 026, 043, 046 |
| Onda | 0 — **primeiro a mergear**; deploy de produção logo depois |

## Objetivo
Parar o `TypeError` que "Cargas próximas" lança em produção para motorista com proposta pendente ou contraproposta: `GET /propostas/minhas` já existe e é **plano**, mas o app lê `p.carga.id` (formato da proposta 4a, que nunca saiu).

## Rotas da API
`GET /propostas/minhas` ✅ (`docs/api.md`). Resposta:
```json
{ "propostas": [ { "id": "uuid", "tipo": "contraproposta", "valor_proposto": 3200, "status": "recusada",
  "criado_em": "…", "chamado_carga_id": "uuid", "chamado_disp_id": "uuid",
  "tipo_carga": "Grãos", "valor_oferecido": 3500, "empresa": "Transportes Rápidos LTDA", "frete_id": null } ] }
```
`status`: `pendente | aceita | recusada | expirada`. `frete_id` só quando `aceita`. **Não** tem filtro `?status=` (a API ignora a query). Erros: 401 · 403 · 404 `perfil de motorista não encontrado`.

## Arquivos prováveis
- `app/src/api/tipos.ts` (~218–244): apagar `CargaDaMinhaProposta`; `MinhaProposta` plano.
- `app/src/api/propostas.ts`: tirar o comentário "PROPOSTA relatório 4a".
- `app/src/telas/usePropostasDoMotorista.ts` (linhas 83 e 91): `p.carga.id` → `p.chamado_carga_id`.
- `app/mocks/fixtures/propostas.ts` (~137–182): `minhasPropostasMock` no formato real (remover `resumoDaCarga`).
- `app/mocks/handlers/propostas.ts` (~92–106): responder a lista inteira, sem o filtro `?status=`.
- `app/mocks/handlers/comEstado.ts` (~382) + `app/mocks/estado.ts`: `GET /propostas/minhas` passa a **200** a partir do estado (propostas do motorista do token, `criado_em` DESC, `frete_id` do frete criado no aceite). Atualizar o comentário do topo (linhas 6–8).
- Testes: `src/app/__tests__/cargas-proximas.test.tsx` (~175–200), `cargas-proximas-atualizar.test.tsx`, `cargas-proximas-estados.test.tsx`, `fazer-proposta.test.tsx` (~86–150), `src/test-utils/cenarioFazerProposta.tsx`, `src/api/hooks.test.tsx`, `src/api/polling.test.tsx`.
- `app/src/lib/propostasEnviadas.ts`: só o comentário do topo (deixa de ser "enquanto a rota não existe"; vira fallback).

## Passos
1. Tipo: `MinhaProposta = { id; tipo: TipoProposta; valor_proposto: Numerico; status: StatusProposta; criado_em; chamado_carga_id; chamado_disp_id; tipo_carga; valor_oferecido: Numerico; empresa: string; frete_id: string | null }`. Rodar `npm run typecheck` e corrigir cada uso.
2. `usePropostasDoMotorista`: trocar as duas leituras; manter a regra "a lista da API prevalece; sem ela (404, rede, 5xx), vale o que o aparelho guardou".
3. Fixtures e handler sem estado no formato real (manter 3 itens: pendente/contraproposta, aceita/aceite com `frete_id`, recusada/contraproposta).
4. Mock com estado (`comEstado.ts`): substituir `respostaRotaInexistente('GET', '/propostas/minhas')` por 200 lido de `estado`. O E2E do fluxo completo não pode mais depender do 404.
5. Atualizar os testes listados; acrescentar o teste de regressão (abaixo).
6. Conferir `npm run verificar` inteiro.

## Critérios de aceite
- [ ] Com proposta **pendente** na API, "Cargas próximas" renderiza sem erro e mostra "Proposta enviada" no cartão daquela carga, sem botões.
- [ ] Com **contraproposta** em qualquer status (pendente, aceita, recusada, expirada), a carga não oferece mais contraproposta (D-PO-05).
- [ ] Rota 404 ou erro de rede: o plano B (`lib/propostasEnviadas.ts`) continua marcando as cargas enviadas deste aparelho; com 200, a resposta da API vence mesmo que o aparelho tenha outra lista.
- [ ] Nenhuma referência a `p.carga`, `disponibilidade_id` de proposta ou `CargaDaMinhaProposta` em `app/` (`grep` limpo).
- [ ] Mock com estado responde 200 em `GET /propostas/minhas`; `e2e/fluxo-completo.spec.ts` passa sem depender do 404.
- [ ] Portões do ADR 0013 verdes; JS inicial de `/motorista/cargas` não aumenta (≤ 360 KiB).

## Testes exigidos
- **Regressão (RNTL + MSW):** resposta no formato real com uma proposta `pendente` e uma `contraproposta` `recusada` → a tela renderiza, marca a pendente e esconde a contraproposta da outra. Falha hoje com `TypeError`.
- Fallback: `GET /propostas/minhas` 404 → usa o aparelho; 200 vazio → não usa o aparelho.
- `hooks.test.tsx`: `useMinhasPropostas` devolve o formato plano.
- E2E: fluxo completo com a rota em 200.

## Checklist de acessibilidade e performance
- [ ] "Proposta enviada" continua com texto e o foco volta ao marcador depois do envio (comportamento do 025 inalterado).
- [ ] Nenhum import novo no corpo de "Cargas próximas" (orçamento igual ao de `front`).
