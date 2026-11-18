# 039 — Protótipos da Fase 6: minhas propostas, chat, certificações e mapa

| Campo | Valor |
|---|---|
| Itens | 026, 031, 032, 035, 042, 043 (telas da Fase 6 que precisam de aprovação) |
| Tipo | design |
| Agente / modelo | `designer` / **sonnet** — telas novas com estados de erro, chat e acessibilidade não trivial |
| Branch | nenhuma (Artifact); se gerar arquivo, `docs/039-prototipos` com o que for para `docs/front/prototipos/` |
| Estimativa | M (≈4 h) + rodada de ajuste após o retorno do Pedro |
| Bloqueado por | — (já despachado na Fase 6.0) |
| Bloqueia | **PROTO** de 026, 031, 032, 035, 042, 043 |
| Onda | 0 |

## Decisão que muda o escopo (Pedro, 2026-11-04)
**Admin 040 e 041 não têm protótipo**: seguem o design system. A única tela de admin neste card é a **fila de certificações** (032), porque mostra dado de pessoa e tem ação destrutiva.

## Objetivo
Publicar como **Artifact** e obter aprovação do Pedro para as telas abaixo, seguindo `docs/front/design-system.md` (tokens, tema claro e escuro, AA). Sem logos nem cores novas.

## Telas e estados
1. **Minhas propostas** (`/motorista/propostas`, card 026): cartão com tipo de carga, empresa, valor oferecido × valor proposto, tipo (aceite/contraproposta), status em texto + selo (pendente, aceita, recusada, expirada), "Ver frete" quando houver `frete_id`, "Abrir conversa" (043). Estados: carregando, vazio, erro, atualização automática (barra de novidades). **Sem** origem/destino/urgência (a API não devolve).
2. **Chat dentro do cartão da proposta** (empresa em "Propostas da carga", 042; motorista em "Minhas propostas", 043): botão "Abrir conversa"/"Fechar conversa"; lista com autor em texto ("Você"/nome) e hora; campo com contador "N de 1000"; estados: vazio ("Nenhuma mensagem ainda"), enviando, erro 400 do filtro (texto que oriente a não passar telefone, e-mail ou link), proposta encerrada (histórico legível, envio desabilitado com explicação), nova mensagem chegando. Uma conversa aberta por vez (ADR 0016).
3. **Certificações do motorista** (`/motorista/certificacoes`, 031): lista (nome, número, validade só data, situação "Aguardando aprovação"/"Aprovada"/"Vencida"); formulário (certificação, número ≤ 60, validade em Dia/Mês/Ano agrupados como "Validade"); aviso de que reenviar volta para "Aguardando aprovação"; aprovada e vigente sem botão de reenvio. **Onde fica o link**: a barra inferior do motorista já tem 3 itens e o 026 traz o 4º; decidir se Certificações entra como 5º item, no cabeçalho ou como link em outra tela (reflow a 320 px).
4. **Admin: fila de certificações** (`/admin/certificacoes`, 032): só nome do motorista, certificação, número, validade e placa (**nunca** CPF/CNH); "Aprovar" e "Recusar" com diálogo; texto do diálogo de recusa (o registro é apagado e o motorista pode reenviar).
5. **Mapa sob demanda** (035): botão "Ver no mapa", estado fechado/aberto, carregando, atribuição do OpenStreetMap, equivalente em texto ao lado (origem, destino, distância). Em "Cargas próximas" e "Minhas cargas".

## Critérios de aceite
- [ ] Artifact publicado com as 5 telas, claro e escuro, 1280 px e 320 px.
- [ ] Cada estado listado acima desenhado (não só o caminho feliz).
- [ ] Contraste AA conferido nos dois temas para os selos de status novos.
- [ ] Aprovação do Pedro registrada em `docs/front/decisoes.md` (data, o que foi aprovado, ajustes pedidos).

## Checklist de acessibilidade
- [ ] Status sempre em texto além da cor.
- [ ] Autor de cada mensagem em texto; o lado da bolha é só reforço.
- [ ] Alvos de toque ≥ 24×24 px; foco visível em todos os controles novos.
