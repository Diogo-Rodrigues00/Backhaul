# 050 — Rotas reais de disponibilidades e propostas (troca do plano B)

| Campo | Valor |
|---|---|
| Itens | MVP-11 (disponibilidade ativa), MVP-13 (D-PO-05), MVP-15 (Minhas propostas); decisão de 2026-10-23 (plano B local) |
| Tipo | feature |
| Agente / modelo | `dev-front` / **sonnet** — toca o fluxo ensaiado da demo (publicar disponibilidade → Cargas próximas → proposta → Meus fretes) e o mock com estado do E2E |
| Branch | `feat/disponibilidades-minhas-real` |
| Estimativa | M (≈5 h) |
| Bloqueado por | contrato novo do backend em `docs/api.md` (já em `front`, commit `4d7da5b`) |
| Bloqueia | — |
| Onda | demo de 16/11 |

## Objetivo
Passar a usar as rotas reais que o backend já documenta e deixar o armazenamento local do aparelho **só como fallback seguro**:

- `GET /disponibilidades/minhas` é a fonte da disponibilidade ativa e da tela "Minhas disponibilidades": a ativa volta depois de recarregar a página ou de trocar de aparelho. Se a rota falhar (404 de backend antigo, rede, 5xx), o comportamento de antes continua (cópia da disponibilidade publicada neste aparelho).
- `GET /propostas/minhas` agora traz a carga (`origem`, `destino`, `urgencia`, `certificacao_exigida`, `carga_status`, `carga_expira_em`): "Minhas propostas" passa a mostrar a rota, a urgência, a certificação exigida e o estado **"Carga indisponível"** quando a carga saiu do ar.

O que já existia desde os cards 022, 023, 026 e 036 (provider com a rota real e o plano B no 404, "Cargas próximas" lendo a lista real de propostas, `propostas_pendentes` e "Expirada" em texto no cartão de disponibilidade) **não foi reescrito**: este card conferiu o comportamento, fechou as lacunas e trocou o mock e os testes para o mundo novo.

## Rotas da API
| Rota | Perfil | Uso |
|---|---|---|
| `GET /disponibilidades/minhas` ✅ | motorista | `{ disponibilidades: [ { id, local{lat,lng}, raio_busca_km, urgencia, status, expira_em, criado_em, propostas_pendentes } ] }`, mais recentes primeiro. `status` é calculado: `aberto` vencido vem `expirado`. Vazia: `{ disponibilidades: [] }`. 401 · 403 · 404 `perfil de motorista não encontrado` |
| `GET /propostas/minhas` ✅ | motorista | Formato plano do card 036 **mais** `origem`, `destino`, `urgencia`, `certificacao_exigida` (`null` se não exige), `carga_status` (`aberto \| fechado \| cancelado \| expirado`, calculado) e `carga_expira_em` |
| `POST /disponibilidades` ✅ | motorista | Sem mudança; a lista é relida (invalidação) depois do 201 |
| `POST /propostas` ✅ | motorista | 409 `"disponibilidade não está mais aberta"` (já tratado no card 038) |
| `POST /propostas/:id/responder` ✅ | empresa | Aceitar proposta cuja disponibilidade fechou ou venceu: 409 `"disponibilidade não está mais aberta"`; o mock espelha |

## Regras
1. **A lista real prevalece sempre que a rota responde** (`origem: 'api'`): a cópia guardada no aparelho é ignorada, mesmo que tenha outra disponibilidade.
2. **Fallback:** 404 → lista de uma entrada (a publicada neste aparelho), sem erro técnico. Rede ou 5xx → a tela mostra o erro com "Tentar de novo", mas `ativa` continua saindo da cópia guardada, então "Cargas próximas" não para.
3. A ativa segue a regra D-PO-03 de `lib/disponibilidadeAtiva.ts`: a escolhida, se aberta e no prazo; senão a mais recente aberta e no prazo; `expirado` e aberta vencida são ignoradas. Num aparelho novo (nada guardado) vale a mais recente.
4. `entrar` e `sair` continuam apagando a escolha guardada e a lista de propostas enviadas.
5. **"Carga indisponível"** (`lib/cargaDaProposta.ts`): aparece quando `carga_status` ≠ `aberto`, ou quando `carga_expira_em` já venceu com a carga ainda `aberto`. Selo em texto + ícone + frase do motivo (fechada, cancelada, prazo), borda tracejada e fundo rebaixado como a "Expirada" do DS. **Não** aparece em proposta `aceita` (a carga fechada é o resultado esperado e o cartão mantém "Ver frete"). Sem os campos novos (backend ainda sem o contrato), a carga não é marcada.
6. Carga indisponível não oferece ação de proposta nova. O cartão de "Minhas propostas" nunca teve botão de propor; o botão de conversa continua (o histórico segue legível).
7. A região viva anuncia, sem mover o foco, a carga que sai do ar entre duas leituras: `"Carga indisponível: <tipo da carga>"`. Mudança de status da proposta vale mais (uma frase por proposta).

## Arquivos
- `app/src/api/tipos.ts` — `MinhaProposta` com os campos da carga; `StatusCargaDaProposta`.
- `app/src/lib/cargaDaProposta.ts` (+ teste) — regra do "Carga indisponível".
- `app/src/lib/descreverMudancasPropostas.ts` (+ teste) — anúncio da carga que saiu do ar.
- `app/src/components/organisms/CartaoMinhaProposta.tsx` (+ teste) — rota, urgência, certificação e selo.
- `app/src/telas/CorpoMinhasPropostas.tsx` — passa os dados da carga ao cartão.
- `app/src/state/disponibilidade-ativa/*`, `app/src/api/disponibilidades.ts`, `app/src/lib/disponibilidadeAtiva.ts` — só comentários (a rota deixa de ser "proposta" e o plano B vira fallback).
- `app/mocks/handlers/comEstado.ts` — `GET /disponibilidades/minhas` real (status calculado, `propostas_pendentes`), campos novos em `GET /propostas/minhas`, 409 de disponibilidade fechada ou vencida no `POST /propostas` e no aceite, aceite recusa as pendentes do mesmo motorista na mesma disponibilidade.
- `app/mocks/fixtures/propostas.ts` — as 8 propostas com os campos da carga, incluindo duas com "Carga indisponível" e uma aceita com a carga fechada.
- E2E: `app/e2e/fluxo-completo.spec.ts`, `app/e2e/minhas-propostas.spec.ts`, `app/e2e/minhas-disponibilidades.spec.ts`.

## Critérios de aceite
- [x] Recarregar a página (e abrir num aparelho sem nada guardado) recupera a disponibilidade ativa pela API; "Cargas próximas" continua com as mesmas cargas.
- [x] Com `GET /disponibilidades/minhas` em 404, o fluxo publicar → Cargas próximas → proposta funciona como antes (cópia do aparelho), sem erro técnico. Com a rota de volta, a lista da API vence.
- [x] Com rede caída ou 5xx, "Minhas disponibilidades" mostra o erro e "Cargas próximas" segue pela cópia guardada.
- [x] "Minhas disponibilidades" lista as reais, com `propostas_pendentes` e status `expirado` em texto ("Expirada" + "Prazo vencido em").
- [x] "Minhas propostas" mostra "Cidade - UF" de coleta e entrega, urgência em texto, "Exige <certificação>" ou "Sem exigência" e, para carga fora do ar, "Carga indisponível" em texto (selo + frase), nunca só por cor; proposta aceita não leva o selo.
- [x] Estado novo anunciado na região viva sem mover o foco.
- [x] Mock com estado e mock sem estado fiéis ao contrato; o E2E do fluxo completo passa contra o mundo novo e cobre o fallback (rota em 404).
- [x] Portões do ADR 0013 verdes; JS inicial ≤ 360 KiB e sem aumento (a rota do cartão é carregada sob demanda).

## Testes exigidos
- **Unitários:** `lib/cargaDaProposta` (aberta, fechada/cancelada/expirada, prazo vencido com `aberto`, aceita nunca indisponível, campos ausentes, status desconhecido); `lib/descreverMudancasPropostas` (carga que sai do ar, uma frase por proposta, aceita); `lib/disponibilidadeAtiva` (já cobre real que prevalece, expirada ignorada e a escolha guardada).
- **RNTL + MSW:** `minhas-disponibilidades.test` (lista real, 404 → cópia local, rede caída e 5xx → erro com a ativa pela cópia, rota que volta → lista real vence); `minhas-propostas.test` (rota, urgência, certificação, "Carga indisponível" por status e por prazo, aceita não marcada, backend sem os campos novos); `CartaoMinhaProposta.test`.
- **Regressão do fluxo publicar → proposta:** `fazer-proposta*.test`, `cargas-proximas*.test` e `hooks.test` seguem verdes sem edição de comportamento.
- **E2E:** `fluxo-completo.spec.ts` (B1b: 404 e depois lista real sem a cópia local; B2b: recarregar sem a cópia; B4b e B4c: campos novos e `propostas_pendentes`; Fase 6: rota e certificação em "Minhas propostas", aceita sem "Carga indisponível"), `minhas-propostas.spec.ts` e `minhas-disponibilidades.spec.ts`.

## Checklist de acessibilidade e performance
- [x] "Carga indisponível" tem texto, ícone e frase: contraste AA nos dois temas (axe do E2E).
- [x] Anúncio por região viva educada; nenhum foco movido.
- [x] Reflow a 320 px sem rolagem horizontal.
- [x] Nenhum import novo no JS inicial (o cartão e a lib entram no chunk de `CorpoMinhasPropostas`).

## Divergências e riscos
Ver a descrição do PR: o que `docs/api.md` promete e o que foi observado, e os riscos para a demo de 16/11.

## Verificação (15/11)
- Jest em série (`--runInBand --testTimeout=60000`): 1861 testes, 0 falhas. E2E (`fluxo-completo`, `minhas-propostas`, `minhas-disponibilidades`, `cargas-proximas`, `fazer-proposta`, `publicar-disponibilidade`, `fretes-motorista`, desktop e 320 px) contra build e mock privados: 83 passaram, 19 pulados por desenho (cobertura de um só projeto).
- Navegador (Chromium, claro e escuro, 320 px e 1280 px): "Carga indisponível" com selo, ícone e frase, borda tracejada; proposta aceita sem selo; sem rolagem horizontal.
- **Não verificado:** iPhone (Expo Go), VoiceOver e Dynamic Type.
