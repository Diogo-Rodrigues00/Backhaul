# 021 — Empresa: propostas da carga, aceitar ou recusar

| Campo | Valor |
|---|---|
| Itens MVP | MVP-14, D-PO-08, CT-09, CT-10 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — atualização automática com anúncio, diálogos de ação irreversível e vários 409 |
| Branch | `feat/propostas-da-carga` |
| Estimativa | G (≈5 h) |
| Bloqueado por | 007, 011, 012, 013 · PROTO |
| Bloqueia | 033 (se der), 035 (se der) |

## Objetivo
`/empresa/cargas/detalhe?id=<uuid>`: resumo da carga e propostas recebidas, atualizando sozinho, com aceitar/recusar.

## Rotas da API
`GET /cargas/minhas` ✅ (resumo: não existe `GET /cargas/:id`; achar pelo `id`), `GET /cargas/:id/propostas` ✅ (automático), `POST /propostas/:id/responder` ✅ (`aceitar`/`recusar`; 200, 400, 404, 409).

## Telas / componentes
- `src/app/empresa/cargas/detalhe.tsx` com `TemplateLista`; `id` de `useLocalSearchParams`. HTML estático mostra só título/descrição (sem `id` no build).
- Topo: `ResumoCarga` com status efetivo.
- `organisms/CartaoProposta` (PropostaCard empresa do DS; `h3`; proposta nova com `Etiqueta` "Nova" e destaque `bg.highlight` que se acalma em 2,4 s, sem animação com movimento reduzido): tipo ("Aceita o valor"/"Contraproposta"), `valor_proposto`, status, data, `ResumoMotorista` (nome, veículo, placa, capacidade, certificações com validade só data e "Aprovada"/"Não aprovada"); botões "Aceitar" e "Recusar" só se proposta `pendente` e carga aberta e não vencida.
- Aceitar/Recusar → `DialogoConfirmacao` (D-PO-08). Aceitar: texto informa que fecha a carga e recusa as demais.
- Após aceitar (200): mensagem "Frete criado" + link "Ver fretes" (`/empresa/fretes`), invalidações (ADR 0004/card 004) e anúncio.
- `descreverNovidades(anterior, atual)`: "N nova(s) proposta(s)"; usado com `useAnunciarNovidades` e mostrado na `BarraNovidades` do `TemplateLista`.

## Arquivos e pastas
`src/app/empresa/cargas/detalhe.tsx`, `src/components/organisms/CartaoProposta.tsx`, `src/app/empresa/cargas/descreverNovidades.ts` (pura), testes, `e2e/propostas-da-carga.spec.ts`, `e2e/rotas.ts` (`/empresa/cargas/detalhe?id=<id da fixture>`).

## Critérios de aceite
- [ ] Topo com tipo, origem → destino, valor, urgência, certificação, status (MVP-14).
- [ ] Cada proposta com os campos de MVP-14; validade de certificação só data (D-PO-12).
- [ ] Ordem igual à da API (MVP-14).
- [ ] Botões só em proposta pendente de carga aberta e não vencida (MVP-14, CT-10).
- [ ] Aceitar confirmado + 200 → "Frete criado" com "Ver fretes"; proposta "Aceita", demais pendentes "Recusada", carga "Fechada" (MVP-14).
- [ ] Recusar confirmado + 200 → "Recusada" (MVP-14).
- [ ] 409 → mensagem da API e lista recarregada (MVP-14).
- [ ] `id` inexistente/de outra empresa (404) ou ausente → "Carga não encontrada" + link "Minhas cargas" (MVP-14).
- [ ] Vazio: "Nenhuma proposta ainda. Esta tela atualiza sozinha." (MVP-14).
- [ ] Nova proposta aparece em ≤ 15 s e é anunciada ("1 nova proposta") sem mover o foco (MVP-14, CT-09).
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
- Tela (RNTL + MSW): lista, vazio, 404, sem `id`, aceitar (efeitos), recusar, 409 com recarga, 500, 401; polling (10 s com foco, 0 em 30 s sem foco); anúncio só na mudança.
- Unidade: `descreverNovidades`.
- Playwright: aceitar com teclado (diálogo, foco preso, retorno de foco), axe com diálogo aberto.

## Checklist de acessibilidade e performance
- [ ] Botões com nome único ("Aceitar proposta de João da Silva").
- [ ] Polling não remonta a lista nem tira o foco de um botão.
- [ ] Mensagem "Frete criado" anunciada; link "Ver fretes" alcançável por Tab logo depois.
- [ ] Lighthouse 100 com a fixture de 5 propostas.
