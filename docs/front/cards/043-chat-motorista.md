# 043 — Chat da proposta para o motorista (em "Minhas propostas")

| Campo | Valor |
|---|---|
| Itens | chat (decisão 3 da Fase 6) |
| Tipo | feature |
| Agente / modelo | `dev-front` / **haiku** — monta as peças prontas do 042 (ADR 0016) numa tela pronta do 026 |
| Branch | `feat/043-chat-motorista` |
| Estimativa | P (≈2 h) |
| Bloqueado por | 026 · 042 |
| Bloqueia | 045, 046 |
| Onda | 2 |

## Objetivo
O motorista conversa com a empresa a partir de cada proposta em "Minhas propostas", com o mesmo componente da empresa.

## Rotas da API
As mesmas do 042 (`GET`/`POST /propostas/:id/mensagens`). O motorista tem o `id` da proposta em `GET /propostas/minhas`. A partir de "Meus fretes", **só com o P4** (`proposta_id` em `GET /fretes/meus`): fora deste card (ver 044).

## Telas / componentes
- `src/components/organisms/CartaoMinhaProposta.tsx` (026): botão "Abrir conversa com <empresa>" e espaço da conversa.
- `src/telas/CorpoMinhasPropostas.tsx` (026): uma conversa aberta por vez; `useConversaDaProposta` com o `status` da proposta (`recusada`/`expirada` → encerrada) e o nome da outra parte = `empresa`.
- Nada novo em `src/lib/` nem no organismo `ConversaDaProposta` (se precisar mudar, a mudança vale para os dois lados e precisa de teste na tela da empresa também).

## Arquivos e pastas
`CartaoMinhaProposta.tsx`, `CorpoMinhasPropostas.tsx`, testes (`src/app/__tests__/minhas-propostas-chat.test.tsx`), ajuste em `e2e/minhas-propostas.spec.ts`. Nenhuma rota web nova.

## Critérios de aceite
- [ ] Cada proposta tem "Abrir conversa"; histórico e envio iguais aos do 042.
- [ ] Proposta recusada ou expirada: histórico legível, envio desabilitado com explicação.
- [ ] Com "Minhas propostas" atualizando sozinha (10 s) e uma conversa aberta (10 s), o foco e o texto digitado não se perdem.
- [ ] Mensagem nova da empresa anunciada sem mover o foco; mensagens do motorista não são anunciadas.
- [ ] Chat fora do JS inicial de `/motorista/propostas` (orçamento ≤ 360 KiB).
- [ ] Portões do ADR 0013.

## Testes exigidos
- Tela (RNTL + MSW): abrir conversa, enviar 201, 409 encerrada, uma conversa por vez, polling da lista + conversa sem perder o texto.
- E2E: abrir e enviar por teclado em `/motorista/propostas`; axe com a conversa aberta.

## Checklist de acessibilidade e performance
- [ ] Nome único do botão ("Abrir conversa com Transportes Rápidos LTDA sobre Grãos").
- [ ] Mesmos itens do checklist do 042.
