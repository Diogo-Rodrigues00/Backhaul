# MVP — Front-end do Backhaul

_Versão 1.0 · 2026-10-20 · Autor: agente `produto` · Base: `docs/front/prd.md` (decisões D-PO-xx e requisitos RF/RNF)._

Status: aguardando aprovação do Pedro. Itens no nível de funcionalidade/tela; a quebra em cards técnicos é do tech-lead (Fase 2).

## 1. Recorte mínimo

Prova o fluxo principal na web projetada (2 janelas) e no iPhone, contra a API real:

cadastro → login → empresa publica carga → motorista publica disponibilidade → cargas próximas (distância + filtro de certificação) → proposta (aceite ou contraproposta única) → empresa aceita/recusa → frete → motorista atualiza entrega → empresa paga (simulado, comissão da API).

**Prazos:** funcionalidade até 24/10 (cada item passando os portões). 25–28/10 só correção, acabamento, a11y e Lighthouse. "Se der" só entra se começar antes de 24/10 e com rota em `main` + contrato em `docs/api.md`.

**Legenda de rotas:** ✅ existe em `docs/api.md` · 🔜 não existe; construir contra a proposta do `relatorio-api-inicial.md` (seção indicada) com MSW.

## 2. Dependências externas

| Dependência | Itens afetados | Situação |
|---|---|---|
| `GET /disponibilidades/minhas` 🔜 (relatório 4b) | MVP-11, MVP-12, MVP-13 | Pedir ao Diogo; MSW até sair |
| `GET /propostas/minhas` 🔜 (relatório 4a) | MVP-13, MVP-15 | Pedir ao Diogo; MSW até sair |
| Seed de demo com senhas reais, 1 empresa, 2 motoristas (com/sem MOPP aprovado e válido), cargas com e sem exigência | MVP-18 (e testes manuais de todos) | Seed atual tem `hash_fake_*`: ninguém consegue entrar |
| `CORS_ORIGIN` com `http://localhost:8081` e domínio de produção da Vercel | Todos na web | Pedir ao Diogo |
| Lista de cidades com lat/lng (região do seed) | MVP-07, MVP-08, MVP-10 | Questão aberta Q1 do PRD |
| Expo Go no iPhone do Pedro | MVP-01 e prova no iPhone | Pendente (Pedro) |
| Protótipos do designer aprovados (Artifact) | Todos os itens de tela | Antes de qualquer card de tela |
| Rotas C1, C2 (relatório 4c) e D1–D5 (relatório 4d) | Itens "se der" | Só com rota em `main` |

## 3. Critérios transversais (valem para todo item de tela)

Cada item abaixo diz "Atende CT". Significa que **todos** estes critérios valem para as telas do item.

| ID | Critério verificável |
|---|---|
| CT-01 Carregando | Enquanto a requisição está pendente, a área mostra indicador com texto (ex.: "Carregando cargas…") exposto ao leitor de tela; botões de envio ficam desabilitados com rótulo de progresso; clicar duas vezes em enviar gera **1** requisição |
| CT-02 Vazio | Lista vazia mostra mensagem específica da tela + a próxima ação possível (botão ou link) |
| CT-03 Erros | 400 com `erros`: mensagens junto do campo quando a mensagem começa com o nome do campo, demais no resumo do formulário, com foco movido ao resumo. 400 com `erro`, 403, 404, 409: texto de `erro` exibido. 500, falha de rede ou corpo não-JSON: "Algo deu errado. Tente de novo." + botão "Tentar de novo". Nunca exibe HTML, stack ou JSON cru |
| CT-04 Sessão expirada | Qualquer 401 em rota protegida apaga o token e leva ao login com o aviso "Sua sessão expirou. Entre de novo." anunciado ao leitor de tela (exceção: `POST /login`, D-PO-11) |
| CT-05 Acessibilidade | axe 0 violações nos dois temas; navegação completa só por teclado na ordem visual; foco visível; 1 título nível 1 por tela; landmarks (cabeçalho, navegação, principal); todo campo com rótulo visível e erro associado; alvos ≥ 24×24 px; zoom 200% e largura 320 px sem perda de conteúdo nem rolagem horizontal; animações respeitam `prefers-reduced-motion`; no iPhone, VoiceOver lê todos os controles e Dynamic Type aumenta o texto sem cortar |
| CT-06 Lighthouse | 100 em Performance, Acessibilidade, Boas práticas e SEO, mobile e desktop, em cada rota web do item (Lighthouse CI com MSW) |
| CT-07 Formato | Textos em pt-BR; moeda, distância, peso, datas e urgência conforme D-PO-12 e D-PO-13 |
| CT-08 Plataformas | Funciona em desktop (1280 px), celular (320 px) e iPhone via Expo Go |
| CT-09 Atualização automática (só onde o item indicar) | Recarrega a cada ~10 s só com a tela aberta e a aba visível; com a aba oculta por 30 s, 0 requisições; botão "Atualizar" sempre presente; mudança de dados anunciada em região viva educada (ex.: "1 nova proposta") sem mover o foco nem perder o que o usuário digitava |
| CT-10 Vencido | Item com `status` `aberto` e `expira_em` ≤ agora aparece como "Expirada" e sem ações de negociação |

## 4. Backlog ordenado (ordem de entrega)

### Resumo

| Ordem | ID | Item | Prioridade |
|---|---|---|---|
| 1 | MVP-01 | Base publicada (web + PWA + iPhone), casca e tema | MVP |
| 1 | MVP-02 | Tela "Conectando ao servidor" | MVP |
| 2 | MVP-03 | Login e roteamento por perfil | MVP |
| 2 | MVP-04 | Sessão de 7 dias e sair | MVP |
| 2 | MVP-05 | Cadastro de empresa | MVP |
| 2 | MVP-06 | Cadastro de motorista | MVP |
| 3 | MVP-07 | Seletor de local (cidades + GPS) | MVP |
| 3 | MVP-08 | Empresa publica carga | MVP |
| 3 | MVP-09 | Empresa: minhas cargas | MVP |
| 3 | MVP-10 | Motorista publica disponibilidade | MVP |
| 3 | MVP-11 | Motorista: minhas disponibilidades e disponibilidade ativa | MVP |
| 3 | MVP-12 | Motorista: cargas próximas | MVP |
| 3 | MVP-13 | Motorista faz proposta | MVP |
| 3 | MVP-14 | Empresa: propostas da carga, aceitar ou recusar | MVP |
| 3 | MVP-15 | Motorista: minhas propostas | MVP |
| 4 | MVP-16 | Motorista: meus fretes e status de entrega | MVP |
| 4 | MVP-17 | Empresa: meus fretes e pagamento simulado | MVP |
| 4 | MVP-18 | Contas e roteiro da demo | MVP |
| 4 | MVP-19 | Motorista: minhas certificações | Se der |
| 4 | MVP-20 | Admin: aprovar certificações | Se der |
| 4 | MVP-21 | Empresa: cancelar carga | Se der |
| 4 | MVP-22 | Motorista: cancelar disponibilidade | Se der |
| 4 | MVP-23 | Mapa de visualização | Se der |
| — | MVP-24 | Chat da negociação | Backlog |
| — | MVP-25 | Painel admin | Backlog |
| — | MVP-26 | Layout de 2 colunas para a empresa | Backlog |
| — | MVP-27 | Motorista retira a própria proposta | Backlog |
| — | MVP-28 | Prazo com data e hora livres | Backlog |

Contagem: **18 MVP · 5 se der · 5 backlog.**

---

### Bloco 1 — Rodar na web e no iPhone

#### MVP-01 · Base publicada, casca e tema · MVP
**História:** como avaliador, quero abrir o Backhaul por uma URL pública, instalar como app e ver o mesmo app no iPhone, para confirmar que o sistema está hospedado e acessível.
**Rotas:** nenhuma (a URL da API só é lida de `EXPO_PUBLIC_API_URL`).
**Critérios de aceite:**
- [ ] Dado a URL de produção da Vercel, quando aberta no Chrome desktop e no Safari do iPhone, então a tela inicial carrega sem erro no console.
- [ ] Dado o Chrome ou o Edge no desktop, quando o usuário escolhe instalar, então o app abre em janela própria com nome "Backhaul" e ícone.
- [ ] Dado o Safari do iPhone, quando o usuário usa "Adicionar à Tela de Início", então o ícone aparece e o app abre em tela cheia.
- [ ] Dado o Expo Go no iPhone, quando o QR code do projeto é lido, então o app abre na mesma tela inicial da web.
- [ ] A URL da API não aparece em nenhum arquivo de código (busca por `onrender.com` dentro de `app/` fora de `.env.example` = 0 ocorrências).
- [ ] Dado o sistema em tema escuro, quando o app abre pela primeira vez, então abre em tema escuro; quando o usuário alterna o tema, então a escolha persiste após recarregar a página (web) e reabrir o app (iPhone).
- [ ] Documento web com `lang="pt-BR"` e título único por rota.
- [ ] Atende CT (CT-05, CT-06, CT-08 na rota inicial).

#### MVP-02 · Tela "Conectando ao servidor" · MVP
**História:** como apresentador, quero que o app espere o servidor acordar com uma mensagem clara, para não parecer quebrado na frente do professor.
**Rotas:** `GET /saude` ✅
**Critérios de aceite:**
- [ ] Dado o app aberto, quando `GET /saude` ainda não respondeu 200, então aparece o título "Conectando ao servidor" e o texto informando que pode levar até 1 minuto.
- [ ] Dado falha, demora ou 503, quando passam 5 s, então o app tenta de novo, até 90 s no total (D-PO-15).
- [ ] Dado que `/saude` responde 200, quando isso acontece, então o app segue sozinho para o login (sem sessão) ou para a tela inicial do perfil (com sessão), sem recarregar a página.
- [ ] Dado 90 s sem 200, então aparece "Não foi possível conectar ao servidor" e o botão "Tentar de novo", que reinicia o ciclo.
- [ ] A verificação acontece uma vez por abertura do app, não a cada navegação.
- [ ] Mudanças de estado (conectando, conectado, falhou) anunciadas em região viva educada; indicador animado parado com `prefers-reduced-motion`.
- [ ] Atende CT.

### Bloco 2 — Login e cadastro

#### MVP-03 · Login e roteamento por perfil · MVP
**História:** como motorista ou empresa, quero entrar com e-mail e senha e cair direto na minha área.
**Rotas:** `POST /login` ✅, `GET /eu` ✅
**Critérios de aceite:**
- [ ] Dado e-mail e senha válidos de empresa, quando envia, então abre "Minhas cargas" e o cabeçalho mostra o `nome` de `GET /eu`.
- [ ] Dado credenciais de motorista, quando envia, então abre "Cargas próximas" (ou o estado vazio de D-PO-04).
- [ ] Dado usuário `admin`, quando envia, então abre a tela de D-PO-10 com botão "Sair".
- [ ] Dado credenciais erradas (401), então aparece "E-mail ou senha inválidos" no formulário, o foco vai para a mensagem e o usuário continua na tela (D-PO-11).
- [ ] Dado campo vazio, quando envia, então o erro aparece junto do campo sem chamar a API.
- [ ] Campo de senha com opção de mostrar/ocultar acessível por teclado e leitor de tela; campos com `autocomplete` de e-mail e senha.
- [ ] Link "Criar conta" leva à escolha entre motorista e empresa.
- [ ] Atende CT.

#### MVP-04 · Sessão de 7 dias e sair · MVP
**História:** como usuário, quero continuar logado entre visitas e poder sair, e ser avisado quando a sessão vencer.
**Rotas:** todas as protegidas (comportamento de 401); `GET /eu` ✅ para restaurar a sessão.
**Critérios de aceite:**
- [ ] Dado login feito, quando a página é recarregada ou o app reaberto, então o usuário continua na sua área sem novo login.
- [ ] Dado o botão "Sair", quando acionado, então o token é apagado e abre o login; voltar no navegador não mostra dados da sessão anterior.
- [ ] Dado token inválido ou vencido, quando qualquer rota protegida responde 401, então vale CT-04.
- [ ] Dado que o usuário foi apagado (`GET /eu` 404), então o token é apagado e abre o login com aviso.
- [ ] Atende CT.

#### MVP-05 · Cadastro de empresa · MVP
**História:** como empresa, quero criar minha conta com razão social e CNPJ para publicar cargas.
**Rotas:** `POST /cadastro/empresa` ✅, `POST /login` ✅
**Critérios de aceite:**
- [ ] Formulário com e-mail, senha, razão social e CNPJ; validação local de D-PO-14 (e-mail válido, senha ≥ 8, CNPJ com 14 dígitos aceitando pontuação, razão social ≤ 150).
- [ ] Dado dados válidos, quando envia e recebe 201, então o app entra automaticamente e abre "Minhas cargas" (D-PO-01).
- [ ] Dado 409 (`e-mail ou CNPJ já cadastrado`), então a mensagem da API aparece no formulário e os dados digitados (exceto a senha) continuam preenchidos.
- [ ] Dado 400, então cada mensagem aparece junto do campo correspondente (CT-03).
- [ ] Atende CT.

#### MVP-06 · Cadastro de motorista · MVP
**História:** como motorista, quero criar minha conta com meus dados e do veículo para procurar cargas.
**Rotas:** `POST /cadastro/motorista` ✅, `POST /login` ✅
**Critérios de aceite:**
- [ ] Formulário com e-mail, senha, nome completo, CPF, CNH, tipo de veículo, placa e capacidade (kg); validação local de D-PO-14 (CPF 11 dígitos com pontuação aceita, capacidade número > 0, tamanhos máximos).
- [ ] Capacidade aceita só números; teclado numérico no iPhone.
- [ ] Dado dados válidos, quando recebe 201, então entra automaticamente e abre o estado vazio de "Cargas próximas" com a ação "Publicar disponibilidade" (D-PO-01, D-PO-04).
- [ ] Dado 409 (`e-mail ou CPF já cadastrado`), então a mensagem aparece e os dados (exceto senha) continuam preenchidos.
- [ ] Cadastro completo executável em ≤ 60 s por quem digita na demo (8 campos, sem passos extras).
- [ ] Atende CT.

### Bloco 3 — Telas da empresa e do motorista

#### MVP-07 · Seletor de local (cidades + GPS) · MVP
**História:** como usuário, quero escolher um local por nome de cidade (ou pelo GPS, se for motorista) sem digitar coordenadas.
**Rotas:** nenhuma (lista fixa no front; Q1 do PRD).
**Critérios de aceite:**
- [ ] Lista contém todas as cidades usadas no seed de demo e no roteiro, cada uma com `lat`/`lng` numéricos.
- [ ] Busca por nome ignora acentos e maiúsculas (ex.: "uberlandia" encontra "Uberlândia").
- [ ] Operável só por teclado e anunciado pelo leitor de tela (nome do campo, número de resultados, opção selecionada).
- [ ] Para o motorista: botão "Usar minha localização"; dado permissão concedida, então o local vira as coordenadas do aparelho e aparece "Minha localização atual" + cidade mais próxima da lista.
- [ ] Dado permissão negada ou erro de GPS, então aparece mensagem explicando e o seletor de cidade continua disponível (D-PO-16).
- [ ] A empresa não vê a opção de GPS.
- [ ] Atende CT.

#### MVP-08 · Empresa publica carga · MVP
**História:** como empresa, quero publicar uma carga com urgência e exigência de certificação para receber propostas de motoristas próximos.
**Rotas:** `GET /certificacoes` ✅, `POST /cargas` ✅
**Critérios de aceite:**
- [ ] Campos: tipo de carga (≤ 80), origem e destino (MVP-07), peso (kg, > 0), valor oferecido (R$, > 0), urgência (Normal/Urgente/Crítico, padrão Normal), certificação exigida (opcional: "Nenhuma" + itens de `GET /certificacoes`), prazo (opções rápidas, D-PO-02).
- [ ] Dado "Nenhuma" certificação, então o corpo envia `certificacao_requerida_id: null`.
- [ ] Peso e valor são enviados como número, nunca texto; `expira_em` em ISO 8601 no futuro.
- [ ] Dado `GET /certificacoes` com erro, então o campo mostra o erro com "Tentar de novo" e o restante do formulário continua utilizável.
- [ ] Dado 201, então abre "Minhas cargas" com a nova carga no topo e mensagem "Carga publicada" anunciada.
- [ ] Dado origem igual ao destino, então o formulário avisa antes de enviar. _(Regra de UX, não bloqueia na API.)_
- [ ] Atende CT.

#### MVP-09 · Empresa: minhas cargas · MVP
**História:** como empresa, quero ver minhas cargas, o status e quantas propostas cada uma recebeu.
**Rotas:** `GET /cargas/minhas` ✅
**Critérios de aceite:**
- [ ] Cada carga mostra: tipo, origem → destino (nome da cidade mais próxima da lista), peso, valor oferecido, urgência, certificação exigida (`certificacao_exigida` ou "Sem exigência"), prazo, status e `total_propostas`.
- [ ] Ordem igual à da API (mais recentes primeiro).
- [ ] Status em texto: `aberto` → "Aberta", `fechado` → "Fechada", `cancelado` → "Cancelada", `expirado` → "Expirada"; e CT-10 para aberta vencida.
- [ ] Dado clique numa carga, então abre "Propostas da carga" (MVP-14).
- [ ] Vazio: "Você ainda não publicou cargas" + "Publicar carga".
- [ ] Botão "Atualizar" presente (sem atualização automática; Q5 do PRD).
- [ ] Atende CT.

#### MVP-10 · Motorista publica disponibilidade · MVP
**História:** como motorista, quero avisar que estou livre num local, com raio e urgência, para ver cargas perto.
**Rotas:** `POST /disponibilidades` ✅
**Critérios de aceite:**
- [ ] Campos: local (MVP-07, com GPS), raio em km (número > 0 e ≤ 500, padrão 50), urgência (padrão Normal), prazo (opções rápidas, D-PO-02).
- [ ] Coordenadas e raio enviados como número.
- [ ] Dado 201, então a nova disponibilidade vira a ativa (D-PO-03) e abre "Cargas próximas" já buscando com ela.
- [ ] Dado 400, então erros nos campos (CT-03).
- [ ] Atende CT.

#### MVP-11 · Motorista: minhas disponibilidades e disponibilidade ativa · MVP
**História:** como motorista, quero ver minhas disponibilidades e escolher qual usar para buscar cargas e propor.
**Rotas:** `GET /disponibilidades/minhas` 🔜 (relatório 4b)
**Critérios de aceite:**
- [ ] Cada item mostra: local (cidade mais próxima ou "Minha localização"), raio, urgência, prazo, status e `propostas_pendentes`.
- [ ] Status em texto (Aberta, Fechada, Expirada, Cancelada); CT-10 também quando a API devolver `aberto` vencido.
- [ ] Dado uma disponibilidade aberta e não vencida, quando o motorista escolhe "Usar esta", então ela vira a ativa e "Cargas próximas" passa a usá-la.
- [ ] Sem escolha manual, a ativa é a mais recente aberta e não vencida (D-PO-03); a ativa é indicada em texto ("Ativa"), não só por cor.
- [ ] Vazio: "Nenhuma disponibilidade publicada" + "Publicar disponibilidade".
- [ ] Testado com MSW no formato exato da proposta 4b; ao sair a rota em `main`, nenhuma mudança de tela necessária.
- [ ] Atende CT.

#### MVP-12 · Motorista: cargas próximas · MVP
**História:** como motorista, quero ver as cargas que posso pegar perto de mim, das mais urgentes para as menos, com a distância.
**Rotas:** `GET /cargas/proximas` ✅; `GET /disponibilidades/minhas` 🔜 (para a ativa)
**Critérios de aceite:**
- [ ] Busca com `lat`, `lng` e `raio_km` da disponibilidade ativa (D-PO-03); a tela mostra qual local e raio está usando.
- [ ] Cada carga mostra: urgência (selo com texto), tipo, empresa, distância até a origem (`distancia_origem_km`, "12,4 km"), origem → destino, peso, valor oferecido, certificação exigida ou "Sem exigência", prazo.
- [ ] Ordem exatamente igual à da API (o front não reordena).
- [ ] Dado motorista sem MOPP aprovado e carga que exige MOPP dentro do raio, então a carga não aparece (vem filtrada da API; verificado no ensaio com as contas de demo).
- [ ] Dado carga com proposta pendente do motorista, então aparece "Proposta enviada" sem botões de proposta (D-PO-05).
- [ ] Sem disponibilidade ativa: estado vazio de D-PO-04.
- [ ] Lista vazia: "Nenhuma carga aberta num raio de N km" + "Publicar disponibilidade com raio maior".
- [ ] Botão "Atualizar" presente.
- [ ] Atende CT.

#### MVP-13 · Motorista faz proposta · MVP
**História:** como motorista, quero aceitar o valor oferecido ou mandar uma única contraproposta para uma carga.
**Rotas:** `POST /propostas` ✅; `GET /propostas/minhas` 🔜 (para D-PO-05)
**Critérios de aceite:**
- [ ] Duas ações por carga: "Aceitar R$ X" (envia `tipo: "aceite"`, sem valor) e "Contraproposta" (envia `tipo: "contraproposta"` + `valor_proposto` número > 0).
- [ ] `chamado_disp_id` = disponibilidade ativa; `chamado_carga_id` = carga escolhida.
- [ ] A contraproposta avisa antes do envio que é **única** para aquela carga.
- [ ] Dado 201, então "Proposta enviada" é anunciado, a carga passa a mostrar "Proposta enviada" e a proposta aparece em "Minhas propostas" como "Pendente".
- [ ] Dado 409 `você já fez a contraproposta única para esta carga`, então a mensagem aparece e a opção de contraproposta some para essa carga.
- [ ] Dado 409 `carga não está mais aberta para propostas`, então a mensagem aparece e a lista de cargas próximas é recarregada.
- [ ] Dado 403 `motorista sem a certificação exigida` ou 404 `disponibilidade não encontrada`, então a mensagem da API aparece; no 404, com link para "Minhas disponibilidades".
- [ ] Depois de uma contraproposta (qualquer status), a opção de contraproposta não aparece mais para a carga (D-PO-05).
- [ ] O foco volta para um ponto previsível após fechar o formulário de proposta (o botão que o abriu ou a mensagem de sucesso).
- [ ] Atende CT.

#### MVP-14 · Empresa: propostas da carga, aceitar ou recusar · MVP
**História:** como empresa, quero ver as propostas de uma carga com os dados do motorista e aceitar uma para fechar o frete.
**Rotas:** `GET /cargas/minhas` ✅ (resumo da carga), `GET /cargas/:id/propostas` ✅, `POST /propostas/:id/responder` ✅
**Critérios de aceite:**
- [ ] Topo mostra o resumo da carga (tipo, origem → destino, valor oferecido, urgência, certificação, status).
- [ ] Cada proposta mostra: tipo ("Aceita o valor" ou "Contraproposta"), `valor_proposto`, status (Pendente/Aceita/Recusada/Expirada), data, nome do motorista, veículo e placa, capacidade, e cada certificação com nome, validade (só data, D-PO-12) e "Aprovada" ou "Não aprovada" (`validado_por_admin`).
- [ ] Ordem igual à da API (pendentes primeiro).
- [ ] Botões "Aceitar" e "Recusar" só em propostas pendentes de carga aberta e não vencida.
- [ ] Dado "Aceitar" confirmado (D-PO-08), quando 200, então aparece "Frete criado" com link "Ver fretes", a proposta mostra "Aceita", as demais pendentes passam a "Recusada" e a carga a "Fechada".
- [ ] Dado "Recusar" confirmado, quando 200, então a proposta mostra "Recusada".
- [ ] Dado 409 (já respondida ou carga não aberta), então a mensagem aparece e a lista é recarregada.
- [ ] Dado id de carga inexistente ou de outra empresa (404), então aparece "Carga não encontrada" + link "Minhas cargas".
- [ ] Vazio: "Nenhuma proposta ainda. Esta tela atualiza sozinha."
- [ ] Atualização automática (CT-09): nova proposta aparece em ≤ 15 s após o envio pelo motorista e é anunciada ("1 nova proposta").
- [ ] Atende CT.

#### MVP-15 · Motorista: minhas propostas · MVP
**História:** como motorista, quero acompanhar minhas propostas e saber quando uma foi aceita ou recusada.
**Rotas:** `GET /propostas/minhas` 🔜 (relatório 4a)
**Critérios de aceite:**
- [ ] Cada proposta mostra: carga (tipo, empresa, origem → destino, urgência, certificação), tipo, valor proposto, valor oferecido, status da proposta e status da carga (`carga.status`, com CT-10 por `carga.expira_em`).
- [ ] Ordem igual à da API (mais recentes primeiro).
- [ ] Dado proposta "Aceita", então aparece link "Ver frete" para "Meus fretes".
- [ ] Dado proposta pendente com carga fechada, cancelada ou vencida, então aparece "Carga não está mais disponível".
- [ ] Vazio: "Você ainda não fez propostas" + "Ver cargas próximas".
- [ ] Atualização automática (CT-09): mudança de status aparece em ≤ 15 s após a resposta da empresa e é anunciada (ex.: "Proposta aceita").
- [ ] Testado com MSW no formato exato da proposta 4a.
- [ ] Atende CT.

### Bloco 4 — Demais fluxos

#### MVP-16 · Motorista: meus fretes e status de entrega · MVP
**História:** como motorista, quero ver meus fretes, marcar coleta e entrega, e saber se o pagamento foi feito.
**Rotas:** `GET /fretes/meus` ✅, `PATCH /fretes/:id/status` ✅
**Critérios de aceite:**
- [ ] Cada frete mostra: tipo de carga, empresa (`empresa.razao_social`), valor final, status de entrega ("Aceito", "Em trânsito", "Entregue"), coleta e entrega (data/hora ou "—"), status de pagamento (D-PO-07).
- [ ] Um único botão com o próximo passo (D-PO-09): `aceito` → "Iniciar transporte"; `em_transito` → "Confirmar entrega"; `entregue` → sem botão. Nenhum botão de cancelar.
- [ ] Dado confirmação e 200, então o frete mostra o novo status, `coleta_em`/`entrega_em` e `status_pagamento` da resposta.
- [ ] Dado frete já pago (`retido`) e "Confirmar entrega" com 200, então o pagamento aparece "Liberado ao motorista".
- [ ] Dado 409 (transição não permitida), então a mensagem da API aparece e a lista é recarregada.
- [ ] Vazio: "Nenhum frete ainda" + "Ver minhas propostas".
- [ ] Atualização automática (CT-09): pagamento feito pela empresa aparece em ≤ 15 s e é anunciado.
- [ ] Atende CT.

#### MVP-17 · Empresa: meus fretes e pagamento simulado · MVP
**História:** como empresa, quero acompanhar a entrega dos meus fretes e pagar pela plataforma, vendo a comissão cobrada.
**Rotas:** `GET /fretes/meus` ✅, `POST /fretes/:id/pagamento` ✅
**Critérios de aceite:**
- [ ] Cada frete mostra: tipo de carga, motorista (nome, veículo, placa), valor final, status de entrega, coleta e entrega, status de pagamento (D-PO-07).
- [ ] Botão "Pagar frete" só quando `status_pagamento` é `null` (D-PO-06), com confirmação que mostra o valor final e informa que a comissão é calculada pela plataforma; nenhum percentual ou valor de comissão aparece antes da resposta.
- [ ] Dado 201, então aparece o resumo com `valor_frete`, `percentual_comissao` (ex.: "5%" se a API devolver 5.00), `valor_comissao` e `status_pagamento` **exatamente** da resposta, e o frete passa a mostrar o novo status de pagamento.
- [ ] Dado 409 `frete já foi pago` ou `frete cancelado não pode ser pago`, então a mensagem aparece e a lista é recarregada.
- [ ] Nenhuma constante de comissão no código (RNF-11).
- [ ] Vazio: "Nenhum frete ainda. Aceite uma proposta para criar um frete." + "Minhas cargas".
- [ ] Atualização automática (CT-09): mudança de status de entrega feita pelo motorista aparece em ≤ 15 s e é anunciada.
- [ ] Atende CT.

#### MVP-18 · Contas e roteiro da demo · MVP
**História:** como apresentador, quero contas prontas e um roteiro ensaiado para mostrar o fluxo inteiro em 5 minutos.
**Rotas:** todas do MVP; depende do seed de demo (Diogo).
**Critérios de aceite:**
- [ ] Seed em produção com 1 empresa, 1 motorista com MOPP aprovado e válido, 1 motorista sem MOPP, cargas com e sem exigência dentro da região da lista de cidades; todas as contas entram pelo `POST /login`.
- [ ] Roteiro escrito com os passos da seção 4.3 do PRD; credenciais só no roteiro (busca no código e no site por e-mails de demo = 0 ocorrências).
- [ ] Checklist de ensaio: ping no `/saude`, URL de produção aberta antes, `CORS_ORIGIN` conferido, contas testadas, permissão de GPS decidida, tema e zoom do projetor ajustados, vídeo de backup disponível.
- [ ] Dado o ensaio de 28/10 no ambiente hospedado, então o roteiro roda 2 vezes seguidas em ≤ 5 min cada, sem erro.
- [ ] Prova no iPhone: login e cargas próximas no Expo Go e no PWA instalado em ≤ 1 min.

---

### Se der (só com rota em `main` + contrato em `docs/api.md`, iniciado antes de 24/10)

#### MVP-19 · Motorista: minhas certificações · Se der
**História:** como motorista, quero cadastrar meu MOPP para poder pegar cargas perigosas.
**Rotas:** `GET /motorista/certificacoes` 🔜, `POST /motorista/certificacoes` 🔜, `PUT /motorista/certificacoes/:id` 🔜 (relatório 4d, D1–D3); `GET /certificacoes` ✅
**Critérios de aceite:**
- [ ] Lista com nome, número, validade (só data) e "Aguardando aprovação" ou "Aprovada".
- [ ] Cadastro com certificação (de `GET /certificacoes`), número (≤ 60) e validade futura; 201 mostra "Aguardando aprovação".
- [ ] Dado 409 `certificação já cadastrada`, então a mensagem aparece com opção de editar.
- [ ] Editar avisa que a certificação volta para "Aguardando aprovação".
- [ ] Vazio: "Nenhuma certificação cadastrada" + "Cadastrar certificação".
- [ ] Atende CT.

#### MVP-20 · Admin: aprovar certificações · Se der
**História:** como admin, quero aprovar ou reprovar certificações para liberar cargas perigosas ao motorista.
**Rotas:** `GET /admin/certificacoes` 🔜, `PATCH /admin/certificacoes/:id` 🔜 (relatório 4d, D4–D5); admin criado no seed.
**Critérios de aceite:**
- [ ] Admin que entra vê a lista de pendentes (substitui a tela de D-PO-10).
- [ ] Cada item: motorista, certificação, número, validade; botões "Aprovar" e "Reprovar" com confirmação.
- [ ] Dado aprovação com 200, então o item sai da lista de pendentes; o motorista passa a ver as cargas que exigem aquela certificação (verificado com conta de demo).
- [ ] Vazio: "Nenhuma certificação aguardando aprovação".
- [ ] Atende CT.

#### MVP-21 · Empresa: cancelar carga · Se der
**Rotas:** `POST /cargas/:id/cancelar` 🔜 (relatório 4c, C1)
**Critérios de aceite:**
- [ ] Botão "Cancelar carga" só em carga aberta e não vencida, com confirmação informando que as propostas pendentes serão recusadas.
- [ ] Dado 200, então a carga mostra "Cancelada" e as propostas pendentes "Recusada".
- [ ] Dado 409 `carga não está aberta`, então a mensagem aparece e a carga é recarregada.
- [ ] Atende CT.

#### MVP-22 · Motorista: cancelar disponibilidade · Se der
**Rotas:** `POST /disponibilidades/:id/cancelar` 🔜 (relatório 4c, C2)
**Critérios de aceite:**
- [ ] Botão "Cancelar disponibilidade" só em disponibilidade aberta e não vencida, com confirmação.
- [ ] Dado 200, então mostra "Cancelada"; se era a ativa, "Cargas próximas" passa ao estado de D-PO-04 ou à próxima ativa.
- [ ] Dado 409 `disponibilidade não está aberta`, então a mensagem aparece e a lista é recarregada.
- [ ] Atende CT.

#### MVP-23 · Mapa de visualização · Se der
**Rotas:** nenhuma nova (usa coordenadas já devolvidas).
**Critérios de aceite:**
- [ ] Mapa só carrega quando o usuário pede ("Ver no mapa"); rotas sem o mapa aberto não baixam o código do mapa.
- [ ] Mostra rota origem → destino da carga/frete e, para o motorista, as cargas em volta do local ativo.
- [ ] Toda informação do mapa também está em texto na tela; o mapa não é o único meio de nenhuma ação.
- [ ] Lighthouse 100 mantido nas rotas que oferecem o mapa (CT-06).
- [ ] Atende CT.

---

### Backlog (fora do prazo da apresentação)

| ID | Item | Rotas | Observação |
|---|---|---|---|
| MVP-24 | Chat da negociação | `GET/POST /propostas/:id/mensagens` 🔜 (relatório E1) | Polling; moderação só marca |
| MVP-25 | Painel admin | `/admin/mensagens`, `/admin/usuarios` 🔜 (relatório E2) | — |
| MVP-26 | Layout de 2 colunas para a empresa (lista + detalhe) | existentes | Desktop |
| MVP-27 | Motorista retira a própria proposta | `POST /propostas/:id/cancelar` 🔜 (relatório C3, opcional) | Não decidido no grill |
| MVP-28 | Prazo com data e hora livres | existentes | Substitui opções rápidas (D-PO-02) |

Critérios de aceite do backlog serão escritos quando o item for priorizado.
