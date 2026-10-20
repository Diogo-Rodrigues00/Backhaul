# 020 — Empresa: minhas cargas

| Campo | Valor |
|---|---|
| Itens MVP | MVP-09, CT-10, Q5 (sem atualização automática) |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **haiku** — lista simples sobre `TemplateLista` e `ResumoCarga` prontos |
| Branch | `feat/minhas-cargas` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 007, 012, 013 · PROTO |
| Bloqueia | — (021 usa o link para o detalhe, mas não depende) |

## Objetivo
`/empresa/cargas`: cargas da empresa com status e total de propostas, entrada para as propostas de cada uma.

## Rotas da API
`GET /cargas/minhas` ✅.

## Telas / componentes
- `src/app/empresa/cargas/index.tsx` (substitui a tela provisória do 013) com `TemplateLista`: ação "Publicar carga" → `/empresa/cargas/nova`; `BotaoAtualizar`.
- `organisms/CartaoCargaEmpresa` (CargaCard empresa do DS; `article` com `aria-labelledby`, título `h2`; expirada com borda tracejada, fundo rebaixado e sem destaque de urgência): `ResumoCarga` (origem/destino com `rotuloDoLocal`, status efetivo) + "N propostas" + link "Ver propostas" → `{ pathname: '/empresa/cargas/detalhe', params: { id } }` com nome acessível "Ver propostas de <tipo da carga>".
- Ordem igual à da API.

## Arquivos e pastas
`src/app/empresa/cargas/index.tsx`, `src/components/organisms/CartaoCargaEmpresa.tsx`, testes, `e2e/minhas-cargas.spec.ts`.

## Critérios de aceite
- [ ] Cada carga mostra tipo, origem → destino (cidade mais próxima), peso, valor, urgência, certificação ("Sem exigência" se `null`), prazo, status e `total_propostas` (MVP-09).
- [ ] Ordem igual à da API (MVP-09).
- [ ] Status em texto (Aberta, Fechada, Cancelada, Expirada) e aberta vencida = "Expirada" (MVP-09, CT-10).
- [ ] Toque na carga abre "Propostas da carga" (MVP-09).
- [ ] Vazio: "Você ainda não publicou cargas" + "Publicar carga" (MVP-09, CT-02).
- [ ] Botão "Atualizar" presente; sem atualização automática (MVP-09).
- [ ] Atende CT-01, CT-03 a CT-08.

## Testes exigidos
- Tela (RNTL + MSW): lista com 3 status + 1 vencida, vazio, erro 500 com "Tentar de novo", 401 → login, "Atualizar" refaz a requisição.
- Playwright: link "Ver propostas" leva à URL com `?id=`.

## Checklist de acessibilidade e performance
- [ ] Lista com `role="list"`; cada cartão é um item; link com nome único por carga.
- [ ] CLS 0 entre carregando e lista.
- [ ] Lighthouse 100 com 10 cargas na fixture.
