# ADR 0010 — Atualização automática (polling) e anúncio de novidades

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
Sem tempo real na API. Decisão do grill: ~10 s nas telas de espera (propostas da carga, minhas propostas, meus fretes do motorista e da empresa), só com a tela aberta e a aba visível, + botão "Atualizar"; novidade anunciada sem roubar foco (CT-09). Aba oculta 30 s = 0 requisições.

## Decisão
- Hooks de leitura dessas telas aceitam `{ automatico: true }` e então usam `refetchInterval: 10_000` (constante `INTERVALO_ATUALIZACAO_MS` em `src/api/consulta.ts`).
- **Aba visível:** `refetchIntervalInBackground: false` (padrão global, ADR 0004) + `focusManager` (web: `visibilitychange`; iPhone: `AppState`). Com a aba oculta o intervalo para; ao voltar, um refetch.
- **Tela aberta:** layouts usam `<Slot />` (ADR 0002), então a tela desmonta ao navegar e o observador da query some, parando o intervalo. Nenhuma lógica extra.
- **Botão "Atualizar":** molecule `BotaoAtualizar` chama `refetch()`; mostra "Atualizando…" enquanto busca; ao terminar anuncia "Lista atualizada".
- **Visível:** `BarraNovidades` (LiveBar do DS) no `TemplateLista` mostra a novidade e "Última atualização às HH:MM:SS"; o item novo ganha a etiqueta "Nova".
- **Anúncio:** `useAnunciarNovidades(dados, descrever)` em `src/hooks/`: guarda o retrato anterior (ref); ignora a primeira carga; a cada mudança chama `descrever(anterior, atual)` e, se devolver texto, `anunciar(texto)` (região educada, ADR 0009). Funções `descrever` puras por tela, com teste: ex. "1 nova proposta", "Proposta aceita", "Pagamento liberado".
- **Não perder o que o usuário digita:** listas usam `key` = `id`; formulários e diálogos guardam estado próprio fora da lista; o polling nunca remonta a tela nem move o foco.
- "Minhas cargas" e "Cargas próximas": só botão "Atualizar" (Q5).

## Alternativas
- **`setInterval` manual + `document.hidden`:** reimplementa o que o TanStack já faz.
- **SSE/WebSocket:** não existe na API.

## Consequências
- Teste obrigatório por tela com atualização: com `focusManager.setFocused(false)` e timers falsos por 30 s, 0 requisições; com foco, 1 requisição a cada 10 s; anúncio chamado na mudança e não na primeira carga.
