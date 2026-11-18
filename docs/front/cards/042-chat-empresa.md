# 042 — Chat da proposta na tela "Propostas da carga" (empresa)

| Campo | Valor |
|---|---|
| Itens | chat (decisão 3 da Fase 6), CT-09 |
| Tipo | feature |
| Agente / modelo | `dev-front` / **sonnet** — componente novo sem padrão anterior, polling por componente, anúncio e formulário com filtro espelhado do backend (ADR 0016) |
| Branch | `feat/042-chat-empresa` |
| Estimativa | G (≈6 h) |
| Bloqueado por | INT (hooks e MSW de mensagens) · PROTO (039) |
| Bloqueia | 043, 045, 046 |
| Onda | 1 |

## Objetivo
A empresa conversa com o motorista de cada proposta sem sair de "Propostas da carga", e o componente fica pronto para o motorista reaproveitar (043). Decisões técnicas no **ADR 0016**.

## Rotas da API
- `GET /propostas/:id/mensagens` ✅: `{ mensagens: [{ id, remetente_id, texto, criado_em }] }`, ordem cronológica, disponível em qualquer status. `remetente_id` é o id do **usuário** (comparar com `usuario.id` da sessão). Erros: 400 · 401 · 404 (não participa, inclusive admin).
- `POST /propostas/:id/mensagens` ✅: `{ texto }` (trim, ≤ 1000) → `201 { mensagem: { id, proposta_id, remetente_id, texto, criado_em } }`. `400`: `"texto é obrigatório"`, `"texto deve ter no máximo 1000 caracteres"`, `"mensagem não pode conter telefone, e-mail ou link"`. `409 "proposta encerrada: não é possível enviar mensagens"` (recusada/expirada). 401 · 404.

**Consome as peças do `integracao-api`**: tipos `Mensagem`, fetchers, hooks (`useMensagensDaProposta(id, { automatico })`, `useEnviarMensagem(id)`), chave `propostas.mensagens(id)` e handlers MSW. Não recriar.

## Telas / componentes
- `src/components/organisms/ConversaDaProposta.tsx` (apresentacional, ADR 0016): título `h4` "Conversa com <nome>", lista `role="list"` (autor em texto "Você"/nome, hora `formatarDataHora`, texto), vazio "Nenhuma mensagem ainda", campo "Mensagem" (`CampoTexto` com `multiline`; ajustar a altura no `campoComum` sem mudar os outros campos) com contador "N de 1000" ligado como ajuda, botão "Enviar", estado encerrado (campo e botão desabilitados + "Esta proposta foi encerrada. Você ainda pode ler a conversa.").
- `src/components/organisms/ConversaDaProposta.carregar.ts`: `import()` (molde de `FormularioProposta.carregar.ts`).
- `src/telas/useConversaDaProposta.ts`: liga os hooks do INT, `usuario.id` da sessão, `encerrada` (status da proposta ∈ {recusada, expirada} **ou** 409), tradução de erros (400 → erro do campo; 409 → encerrada; 404/500/rede → erro dentro da conversa com "Tentar de novo").
- `src/lib/mensagem.ts`: `validarMensagem(texto)` com o teto de 1000 e `contemContato` copiado de `backend/src/validacao.ts` (mesmas regex, comentário com a origem). Mensagem para pessoa: "Não envie telefone, e-mail ou link. Combine tudo por aqui."
- `src/lib/descreverMensagensNovas.ts`: só mensagens da outra parte, desde o último retrato ("1 nova mensagem de João da Silva").
- `src/components/organisms/CartaoProposta.tsx`: botão "Abrir conversa"/"Fechar conversa" (`aria-expanded`, `aria-controls`) e espaço para a conversa.
- `src/telas/CorpoPropostasDaCarga.tsx`: guarda o `id` da conversa aberta (uma por tela); `Suspense` + `Carregando` na primeira abertura.

## Arquivos e pastas
Os acima + testes (`ConversaDaProposta.test.tsx`, `mensagem.test.ts`, `descreverMensagensNovas.test.ts`, `src/app/__tests__/propostas-da-carga-chat.test.tsx`, `.polling.test.tsx`), `e2e/chat-empresa.spec.ts`. Nenhuma rota web nova (o chat vive em `/empresa/cargas/detalhe`).

## Passos
1. `lib/mensagem.ts` e `descreverMensagensNovas` com testes (puras).
2. Organismo apresentacional com todos os estados (story de teste com props).
3. Hook de tela e ligação no `CartaoProposta`/corpo (uma conversa aberta por vez).
4. Polling + anúncio + testes do ADR 0010/0016.
5. E2E com MSW sem estado (só a empresa; a conversa entre duas janelas fica no 046).

## Critérios de aceite
- [ ] "Abrir conversa" em cada proposta mostra o histórico em ordem cronológica, com autor em texto e hora; "Você" para `remetente_id === usuario.id`.
- [ ] Enviar: `201` → campo limpo, mensagem na lista após a releitura; em erro, o texto digitado continua no campo.
- [ ] Texto vazio, > 1000 ou com telefone/e-mail/link é barrado antes do POST com erro no campo; `400` da API também vai para o campo.
- [ ] Proposta recusada/expirada (ou `409`): histórico legível, envio desabilitado com explicação.
- [ ] Mensagem nova da outra parte aparece em ≤ 15 s com a conversa aberta e é anunciada sem mover o foco; minhas mensagens não são anunciadas.
- [ ] Com a conversa fechada ou a aba oculta, nenhuma requisição de mensagens; abrir outra conversa fecha a anterior (no máximo uma consulta de mensagens com polling).
- [ ] O código do chat não entra no JS inicial de `/empresa/cargas/detalhe` nem no corpo antes do primeiro clique (orçamento ≤ 360 KiB, conferir no `dist/`).
- [ ] Exemplos de teste e fixtures **sem** 10+ dígitos seguidos (o filtro recusa; ex.: "Chego às 14h no portão 2").
- [ ] Portões do ADR 0013.

## Testes exigidos
- Unidade: `validarMensagem` (vazio, só espaços, 1000 e 1001 caracteres, "34 99999-8888" com pontuação, "joao arroba gmail", "www.site", "3500.00" **passa**); `descreverMensagensNovas`.
- Tela (RNTL + MSW): abrir/fechar, vazio, histórico, enviar 201, 400 do filtro, 409, 500, 401; uma conversa por vez.
- Polling: 10 s com a conversa aberta e foco; 0 em 30 s sem foco; 0 com a conversa fechada.
- E2E: abrir a conversa e enviar só por teclado; axe com a conversa aberta e com erro no campo.

## Checklist de acessibilidade e performance
- [ ] Botão de conversa com nome único ("Abrir conversa com João da Silva") e `aria-expanded`.
- [ ] Lista **não** é `role="log"` (o anúncio é feito pela `RegiaoViva`, ADR 0016).
- [ ] Contador não é anunciado a cada tecla; erro ligado ao campo (`aria-describedby`, `aria-invalid`).
- [ ] Autor em texto; lado/cor da mensagem são só reforço; contraste AA nos dois temas.
- [ ] Polling da lista de propostas e da conversa não tiram o foco do campo nem apagam o que foi digitado.
