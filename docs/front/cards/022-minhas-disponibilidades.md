# 022 — Motorista: minhas disponibilidades e disponibilidade ativa

| Campo | Valor |
|---|---|
| Itens MVP | MVP-11, D-PO-03, CT-10 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — estado persistido da disponibilidade ativa com regra de padrão, contra rota ainda inexistente |
| Branch | `feat/minhas-disponibilidades` |
| Estimativa | M (≈4 h) |
| Bloqueado por | 007, 012, 013 · PROTO |
| Bloqueia | 023, 024, 034 (se der) |

## Objetivo
Lista das disponibilidades do motorista e o estado global "disponibilidade ativa", usado por cargas próximas e pela proposta.

## Rotas da API
`GET /disponibilidades/minhas` 🔜 — **não existe**. Construir contra a proposta do relatório 4b (formato abaixo) e testar só com MSW (handlers do card 004). Ao sair em `main` + `docs/api.md`, nenhuma mudança de tela deve ser necessária.
```json
{ "disponibilidades": [ { "id": "uuid", "local": { "lat": -18.9186, "lng": -48.2772 }, "raio_busca_km": 80,
  "urgencia": "urgente", "status": "aberto", "expira_em": "…", "criado_em": "…", "propostas_pendentes": 1 } ] }
```

## Telas / componentes
- `src/state/disponibilidade-ativa/`: `DisponibilidadeAtivaProvider` + `useDisponibilidadeAtiva()` → `{ ativa: Disponibilidade | null, definirAtiva(id), carregando }`. Regra (D-PO-03): a escolhida (salva em `backhaul.disponibilidadeAtiva`) se estiver aberta e não vencida; senão a mais recente aberta e não vencida; senão `null`. Envolver o `<Slot />` em `src/app/motorista/_layout.tsx`.
- `src/app/motorista/disponibilidades/index.tsx` com `TemplateLista`: ação "Publicar disponibilidade" → `/motorista/disponibilidades/nova`; `BotaoAtualizar`.
- `organisms/CartaoDisponibilidade`: local (`rotuloDoLocal`, "Perto de Uberlândia - MG"), raio ("80 km"), urgência, prazo, status efetivo, "N propostas pendentes", indicação textual "Ativa"; botão "Usar esta" só em aberta, não vencida e não ativa.

## Arquivos e pastas
Acima + testes, `e2e/minhas-disponibilidades.spec.ts`, `e2e/rotas.ts` (`/motorista/disponibilidades`).

## Critérios de aceite
- [ ] Cada item com local, raio, urgência, prazo, status e `propostas_pendentes` (MVP-11).
- [ ] Status em texto (Aberta, Fechada, Expirada, Cancelada) e `aberto` vencido = "Expirada" (MVP-11, CT-10).
- [ ] "Usar esta" torna a disponibilidade ativa e "Cargas próximas" passa a usá-la (MVP-11).
- [ ] Sem escolha manual, ativa = mais recente aberta e não vencida; "Ativa" indicada em texto (MVP-11, D-PO-03).
- [ ] Escolha persiste após recarregar (web) / reabrir (iPhone) e é apagada ao sair.
- [ ] Vazio: "Nenhuma disponibilidade publicada" + "Publicar disponibilidade" (MVP-11).
- [ ] Testado com MSW no formato exato de 4b (MVP-11).
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
- Unidade: regra de escolha da ativa (escolhida válida, escolhida vencida, nenhuma aberta, relógio fixo).
- Tela (RNTL + MSW): lista, vazio, "Usar esta", erro 500, 401.
- Playwright: escolher outra disponibilidade e ver o rótulo "Ativa" mudar.

## Checklist de acessibilidade e performance
- [ ] "Usar esta" com nome único ("Usar disponibilidade perto de Uberaba - MG").
- [ ] Mudança de ativa anunciada ("Disponibilidade ativa: perto de …").
- [ ] Provider não faz requisição fora da área do motorista.
