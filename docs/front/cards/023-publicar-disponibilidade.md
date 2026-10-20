# 023 — Motorista publica disponibilidade

| Campo | Valor |
|---|---|
| Itens MVP | MVP-10, D-PO-02, D-PO-03 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **haiku** — formulário curto no padrão do ADR 0007 usando `SeletorLocal` e o provider prontos |
| Branch | `feat/publicar-disponibilidade` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 009, 018, 022 · PROTO |
| Bloqueia | — |

## Objetivo
`/motorista/disponibilidades/nova`: o motorista avisa onde está livre e já cai nas cargas próximas com essa disponibilidade ativa.

## Rotas da API
`POST /disponibilidades` ✅ (201, 400, 403, 404).

## Telas / componentes
- `src/app/motorista/disponibilidades/nova.tsx` com `TemplateFormularioComPrevia`: `SeletorLocal` (`permitirGps`, rótulo "Onde você está"), raio (`CampoNumero` "km", padrão 50, > 0 e ≤ 500), urgência (`GrupoOpcoes`, padrão Normal), prazo (`GrupoOpcoes` `OPCOES_PRAZO`); `Botao` "Publicar disponibilidade".
- Corpo: `{ local: { lat, lng }, raio_busca_km, urgencia, expira_em }` com números.
- 201 → `definirAtiva(disponibilidade.id)`, invalidar `disponibilidades.minhas`, `anunciar('Disponibilidade publicada')`, `router.replace('/motorista/cargas')`.
- Mapa de campos: `{ local: 'local', raio_busca_km: 'raio', urgencia: 'urgencia', expira_em: 'prazo' }`.

## Arquivos e pastas
`src/app/motorista/disponibilidades/nova.tsx`, teste, `e2e/publicar-disponibilidade.spec.ts`, `e2e/rotas.ts`.

## Critérios de aceite
- [ ] Campos local (com GPS), raio (padrão 50, ≤ 500), urgência (padrão Normal), prazo (MVP-10).
- [ ] Coordenadas e raio enviados como número (MVP-10).
- [ ] 201 → vira a ativa e abre "Cargas próximas" já buscando com ela (MVP-10).
- [ ] 400 → erros nos campos (MVP-10, CT-03).
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
- Tela (RNTL + MSW): corpo exato, raio > 500 bloqueado localmente, 400 por campo, 500 HTML, sucesso (ativa definida + redirecionamento + anúncio).
- Playwright: publicar escolhendo cidade e chegar a `/motorista/cargas`.

## Checklist de acessibilidade e performance
- [ ] Ordem de foco: local → raio → urgência → prazo → enviar.
- [ ] GPS negado não bloqueia o envio por cidade.
- [ ] Chunk da rota ≤ 30 KB gzip (cidades contadas à parte, card 007).
