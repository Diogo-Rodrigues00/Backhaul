# PRD — Front-end do Backhaul

_Versão 1.0 · 2026-10-20 · Autor: agente `produto` (PM/PO) · Fonte: `docs/front/decisoes.md` (grill da Fase 1), `app/CLAUDE.md`, `docs/api.md`, `docs/front/relatorio-api-inicial.md`, `docs/termo_abertura.md`, `docs/cronograma.md`._

Status: aguardando aprovação do Pedro. Backlog detalhado e critérios de aceite em `docs/front/mvp.md`.

---

## 1. Problema

- Cerca de 40% dos caminhões no Brasil voltam vazios depois da entrega (ANTT, citado no termo de abertura). É prejuízo para o motorista e ineficiência para o setor.
- Empresas com carga de prazo curto não acham motorista disponível e compatível a tempo, e recorrem a intermediários caros ou perdem o prazo.
- A API do Backhaul já resolve o fluxo (16 rotas em `docs/api.md`), mas **não existe nenhuma tela**. Sem front, não há demonstração do "funcionamento completo do sistema" (25 pontos) nem "hospedagem ativa e acessível" (10 pontos).

## 2. Objetivo e diferencial

**Objetivo do front:** permitir que motorista e empresa executem o fluxo principal de ponta a ponta, na web (projetada) e no iPhone, contra a API real em produção, até o congelamento de 24/10/2026.

**Diferencial a deixar visível na tela:** **matching por urgência**. A lista de cargas próximas já vem da API ordenada por urgência (`critico`, `urgente`, `normal`) e depois por distância, filtrada pela certificação do motorista. O front deve tornar isso óbvio para quem assiste: selo de urgência destacado (visual "sinalização rodoviária", laranja/âmbar), distância em km e certificação exigida em cada carga, e a carga perigosa que **não aparece** para o motorista sem MOPP.

## 3. Personas

| Persona | Quem é | O que quer | Restrições |
|---|---|---|---|
| **Motorista** (caminhoneiro) | Autônomo, termina uma entrega e está livre numa região | Achar rápido uma carga perto, compatível com o veículo e a certificação, e fechar o valor | Usa celular, muitas vezes na estrada; pode ter pouca familiaridade com apps; precisa de texto grande e alvos de toque grandes |
| **Empresa** (embarcador) | Responsável de logística com carga de prazo curto | Publicar a carga, receber propostas, escolher motorista, acompanhar a entrega e pagar | Usa computador (desktop-first) |
| **Admin** (fora do MVP) | Equipe da plataforma | Aprovar certificações, moderar | Sem telas no MVP. Aprovação de certificação é "se der"; painel admin é backlog |
| **Avaliador / visitante** (persona da demo) | Professor em 29/10; empresas na Mostra Tech em 12/11 | Ver o fluxo funcionando, entender o diferencial em poucos minutos, acessar por URL | Assiste à tela projetada; pode abrir o link no próprio celular |

## 4. Jornadas principais

### 4.1 Motorista
1. Abre o app. Se o servidor está dormindo, vê "Conectando ao servidor" até `GET /saude` responder.
2. Cadastra-se (`POST /cadastro/motorista`) e entra automaticamente (`POST /login`, `GET /eu`).
3. Publica disponibilidade (`POST /disponibilidades`): escolhe a cidade da lista **ou** "Usar minha localização" (GPS), raio, urgência e prazo.
4. Vê as cargas próximas (`GET /cargas/proximas`) usando o local e o raio da disponibilidade ativa: urgência, distância, valor, peso, empresa, certificação exigida, prazo.
5. Faz proposta (`POST /propostas`): aceita o valor oferecido **ou** manda uma contraproposta única.
6. Acompanha "Minhas propostas" (`GET /propostas/minhas` 🔜) com atualização automática.
7. Proposta aceita vira frete em "Meus fretes" (`GET /fretes/meus`).
8. Atualiza o status: "Iniciar transporte" (`em_transito`) e "Confirmar entrega" (`entregue`) via `PATCH /fretes/:id/status`.
9. Vê o status do pagamento: aguardando, retido ou liberado.

### 4.2 Empresa
1. Abre o app (mesma tela de conexão), cadastra-se (`POST /cadastro/empresa`) ou entra.
2. Publica carga (`POST /cargas`): tipo, origem e destino (lista de cidades), peso, valor oferecido, urgência, certificação exigida (opcional, de `GET /certificacoes`), prazo.
3. Vê "Minhas cargas" (`GET /cargas/minhas`) com status (aberta, fechada, expirada) e total de propostas.
4. Abre uma carga e vê as propostas (`GET /cargas/:id/propostas`), com dados do motorista e certificações, atualizando sozinho.
5. Aceita ou recusa (`POST /propostas/:id/responder`). Ao aceitar, o frete é criado e as outras propostas pendentes são recusadas pela API.
6. Em "Meus fretes" acompanha o status de entrega e paga (`POST /fretes/:id/pagamento`). Vê valor do frete, percentual e valor da comissão **exatamente como a API devolveu**.

### 4.3 Jornada da demo (2 janelas, ~5 min, web projetada)

Preparação (fora do palco): ping em `/saude` (Diogo) e abertura prévia da URL; janela A = empresa demo logada; janela B = motorista. Credenciais só no roteiro.

| # | Janela | Ação | O que o público vê |
|---|---|---|---|
| 0 | A e B | Abrir a URL | Se o servidor estiver dormindo: "Conectando ao servidor", e o app libera sozinho |
| 1 | A | Empresa publica carga **crítica** com exigência de MOPP | Carga aparece em "Minhas cargas" com 0 propostas |
| 2 | B | Cadastro ao vivo de motorista sem MOPP → entra direto → publica disponibilidade (cidade ou GPS) | Cargas próximas com distância; a carga MOPP **não aparece** (filtro de certificação) |
| 3 | B | Sair e entrar com o motorista demo com MOPP aprovado → disponibilidade → cargas próximas | A carga MOPP aparece no topo (ordem por urgência), com distância em km |
| 4 | B | Enviar contraproposta | "Proposta enviada"; aparece em "Minhas propostas" como pendente |
| 5 | A | Empresa está na tela da carga | Em até ~10 s a proposta surge sozinha e é anunciada; dados do motorista e MOPP visíveis |
| 6 | A | Aceitar | Frete criado; demais pendentes recusadas |
| 7 | B | "Minhas propostas" mostra "Aceita"; "Meus fretes" → Iniciar transporte | Status "Em trânsito" |
| 8 | A | "Meus fretes" → Pagar | Comissão e status "retido" vindos da API |
| 9 | B | Confirmar entrega | Pagamento "liberado"; janela A atualiza sozinha |

Prova rápida (≤ 1 min): mesmo app no iPhone (Expo Go) e PWA instalado.

## 5. Escopo

### 5.1 MVP (até 24/10)
Fluxo principal completo com rotas existentes, mais duas rotas novas construídas contra a proposta de contrato do relatório (seção 4a e 4b) + MSW até o backend entregar:

- Base web (Vercel, PWA instalável) + iPhone (Expo Go); tela "Conectando ao servidor".
- Login, sessão de 7 dias, sair; cadastro de motorista e de empresa.
- Seletor de local: lista fixa de cidades com lat/lng (região do seed) + GPS para o motorista.
- Empresa: publicar carga, minhas cargas, propostas da carga com aceitar/recusar, meus fretes com pagamento simulado.
- Motorista: publicar disponibilidade, minhas disponibilidades (`GET /disponibilidades/minhas` 🔜), cargas próximas, fazer proposta, minhas propostas (`GET /propostas/minhas` 🔜), meus fretes com atualização de status.
- Atualização automática nas telas de espera; tema claro/escuro; pt-BR.
- Contas de demo no seed + roteiro de demo.

### 5.2 Se der (só com rota em `main` e contrato em `docs/api.md`; só entra se começar antes de 24/10)
- Certificações: motorista cadastra (D1–D3) e admin aprova (D4–D5).
- Cancelar carga (C1) e cancelar disponibilidade (C2).
- Mapa de visualização (rota da carga/frete, cargas em volta do motorista), carregado sob demanda, com todo conteúdo também em texto.

### 5.3 Backlog (depois da apresentação)
- Chat da negociação (E1), painel admin (E2), layout de 2 colunas para a empresa.
- Retirar a própria proposta (C3, opcional no relatório).
- Prazo com data e hora livres (no MVP, só opções rápidas; ver D-PO-02).

### 5.4 Fora
- Gateway de pagamento real (pagamento é simulado pela API).
- Avaliações, histórico completo, integrações (TMS).
- Edição de perfil, recuperação de senha, logout no servidor/revogação de token (não existem rotas).
- Notificações push e tempo real (só polling).
- Cancelamento de frete (estado `cancelado` é inalcançável na API).
- App nativo publicado em loja (iPhone só via Expo Go).

## 6. Requisitos funcionais

Detalhe e critérios de aceite por item em `mvp.md`. Resumo:

| ID | Requisito | Rotas |
|---|---|---|
| RF-01 | Verificar servidor antes de liberar o app, com novas tentativas | `GET /saude` |
| RF-02 | Cadastro de motorista e de empresa, com entrada automática após sucesso | `POST /cadastro/motorista`, `POST /cadastro/empresa`, `POST /login` |
| RF-03 | Login, identificação do perfil e roteamento por tipo | `POST /login`, `GET /eu` |
| RF-04 | Sessão de 7 dias; 401 leva ao login com aviso; sair apaga o token | todas protegidas |
| RF-05 | Empresa publica carga com certificação opcional | `GET /certificacoes`, `POST /cargas` |
| RF-06 | Empresa lista as próprias cargas com status e total de propostas | `GET /cargas/minhas` |
| RF-07 | Motorista publica disponibilidade (cidade ou GPS) | `POST /disponibilidades` |
| RF-08 | Motorista lista as próprias disponibilidades e escolhe a ativa | `GET /disponibilidades/minhas` 🔜 |
| RF-09 | Motorista vê cargas próximas, ordenadas pela API, com distância e certificação | `GET /cargas/proximas` |
| RF-10 | Motorista envia aceite ou contraproposta única | `POST /propostas` |
| RF-11 | Motorista acompanha as próprias propostas | `GET /propostas/minhas` 🔜 |
| RF-12 | Empresa vê propostas da carga e aceita ou recusa | `GET /cargas/:id/propostas`, `POST /propostas/:id/responder` |
| RF-13 | Motorista vê fretes e avança o status de entrega | `GET /fretes/meus`, `PATCH /fretes/:id/status` |
| RF-14 | Empresa vê fretes e paga (simulado), exibindo a comissão devolvida pela API | `GET /fretes/meus`, `POST /fretes/:id/pagamento` |
| RF-15 | Atualização automática ~10 s nas telas de espera | rotas de leitura de RF-11, RF-12, RF-13, RF-14 |

### 6.1 Decisões de produto tomadas por padrão (PO)

Não reabrem nada do grill; preenchem lacunas com o padrão mais simples. O Pedro pode vetar na aprovação.

| ID | Decisão |
|---|---|
| D-PO-01 | Após cadastro com sucesso (201), o app faz login com as mesmas credenciais e abre a tela inicial do perfil. Se o login automático falhar, leva ao login com o e-mail preenchido |
| D-PO-02 | Prazo (`expira_em`) de carga e disponibilidade escolhido por opções rápidas relativas a "agora" (ex.: 2 h, 6 h, 12 h, 24 h, 48 h). Data e hora livres ficam no backlog (evita seletor de data, caro em a11y na web) |
| D-PO-03 | Cargas próximas usam `lat`, `lng` e `raio_busca_km` da disponibilidade ativa como `lat`, `lng`, `raio_km`. A proposta usa essa disponibilidade como `chamado_disp_id`. Disponibilidade ativa = escolhida pelo motorista; padrão = a mais recente com status aberto e não vencida |
| D-PO-04 | Sem disponibilidade ativa, a tela de cargas próximas mostra estado vazio com a ação "Publicar disponibilidade" |
| D-PO-05 | Carga em que o motorista já tem proposta **pendente** aparece marcada "Proposta enviada", sem botões de proposta (evita o aceite duplicado da lacuna 5.4 do relatório). Depois de uma contraproposta (qualquer status), o botão de contraproposta não aparece mais para aquela carga; o de aceite continua se a carga estiver aberta e não houver proposta pendente |
| D-PO-06 | Pagar: botão "Pagar frete" para a empresa enquanto `status_pagamento` for `null`, em qualquer `status_entrega`, com confirmação. **Nenhuma prévia de comissão** antes de pagar (não há rota de prévia e a comissão nunca é calculada no front). Após 201, mostrar `valor_frete`, `percentual_comissao`, `valor_comissao` e `status_pagamento` da resposta |
| D-PO-07 | Rótulos de pagamento: `null` → "Aguardando pagamento"; `retido` → "Pago, retido até a entrega"; `liberado` → "Liberado ao motorista"; outros valores do enum (`pendente`, `estornado`) exibidos com o nome em pt-BR |
| D-PO-08 | Aceitar proposta exige confirmação (ação irreversível: fecha a carga e recusa as demais). Recusar também pede confirmação |
| D-PO-09 | Status de frete avança por um único botão com o próximo passo: `aceito` → "Iniciar transporte"; `em_transito` → "Confirmar entrega"; `entregue` → sem botão. Com confirmação |
| D-PO-10 | Usuário `admin` que entrar vê uma tela "Perfil de administrador sem telas nesta versão" com botão Sair |
| D-PO-11 | 401 no `POST /login` é erro do formulário ("E-mail ou senha inválidos"), não "sessão expirada" |
| D-PO-12 | Formatação pt-BR: moeda `R$ 3.500,00`; distância `12,4 km`; peso `8.000 kg`; datas e horas no fuso `America/Sao_Paulo`. Validade de certificação mostrada só como data, aceitando `YYYY-MM-DD` ou timestamp ISO (divergência da seção 1 do relatório) |
| D-PO-13 | Rótulos de urgência: `normal` → "Normal", `urgente` → "Urgente", `critico` → "Crítico"; sempre com texto, nunca só cor |
| D-PO-14 | Validação local espelha só regras que o backend já tem: e-mail com formato válido, senha ≥ 8 caracteres, CPF 11 dígitos, CNPJ 14 dígitos (pontuação aceita), números > 0, raio ≤ 500, e tamanhos máximos dos VARCHAR do schema (relatório 5.5: e-mail 150, nome_completo 150, razao_social 150, cnh 20, veiculo_tipo 50, veiculo_placa 10, tipo_carga 80). Mensagens de 400 que começam com o nome do campo (ex.: `cpf deve ter 11 dígitos`) aparecem junto do campo; as demais, no resumo de erros do formulário |
| D-PO-15 | Cold start: tela "Conectando ao servidor" tenta `GET /saude` a cada 5 s por até 90 s, com texto explicando a espera; depois disso mostra erro com "Tentar de novo". 503 (banco indisponível) conta como falha e continua tentando |
| D-PO-16 | GPS negado ou indisponível: mensagem explicando e o seletor volta para a lista de cidades, sem bloquear o formulário. Local por GPS exibido como "Minha localização atual" + cidade mais próxima da lista |

## 7. Requisitos não funcionais

| ID | Requisito | Como verificar |
|---|---|---|
| RNF-01 Acessibilidade | WCAG 2.2 AA: axe 0 violações + checklist manual (teclado, foco visível, leitor de tela, contraste, zoom 200%, reflow 320 px, `prefers-reduced-motion`, erros associados aos campos). Semântica explícita (`role`/`aria-*`, landmarks, `heading` com `aria-level`, listas, rótulos). Alvos ≥ 24×24 px. Nativo: VoiceOver e Dynamic Type | axe no CI + checklist preenchido por card |
| RNF-02 Lighthouse | 100 em Performance, Acessibilidade, Boas práticas e SEO, mobile e desktop, em **todas** as rotas web (Lighthouse CI com MSW) | Portão do PR |
| RNF-03 Temas | Claro e escuro; segue o sistema; alternância manual salva; AA nos dois | axe e contraste nos dois temas |
| RNF-04 Responsivo | Desktop-first, reflow completo em 320 px sem rolagem horizontal | Teste em 1280 px e 320 px |
| RNF-05 PWA | Manifesto, ícones, service worker; instalável no Chrome/Edge e adicionável à tela inicial do iPhone | Instalação testada nos 3 |
| RNF-06 Plataformas | Mesmo código na web (react-native-web) e no iPhone (Expo Go) | Fluxo principal executado nos dois |
| RNF-07 Cold start | Render dorme (~50 s): tela de conexão (D-PO-15) + ping do Diogo nos dias de apresentação + checklist de ensaio | Teste com servidor frio |
| RNF-08 Polling | ~10 s só nas telas de espera (propostas da carga, minhas propostas, meus fretes), só com a tela aberta e a aba visível; botão "Atualizar"; novidade anunciada em região viva educada, sem mover o foco | Aba oculta 30 s = 0 requisições; leitor de tela anuncia sem perder foco |
| RNF-09 Erros | Tratar corpo com `erro`, com `erros` e corpo não-JSON (HTML do Express, 413 virando 500); nunca exibir HTML ou stack | Testes com MSW para cada formato |
| RNF-10 Segurança | URL da API só via `EXPO_PUBLIC_API_URL`; sem `.env` no Git; credenciais de demo só no roteiro, nunca no código nem na tela | Revisão de PR + busca no repositório |
| RNF-11 Comissão | Nenhum percentual ou valor de comissão fixo no código; só o que a API devolve | Busca no código por `0.05`, `5%`, `* 5` em contexto de comissão = 0 ocorrências |
| RNF-12 Idioma | Toda a interface em pt-BR; `lang="pt-BR"` na web | Lighthouse SEO + revisão |
| RNF-13 Visual | "Sinalização rodoviária" (laranja/âmbar de urgência), atomic design, regras em `design-system.md`; protótipos aprovados pelo Pedro (Artifact) antes dos cards de tela | Aprovação registrada |

## 8. Métricas de sucesso

### Demo (29/10 e 12/11)
| Métrica | Meta |
|---|---|
| Roteiro da seção 4.3 executado de ponta a ponta no ambiente hospedado | ≤ 5 min, 0 erros, em 2 ensaios seguidos em 28/10 |
| Tempo entre ação numa janela e reflexo na outra (proposta, aceite, status, pagamento) | ≤ 15 s sem clicar em nada |
| Servidor frio | App sai sozinho da tela de conexão quando `/saude` responde 200, sem recarregar a página |
| Carga com MOPP | Invisível para o motorista sem MOPP e visível para o motorista com MOPP aprovado, nos 2 ensaios |
| Prova no iPhone | Login e cargas próximas abertos no Expo Go e no PWA instalado em ≤ 1 min |

### Nota (critérios do cronograma)
| Critério | Meta verificável |
|---|---|
| Funcionamento completo (25) | 100% dos itens de prioridade MVP do `mvp.md` com critérios de aceite passando até 24/10 |
| Hospedagem ativa (10) | URL pública da Vercel acessível de rede externa; PWA instalável; API respondendo após o ping |
| Qualidade do código (15) | Todos os PRs do front com portões verdes (Lighthouse 100 x4 mobile+desktop em todas as rotas, axe 0 violações) |

## 9. Riscos e mitigação

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| `GET /propostas/minhas` e `GET /disponibilidades/minhas` não chegarem à produção até 24/10 | Média | Alto (jornada do motorista quebra) | Construir contra a proposta do relatório com MSW; combinar data-limite com o Diogo; plano B sujeito à aprovação do Pedro (Questão Q2): usar a disponibilidade devolvida pelo `POST /disponibilidades` guardada na sessão do app e acompanhar resultado da proposta por "Meus fretes" |
| Cold start do Render (~50 s) na frente do professor | Alta | Médio | Tela de conexão (D-PO-15), ping do Diogo antes, abrir a URL antes de começar, vídeo de backup |
| CORS: domínio da Vercel fora de `CORS_ORIGIN` (comparação exata; previews mudam de URL) | Alta | Alto (web não fala com a API) | Pedir ao Diogo `http://localhost:8081` + domínio de produção; previews validados com MSW (Questão Q4) |
| Seed atual não serve para a demo: senhas são `hash_fake_*` (ninguém entra) e só há 1 motorista | Certa | Alto | Pedir ao Diogo seed de demo com senhas reais (bcrypt), 1 empresa, 2 motoristas (com/sem MOPP aprovado e válido), cargas com e sem exigência na região |
| Uma disponibilidade pode virar dois fretes (relatório 5.1) | Baixa na demo | Médio | Roteiro não usa a mesma disponibilidade em duas cargas; pedir 409 ao Diogo |
| Carga/disponibilidade vencida continua `aberto` na API | Certa | Baixo | Front mostra "Expirada" comparando `expira_em` com o relógio (decisão do grill) |
| `validade` da certificação chega como timestamp ISO em vez de `YYYY-MM-DD` | Provável | Baixo (data errada por fuso) | D-PO-12; pedir correção ao Diogo |
| Lighthouse 100 em Performance com react-native-web e mapa | Média | Alto (portão) | Mapa só sob demanda e "se der"; orçamento de bundle definido pelo tech-lead |
| Prazo: 4 dias de funcionalidade (20–24/10) | Alta | Alto | Ordem de entrega fixa; "se der" só se começar antes de 24/10; nada novo em 25–28/10 |
| Expo Go ainda não instalado no iPhone do Pedro | Média | Baixo | Pendência do Pedro no STATUS; prova no iPhone pode cair para o PWA |
| GPS negado no navegador do notebook projetado | Média | Baixo | Lista de cidades como caminho principal da demo; GPS como extra (D-PO-16) |

## 10. Premissas
- A API em produção corresponde a `docs/api.md` (relatório: 16/16 rotas conformes).
- A comissão vem só de `POST /fretes/:id/pagamento`; o front não conhece o percentual antes.
- Matching por urgência é feito pela API (ordem de `GET /cargas/proximas`); o front não reordena a lista.
- Não há tempo real nem notificação; polling basta para a demo.
- Motorista com MOPP aprovado vem do seed (sem tela de certificação no MVP).

## 11. Dependências do backend (pedir ao Diogo)

| # | Pedido | Prioridade | Referência |
|---|---|---|---|
| 1 | `GET /propostas/minhas` | MVP, bloqueante | Relatório 4a |
| 2 | `GET /disponibilidades/minhas`, com `status` saindo `expirado` quando vencida | MVP, bloqueante | Relatório 4b |
| 3 | Seed de demo: senhas reais, 1 empresa, 2 motoristas (com/sem MOPP aprovado e válido), cargas com e sem exigência na região da lista de cidades | MVP, bloqueante para a demo | Decisão "Contas de demo" |
| 4 | `CORS_ORIGIN` com `http://localhost:8081` e o domínio de produção da Vercel | MVP, bloqueante na web | Relatório 3 |
| 5 | Ping em `/saude` antes da apresentação em 28/10, 29/10 e 12/11 | MVP | Decisão "Cold start" |
| 6 | Correções: 409 para disponibilidade não aberta em `POST /propostas` e no aceite (5.1); `validade` como `YYYY-MM-DD` (seção 1); 400 em vez de 500 em estouro de tamanho (5.5) | Desejável | Relatório 5 e 7 |
| 7 | Cancelar carga (C1) e disponibilidade (C2) | Se der | Relatório 4c |
| 8 | Certificações D1–D5 + admin criado no seed | Se der | Relatório 4d |
| 9 | Opcional: `percentual_comissao` e `valor_comissao` em `GET /fretes/meus` | Depende da Q3 | — |

Toda rota nova só é consumida em produção depois de estar em `main` e documentada em `docs/api.md`.

## 12. Questões abertas

> **Resolvidas em 2026-10-20:** Pedro aceitou a recomendação do PO em Q1–Q7 (registro em `decisoes.md`).

| # | Questão | Recomendação do PO |
|---|---|---|
| Q1 | Quais cidades entram na lista fixa e quem fornece as coordenadas? É dado de negócio; não foi inventado aqui | Membros sem código montam a lista (fonte IBGE) cobrindo **todas** as cidades usadas no seed de demo e nas cargas próximas do roteiro |
| Q2 | Data-limite com o Diogo para as rotas 🔜 e aprovação do plano B (seção 9) se não saírem | Data-limite 22/10; plano B decidido em 23/10 |
| Q3 | A comissão some depois de recarregar a página (`GET /fretes/meus` não traz comissão). Aceitar ou pedir campo ao Diogo? | Pedir os campos (item 9 da seção 11); até lá, mostrar só `status_pagamento` na lista |
| Q4 | Previews da Vercel mudam de URL e não passam no `CORS_ORIGIN` (comparação exata). Aceitar validar previews só com MSW? | Sim: preview com MSW; API real só em produção e local |
| Q5 | "Minhas cargas" (empresa) não está entre as telas com atualização automática; o contador de propostas não muda sozinho | Manter a decisão do grill; o roteiro deixa a empresa na tela da carga, que atualiza |
| Q6 | Lacunas 5.1 (disponibilidade em dois fretes) e 5.4 (aceite duplicado): o backend corrige? | Pedir correção da 5.1; a 5.4 já fica contida no front por D-PO-05 |
| Q7 | O professor já confirmou que PWA atende "versão instalável"? (pendente no cronograma) | Confirmar antes de 24/10 |
