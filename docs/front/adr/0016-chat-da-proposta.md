# ADR 0016 — Chat da proposta: componente, atualização automática e anúncio

- **Data:** 2026-11-04 · **Status:** proposto · **Autor:** tech-lead · **Cards:** 042 (empresa), 043 (motorista)

## Contexto
A `main` ganhou `GET`/`POST /propostas/:id/mensagens` (`docs/api.md`). O chat aparece em duas telas que **já** se atualizam sozinhas a cada 10 s (propostas da carga, minhas propostas; ADR 0010). Sem cuidado, cada cartão de proposta com o chat aberto faria a sua própria consulta a cada 10 s, a lista do chat entraria no JS da tela mesmo para quem nunca abre a conversa e o leitor de tela ouviria cada mensagem duas vezes (região viva da lista + anúncio global).

Restrições já decididas: só telas (`src/app`, `src/telas`) falam com `src/api` (ADR 0003); polling só com a tela aberta e a aba visível (ADR 0010); anúncio pela `RegiaoViva` global, sem mover o foco (ADR 0009); cards de tela não aumentam o JS inicial (adendo 3 do ADR 0011).

## Opções consideradas
1. **Um organismo que busca os próprios dados** (`ConversaDaProposta` chamando o hook): simples, mas quebra a direção de import do ADR 0003.
2. **Organismo apresentacional + hook de tela** (escolhida): `ConversaDaProposta` só recebe props; `useConversaDaProposta` em `src/telas/` fala com a API.
3. **Polling compartilhado** (uma consulta só para as mensagens de todas as propostas da tela): a API não tem rota em lote; seria N requisições do mesmo jeito.
4. **`role="log"` na lista de mensagens**: região viva nativa, mas somada ao `anunciar()` global repete o anúncio e lê também as mensagens que **eu** enviei.

## Decisão
- **Peças.** `components/organisms/ConversaDaProposta.tsx` (apresentacional: `mensagens`, `meuUsuarioId`, `nomeDaOutraParte`, `encerrada`, `enviando`, `erroDoCampo`, `aoEnviar(texto)`) e `src/telas/useConversaDaProposta.ts` (lê/envia via os hooks de mensagens do `integracao-api`, decide `encerrada`, traduz erros). A tela monta o organismo; o organismo não importa `src/api`.
- **Carregamento sob demanda.** A conversa só é baixada no primeiro "Abrir conversa": `ConversaDaProposta.carregar.ts` com `import()`, no mesmo molde de `FormularioProposta.carregar.ts`. Nenhuma rota tem o chat no JS inicial.
- **Uma conversa aberta por tela.** O botão "Abrir conversa" de cada cartão é um *disclosure* (`aria-expanded`, `aria-controls`); abrir outra fecha a anterior. Assim há no máximo **uma** consulta de mensagens com polling por tela, além da consulta da lista.
- **Atualização automática.** Mensagens usam o mesmo mecanismo do ADR 0010: `{ automatico: true }` → `refetchInterval = INTERVALO_ATUALIZACAO_MS` (10 s), parado com a aba oculta (`focusManager`). "Tela aberta" vira "conversa aberta": fechar a conversa desmonta o observador e o intervalo para. Nenhum `setInterval` manual.
- **Envio sem atualização otimista.** No `201`, invalidar a chave das mensagens daquela proposta e limpar o campo. Em erro, o texto digitado fica no campo. Nada aparece na lista antes da API confirmar.
- **Quem escreveu.** "Minha" mensagem = `remetente_id === usuario.id` da sessão (`GET /eu`), nunca o id de perfil. Cada mensagem tem o autor em texto ("Você" / nome da outra parte) e a hora; o lado/a cor são só reforço.
- **Anúncio.** `useAnunciarNovidades(mensagens, descrever)` com `descreverMensagensNovas(anterior, atual, meuUsuarioId)` (pura, em `src/lib/`): anuncia só mensagens **da outra parte** que chegaram desde o último retrato ("1 nova mensagem de Transportes Rápidos"), nunca a primeira carga nem as minhas. A lista é `role="list"`, **não** `role="log"`.
- **Encerrada.** `encerrada = status da proposta ∈ {recusada, expirada}` (dado que a tela já tem) **ou** a API respondeu `409`. Histórico continua legível; campo e botão ficam desabilitados com a explicação em texto ligada ao campo.
- **Filtro de contato.** `src/lib/mensagem.ts` copia a regra de `backend/src/validacao.ts` (`contemContato`: 10+ dígitos, `@`/"arroba", `http(s)://`, `www.`, `.com/.br/.me/.ly`) e o teto de 1000 caracteres para validar antes do POST; a mensagem `400` da API continua sendo a autoridade e aparece no campo.

## Consequências
- O 042 cria o organismo, o hook, a função de anúncio e o filtro; o 043 só monta as mesmas peças em "Minhas propostas".
- Teste obrigatório (além do ADR 0010): com duas propostas na tela, abrir a segunda conversa fecha a primeira e só há uma consulta de mensagens a cada 10 s; mensagens próprias não são anunciadas.
- Se o Diogo mudar o filtro de contato no backend, `src/lib/mensagem.ts` precisa acompanhar (o `integracao-api` confere a cada onda).
- Se no futuro houver muitas conversas abertas ao mesmo tempo (ex.: painel), rever com uma rota em lote no backend.
