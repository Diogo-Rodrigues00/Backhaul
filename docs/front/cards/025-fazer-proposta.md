# 025 — Motorista faz proposta (aceite ou contraproposta única)

| Campo | Valor |
|---|---|
| Itens MVP | MVP-13, D-PO-05 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — diálogo com formulário, regras de exibição por histórico de propostas e cinco respostas de erro distintas |
| Branch | `feat/fazer-proposta` |
| Estimativa | M (≈4 h) |
| Bloqueado por | 009, 011, 024 · PROTO |
| Bloqueia | — |

## Objetivo
Ações de proposta em cada cartão de "Cargas próximas".

## Rotas da API
- `POST /propostas` ✅ (201, 400, 403 `motorista sem a certificação exigida`, 404 `disponibilidade não encontrada`/`carga não encontrada`, 409 `carga não está mais aberta para propostas`/`você já fez a contraproposta única para esta carga`).
- `GET /propostas/minhas` 🔜 (proposta 4a, MSW) para D-PO-05.

## Telas / componentes
- `organisms/FormularioProposta` (dentro de `DialogoConfirmacao`):
  - "Aceitar R$ 3.500,00" → diálogo "Aceitar o valor oferecido?" → envia `{ chamado_carga_id, chamado_disp_id: ativa.id, tipo: 'aceite' }` (sem valor).
  - "Contraproposta" → diálogo com `CampoNumero` "Valor proposto (R$)" (> 0) e aviso "Você só pode enviar uma contraproposta para esta carga." → envia `tipo: 'contraproposta'` + `valor_proposto` número.
- Regras de exibição (D-PO-05): proposta pendente para a carga → só "Proposta enviada"; já houve contraproposta (qualquer status) → esconder "Contraproposta"; "Aceitar" só se não houver pendente.
- 201: fecha o diálogo, `anunciar('Proposta enviada')`, invalida `propostas.minhas` e `cargas.proximas`; o cartão passa a "Proposta enviada"; foco no texto "Proposta enviada" do cartão.
- 409 contraproposta repetida → mensagem e some a opção; 409 carga não aberta → mensagem e recarrega a lista; 403/404 → mensagem; no 404 de disponibilidade, link "Minhas disponibilidades".
- Usado em `src/app/motorista/cargas.tsx` pela prop `acoes` do `CartaoCargaProxima`.

## Arquivos e pastas
`src/components/organisms/FormularioProposta.tsx`, `src/app/motorista/cargas.tsx`, testes, `e2e/fazer-proposta.spec.ts`.

## Critérios de aceite
- [ ] Duas ações por carga com os corpos exatos de MVP-13; `chamado_disp_id` = ativa (MVP-13).
- [ ] Contraproposta avisa antes do envio que é única (MVP-13).
- [ ] 201 → "Proposta enviada" anunciado, cartão marcado, proposta em "Minhas propostas" como "Pendente" (MVP-13).
- [ ] Os 2 tipos de 409, o 403 e o 404 tratados como MVP-13 descreve.
- [ ] Depois de contraproposta (qualquer status), a opção some para a carga (MVP-13, D-PO-05).
- [ ] Foco volta a ponto previsível ao fechar (botão que abriu, ou o texto "Proposta enviada") (MVP-13).
- [ ] Atende CT-01 a CT-08.

## Testes exigidos
- Tela (RNTL + MSW): aceite (corpo sem valor), contraproposta (número), valor ≤ 0 bloqueado, cada erro, regras D-PO-05 com fixtures de propostas, foco após fechar, clique duplo = 1 requisição.
- Playwright: contraproposta só por teclado.

## Checklist de acessibilidade e performance
- [ ] Nome acessível dos botões inclui a carga ("Contraproposta para Grãos, Uberlândia → Uberaba").
- [ ] Aviso de contraproposta única ligado ao campo por `aria-describedby`.
- [ ] Teclado decimal no iPhone.
