# Registro de decisões — Front-end

Decisões fechadas antes do grill (kickoff, 2026-10-20). Novas decisões entram abaixo, com data.

| Data | Decisão | Origem |
|---|---|---|
| 2026-10-20 | Base Expo (RN + TS), iPhone via Expo Go + navegador via react-native-web, em `app/` | Kickoff |
| 2026-10-20 | Web exportada como estático e PWA instalável | Kickoff |
| 2026-10-20 | API via `EXPO_PUBLIC_API_URL`; MSW só em testes e Lighthouse CI | Kickoff |
| 2026-10-20 | Comissão nunca fixa no código | Kickoff |
| 2026-10-20 | Interface em pt-BR | Kickoff |
| 2026-10-20 | WCAG 2.2 AA e Lighthouse 100 (4 categorias, mobile+desktop, todas as rotas web) como portões | Kickoff |
| 2026-10-20 | Git: branch `front` como integração, `feat/*` por card, `feat/app-base` para a base; nunca tocar na `main` | Kickoff |
| 2026-10-20 | Retentativas: até 3 por card; na 2ª falha Haiku → Sonnet; na 3ª parar e reportar | Kickoff |
| 2026-10-20 | Skill de React Native a usar: `vercel-react-native-skills` (no lugar de `react-native-skills`) | Pedro |
| 2026-10-20 | Grill da Fase 1 conduzido com `anthropic-skills:grill-me` | Pedro |
| 2026-10-20 | MVP: fluxo principal com rotas existentes + `GET /propostas/minhas` e `GET /disponibilidades/minhas` (construídas contra proposta de contrato + MSW até saírem) | Grill F1 |
| 2026-10-20 | "Se der": certificações (motorista cadastra, admin aprova) e cancelar carga/disponibilidade, só com rota em `main` + contrato em `docs/api.md`. Backlog: chat, painel admin, layout de 2 colunas | Grill F1 |
| 2026-10-20 | Locais: lista fixa de cidades com lat/lng no front (região do seed) + "usar minha localização" (GPS) para o motorista | Grill F1 |
| 2026-10-20 | Mapa: só visualização (rota da carga/frete, cargas em volta do motorista), carregado sob demanda, "se der"; toda informação do mapa também em texto | Grill F1 |
| 2026-10-20 | Atualização automática ~10 s nas telas de espera (propostas da carga, minhas propostas, meus fretes), só com tela aberta e aba visível, + botão atualizar; novidade anunciada sem roubar foco | Grill F1 |
| 2026-10-20 | Cold start: tela "conectando ao servidor" via `GET /saude` + checklist de ensaio + pedido de ping ao Diogo nos dias de apresentação | Grill F1 |
| 2026-10-20 | Desktop-first, com reflow completo no celular (320px) | Grill F1 |
| 2026-10-20 | Demo principal na web projetada (2 janelas: empresa e motorista); iPhone (Expo Go) e PWA instalado como prova rápida | Grill F1 |
| 2026-10-20 | Contas de demo no seed (1 empresa, 2 motoristas com/sem MOPP aprovado, cargas com/sem exigência) + cadastro ao vivo de um motorista; credenciais só no roteiro | Grill F1 |
| 2026-10-20 | Visual "sinalização rodoviária": laranja/âmbar de urgência; tema claro e escuro (segue o sistema + alternar salvo); AA nos dois temas | Grill F1 |
| 2026-10-20 | Conventional commits pequenos e frequentes (escopo opcional, ex.: `feat(login):`); 1 PR por card para `front` | Pedro |
| 2026-10-20 | Componentes em atomic design (atoms, molecules, organisms, templates; telas nas rotas) | Pedro |
| 2026-10-20 | Até 24/10: funcionalidade nova passando os portões por card. 25–28/10: só correção, acabamento, a11y e Lighthouse. Itens "se der" só entram se começarem antes de 24/10 | Grill F1 |
| 2026-10-20 | Protótipos do designer publicados como Artifact e aprovados pelo Pedro antes de qualquer card de tela ser executado | Pedro |
| 2026-10-20 | Padrões: sessão 7 dias, 401 volta ao login com aviso; vencido aparece "expirada" (pelo `expira_em`); frete sem botão cancelar; erros tratam `erro`, `erros` e não-JSON | Grill F1 (padrão) |
| 2026-10-20 | Q1–Q7 do PRD resolvidas com a recomendação do PO: cidades montadas pelos membros sem código (IBGE, cobrindo o seed); prazo 22/10 ao Diogo para `/propostas/minhas` e `/disponibilidades/minhas`, plano B decidido em 23/10; pedir comissão em `GET /fretes/meus`; previews da Vercel só com MSW; "Minhas cargas" sem atualização automática; pedir correção da disponibilidade em dois fretes (5.1); Pedro confirma PWA com o professor antes de 24/10 | Pedro |
| 2026-10-20 | PRD e MVP aprovados pelo Pedro (Fase 1 concluída) | Pedro |
| 2026-10-20 | Designer adiantado para rodar em paralelo à Fase 2 (prazo 24/10); protótipos continuam exigindo aprovação antes dos cards de tela | Orquestrador |
