# 019 — Empresa publica carga

| Campo | Valor |
|---|---|
| Itens MVP | MVP-08, D-PO-02, D-PO-13, D-PO-14 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — formulário longo com seletor de local duplo, lista de certificações com erro próprio e regras de envio |
| Branch | `feat/publicar-carga` |
| Estimativa | M (≈4 h) |
| Bloqueado por | 013, 018 · PROTO |
| Bloqueia | 033 (se der) |

## Objetivo
`/empresa/cargas/nova`: a empresa publica uma carga com urgência, certificação opcional e prazo rápido.

## Rotas da API
`GET /certificacoes` ✅, `POST /cargas` ✅ (201, 400 incluindo certificação inexistente, 403, 404).

## Telas / componentes
- `src/app/empresa/cargas/nova.tsx` com `TemplateFormularioComPrevia` (lateral com prévia do cartão, conforme PROTO): tipo de carga (≤ 80), `SeletorLocal` origem e destino (sem GPS), peso (`CampoNumero` "kg", > 0), valor oferecido (`CampoNumero` "R$", > 0, `decimal`), urgência (`GrupoOpcoes` Normal/Urgente/Crítico, padrão Normal), certificação exigida (`CampoSelecao`, como no protótipo: "Nenhuma" + itens de `GET /certificacoes`), prazo (`GrupoOpcoes` com `OPCOES_PRAZO`, D-PO-02); `Botao` "Publicar carga".
- Erro em `GET /certificacoes`: mensagem junto do campo de certificação + "Tentar de novo"; o resto do formulário continua utilizável.
- Origem igual ao destino: erro local antes de enviar ("Origem e destino precisam ser diferentes").
- Corpo: números como `number`; `certificacao_requerida_id: null` para "Nenhuma"; `expira_em = calcularExpiraEm(horas)`.
- 201 → `router.replace('/empresa/cargas')` e `anunciar('Carga publicada')`.

## Arquivos e pastas
`src/app/empresa/cargas/nova.tsx`, teste, `e2e/publicar-carga.spec.ts`, `e2e/rotas.ts` (`/empresa/cargas/nova`, perfil empresa).

## Critérios de aceite
- [ ] Todos os campos de MVP-08 com padrões e limites (MVP-08).
- [ ] "Nenhuma" envia `certificacao_requerida_id: null` (MVP-08).
- [ ] Peso e valor enviados como número; `expira_em` ISO no futuro (MVP-08).
- [ ] Erro em `GET /certificacoes` não bloqueia o resto (MVP-08).
- [ ] 201 → "Minhas cargas" com a nova carga no topo e "Carga publicada" anunciado (MVP-08).
- [ ] Origem = destino avisa antes de enviar (MVP-08).
- [ ] 400 `certificacao_requerida_id …` aparece junto do campo de certificação (CT-03).
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
- Tela (RNTL + MSW): corpo enviado exato (tipos numéricos, `null`, ISO), erro nas certificações, origem = destino, 400 por campo, 403, 500 HTML, sucesso com redirecionamento e anúncio.
- Playwright: publicar com mock e ver a carga em "Minhas cargas" (quando o 020 estiver em `front`; antes, só o redirecionamento).

## Checklist de acessibilidade e performance
- [ ] Agrupamentos com nome (`radiogroup` "Urgência" e "Prazo"); `<select>` "Certificação exigida" rotulado.
- [ ] Urgência com texto, nunca só cor.
- [ ] Foco no resumo após erro; formulário mantém o que foi digitado.
- [ ] Chunk da rota ≤ 30 KB gzip.
