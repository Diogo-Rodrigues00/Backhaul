# 007 — Lista de cidades e busca

| Campo | Valor |
|---|---|
| Itens MVP | MVP-07 (dados e busca) |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **haiku** — transcrição de dados e duas funções puras com teste |
| Branch | `feat/cidades` |
| Estimativa | P (≈2 h) |
| Bloqueado por | 001 · LISTA (lista de cidades com lat/lng montada pelos membros, Q1) |
| Bloqueia | 018, 020, 021, 022, 024, 026 |

## Objetivo
Transformar a lista de cidades fornecida pelos membros (fonte IBGE, cobrindo todas as cidades do seed e do roteiro) em dado tipado e oferecer busca sem acento e "cidade mais próxima".

## Rotas da API
Nenhuma.

## Telas / componentes
Nenhum.

## Arquivos e pastas
- `src/data/cidades.ts`: `export const cidades: readonly Cidade[]` com `{ id, nome, uf, lat, lng }` (`id` = código IBGE). **Não inventar coordenadas**: só a lista entregue pelos membros.
- `src/lib/cidades.ts`: `normalizar(texto)` (minúsculas, sem acento), `buscarCidades(termo, limite = 8)`, `cidadeMaisProxima({ lat, lng })` (haversine), `rotuloDoLocal({ lat, lng })` → "Uberlândia - MG".

## Critérios de aceite
- [ ] Lista contém todas as cidades do seed de demo e do roteiro, cada uma com `lat`/`lng` numéricos (MVP-07).
- [ ] `buscarCidades('uberlandia')` encontra "Uberlândia"; `'UBERL'` também (MVP-07).
- [ ] `cidadeMaisProxima` de uma coordenada a 1 km do centro de uma cidade da lista devolve essa cidade.
- [ ] O módulo de cidades não é importado por `_layout`, templates nem atoms/molecules compartilhados: só pelo `SeletorLocal` e pelas telas que mostram nome de cidade (entra só nos chunks dessas rotas).

## Testes exigidos
- Unidade: normalização, busca (acento, maiúscula, prefixo, limite), mais próxima, rótulo. Fixture própria de 3 cidades nos testes (independe da lista final).

## Checklist de acessibilidade e performance
- [ ] Arquivo de dados ≤ 15 KB gzip; se a lista for maior, avisar o orquestrador.

## Notas
- Se a LISTA não chegar até o início do card, o PR pode sair com as funções e a fixture, e o dado entra num commit posterior no mesmo card antes do merge.
