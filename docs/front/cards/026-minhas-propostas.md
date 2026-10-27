# 026 — Motorista: minhas propostas

| Campo | Valor |
|---|---|
| Itens MVP | MVP-15, CT-09, CT-10 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **haiku** — lista sobre `TemplateLista`, `ResumoCarga` e o polling/anúncio já prontos (ADR 0010) |
| Branch | `feat/minhas-propostas` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 007, 012, 013 · PROTO |
| Bloqueia | — |

## Objetivo
`/motorista/propostas`: acompanhar as propostas e saber, sem recarregar, quando uma foi aceita ou recusada.

## Rotas da API
`GET /propostas/minhas` 🔜 — **não existe**. Proposta do relatório 4a, só MSW (handlers do 004):
```json
{ "propostas": [ { "id": "uuid", "tipo": "contraproposta", "valor_proposto": 3200.00, "status": "pendente",
  "criado_em": "…", "disponibilidade_id": "uuid",
  "carga": { "id": "uuid", "tipo_carga": "…", "empresa": "…", "origem": {…}, "destino": {…},
             "valor_oferecido": 3500.00, "urgencia": "urgente", "status": "aberto",
             "certificacao_exigida": "…", "expira_em": "…" } } ] }
```

## Telas / componentes
- `src/app/motorista/propostas.tsx` com `TemplateLista`, `useMinhasPropostas({ automatico: true })`, `BotaoAtualizar`.
- `organisms/CartaoMinhaProposta` (PropostaCard motorista do DS): `ResumoCarga` (carga), tipo, valor proposto, valor oferecido, status da proposta, status efetivo da carga; "Ver frete" → `/motorista/fretes` se `aceita`; "Carga não está mais disponível" se pendente e carga fechada, cancelada ou vencida.
- `descreverMudancas(anterior, atual)`: "Proposta aceita: Grãos", "Proposta recusada: …"; mostrado na `BarraNovidades`.

## Arquivos e pastas
`src/app/motorista/propostas.tsx`, `src/components/organisms/CartaoMinhaProposta.tsx`, `src/app/motorista/descreverMudancasPropostas.ts`, testes, `e2e/minhas-propostas.spec.ts`, `e2e/rotas.ts`.

## Critérios de aceite
- [ ] Cada proposta com carga (tipo, empresa, origem → destino, urgência, certificação), tipo, valor proposto, valor oferecido, status da proposta e da carga (CT-10 por `carga.expira_em`) (MVP-15).
- [ ] Ordem igual à da API (MVP-15).
- [ ] "Aceita" → link "Ver frete" (MVP-15).
- [ ] Pendente com carga indisponível → "Carga não está mais disponível" (MVP-15).
- [ ] Vazio: "Você ainda não fez propostas" + "Ver cargas próximas" (MVP-15).
- [ ] Mudança de status aparece em ≤ 15 s e é anunciada sem mover o foco (MVP-15, CT-09).
- [ ] Testado com MSW no formato exato de 4a (MVP-15).
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
- Tela (RNTL + MSW): lista, vazio, aceita com link, pendente com carga fechada/vencida, erro, 401; polling (10 s com foco; 0 em 30 s sem foco); anúncio de mudança.
- Unidade: `descreverMudancas`.

## Checklist de acessibilidade e performance
- [ ] Anúncio educado, sem roubar foco.
- [ ] Status em texto (não só cor).
- [ ] Lighthouse 100 com 8 propostas na fixture.
