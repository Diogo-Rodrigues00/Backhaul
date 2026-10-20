# 024 — Motorista: cargas próximas

| Campo | Valor |
|---|---|
| Itens MVP | MVP-12, D-PO-03, D-PO-04, D-PO-05 (marcação "Proposta enviada") |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — combina disponibilidade ativa, duas consultas (uma contra rota proposta) e o diferencial da demo |
| Branch | `feat/cargas-proximas` |
| Estimativa | M (≈4 h) |
| Bloqueado por | 007, 012, 022 · PROTO |
| Bloqueia | 025, 035 (se der) |

## Objetivo
`/motorista/cargas`: as cargas que o motorista pode pegar perto da disponibilidade ativa, na ordem da API (urgência, depois distância). É o diferencial da demo.

## Rotas da API
- `GET /cargas/proximas?lat&lng&raio_km` ✅ (com `lat`, `lng`, `raio_busca_km` da ativa).
- `GET /propostas/minhas` 🔜 — **não existe**; proposta do relatório 4a, só MSW. Usada para marcar cargas com proposta pendente (D-PO-05).

## Telas / componentes
- `src/app/motorista/cargas.tsx` (substitui a provisória do 013) com `TemplateLista`; `organisms/BarraContexto` (ContextBar): "Buscando perto de Uberlândia - MG, raio de 80 km, até 18:00" + link "Trocar disponibilidade" → `/motorista/disponibilidades`; `BotaoAtualizar`.
- Sem ativa (D-PO-04): `EstadoVazio` "Publique uma disponibilidade para ver cargas perto de você" + "Publicar disponibilidade".
- `organisms/CartaoCargaProxima` (CargaCard motorista do DS e seção 6: faixa âmbar de 8 px em Urgente, faixa de obra de 12 px em Crítico via `.web.tsx`/SVG; `article` + `h2`): `SeloUrgencia` lg em destaque, tipo, empresa, distância ("12,4 km"), origem → destino, peso, valor, certificação ou "Sem exigência", prazo; marcação "Proposta enviada" quando há proposta `pendente` do motorista para a carga; propriedade `acoes?: ReactNode` (preenchida pelo card 025).
- Lista vazia: "Nenhuma carga aberta num raio de N km" + "Publicar disponibilidade com raio maior".
- O front **não reordena** a lista.

## Arquivos e pastas
`src/app/motorista/cargas.tsx`, `src/components/organisms/CartaoCargaProxima.tsx`, `src/components/organisms/BarraContexto.tsx`, testes, `e2e/cargas-proximas.spec.ts`, `e2e/rotas.ts` (`/motorista/cargas`).

## Critérios de aceite
- [ ] Busca com `lat`, `lng`, `raio_km` da ativa; tela mostra local e raio usados (MVP-12).
- [ ] Cada carga com urgência (texto), tipo, empresa, distância, origem → destino, peso, valor, certificação, prazo (MVP-12).
- [ ] Ordem exatamente a da API (MVP-12).
- [ ] Carga com proposta pendente do motorista mostra "Proposta enviada" sem botões de proposta (MVP-12, D-PO-05).
- [ ] Sem ativa: estado de D-PO-04 (MVP-12).
- [ ] Lista vazia com mensagem e ação de raio maior (MVP-12).
- [ ] "Atualizar" presente (MVP-12).
- [ ] Filtro de certificação vem da API (verificado no ensaio do card 029).
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
- Tela (RNTL + MSW): parâmetros da requisição iguais à ativa, ordem preservada, "Proposta enviada", sem ativa, lista vazia, 400, 500, 401; `GET /propostas/minhas` com erro não impede a lista (só não marca).
- Playwright: lista na ordem da fixture e link "Trocar disponibilidade".

## Checklist de acessibilidade e performance
- [ ] Urgência lida antes do tipo pelo leitor de tela (é o diferencial).
- [ ] Distância com unidade por extenso no nome acessível se o DS abreviar ("12,4 quilômetros").
- [ ] Lighthouse 100 com 10 cargas na fixture.
