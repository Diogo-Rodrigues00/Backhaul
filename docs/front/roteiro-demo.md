# Roteiro e ensaio da demo (card 029, MVP-18)

Apresentação ao professor: **29/10/2026**, 10 min. Mostra Tech: **12/11/2026**. Ensaio geral no ambiente hospedado: **28/10**.

Este documento é o roteiro de fala e de clique. A fonte da jornada é `prd.md` §4.3; os nomes de botões e telas abaixo foram conferidos no código de `origin/front` em 23/10/2026.

> **Nenhuma credencial neste arquivo.** E-mail e senha das contas de demo ficam no "Quadro de contas" (seção 8), que é preenchido **fora do repositório** (papel, bloco de notas local, gerenciador de senhas). O `npm run verificar:proibidos` falha o CI se um e-mail de demo aparecer no código.

## 1. Estado real em 23/10 (leia antes de ensaiar)

Verificado no código e por `curl` em 23/10/2026. O que é "instantâneo" (produção) pode ter mudado: refaça os comandos da seção 7.

| Item | Estado | Efeito na demo |
|---|---|---|
| Telas da empresa: publicar carga, minhas cargas, propostas da carga (aceitar/recusar), meus fretes e pagar | Mergeadas em `front` (cards 019, 020, 021, 028) | Usáveis |
| Telas do motorista: cadastro, minhas disponibilidades, publicar disponibilidade, cargas próximas, fazer proposta/contraproposta, meus fretes e status | Mergeadas (cards 017, 022, 023, 024, 025, 027) | Usáveis |
| **Minhas propostas** (card 026) | **Fora do MVP.** A rota `/motorista/propostas` não existe e o item foi **removido do menu do motorista** (`app/src/components/organisms/itensDaArea.ts`, PR #90); o menu tem 3 itens: Cargas próximas, Disponibilidade e Meus fretes | Nada a evitar no menu. Os passos 4 e 7 do PRD que citam "Minhas propostas" foram trocados por "Proposta enviada" no cartão e por "Meus fretes" |
| `GET /propostas/minhas` e `GET /disponibilidades/minhas` em produção | **Não existem** (404 HTML em 23/10) | O app usa o plano B no aparelho (seção 6, linha "Rotas faltando") |
| Seed de demo (senhas reais, 1 empresa, motorista com MOPP, motorista sem MOPP, cargas com e sem exigência) | **A definir com o Diogo (seed de demo).** O `database/seed.sql` do repositório tem `hash_fake_*`: ninguém entra com ele | Sem seed não há como ensaiar o fluxo completo |
| `CORS_ORIGIN` da API aceita `https://backhaul-front.vercel.app`? | **Não** em 23/10 (a pré-requisição `OPTIONS /login` com essa origem volta sem `access-control-allow-origin`; `http://localhost:8081` volta liberado) | O site publicado **não consegue falar com a API** até o Diogo incluir a origem |
| Deploy de produção na Vercel | `https://backhaul-front.vercel.app/entrar` respondia **404** em 23/10: o build publicado é antigo (anterior ao login). Ação do Pedro: `vercel deploy --prod --yes` com `front` atualizado (`STATUS.md`, "Ações do Pedro") | Sem novo deploy a demo hospedada não funciona |
| Página inicial `/` | Provisória: só título e descrição, **sem botões Entrar/Criar conta** (`app/src/app/index.tsx`) | Abrir direto `/entrar` e `/cadastro` (guarde os dois endereços) |
| Comissão depois de recarregar | O app só mostra a comissão logo após pagar; `GET /fretes/meus` não devolve esse dado (decisão Q3 do PRD) | **Não recarregar a página** entre pagar e mostrar a comissão |

## 2. Roteiro de 10 minutos

| Tempo | Bloco | Quem fala (sugestão; o grupo decide) | Apoio |
|---|---|---|---|
| 0:00–2:00 | Problema e diferencial | Membro sem código (pitch de 30 s + contexto) | 2 slides ou fala livre |
| 2:00–7:00 | Demonstração (2 janelas) | Pedro conduz o mouse; um segundo membro narra | Seção 4 |
| 7:00–10:00 | Técnica e divisão do trabalho | Diogo (banco/API) e Pedro (telas), os demais fecham | `mapa-do-codigo.md` aberto |

Os tempos dentro dos blocos são metas: o ensaio de 28/10 diz se cabem.

### Bloco 1: problema (2 min)

Fala sugerida (use só o que está no termo de abertura):

1. "Cerca de 40% dos caminhões no Brasil voltam vazios depois de entregar. Dado da ANTT, citado no nosso termo de abertura. É prejuízo para o motorista e ineficiência para o setor."
2. "Do outro lado, a empresa com carga de prazo curto não acha motorista compatível a tempo e acaba pagando um intermediário caro ou perdendo o prazo."
3. "Plataformas como Fretebras, CargoX e TruckPad já conectam carga e caminhão. O nosso diferencial é o **matching por urgência**: a lista de cargas próximas já chega ordenada por urgência e depois por distância, e a carga perigosa nem aparece para quem não tem a certificação (MOPP)."
4. "Vamos mostrar isso funcionando, com a empresa de um lado e o motorista do outro."

### Bloco 3: técnica e divisão do trabalho (3 min)

1. **Arquitetura em uma frase por camada** (1 min): banco PostgreSQL + PostGIS (`database/schema.sql`); API Node + TypeScript (`backend/`) hospedada no Render; front Expo (React Native + react-native-web) hospedado na Vercel, mesmo código no navegador e no iPhone. Detalhe em `arquitetura.md` e `adr/`.
2. **Três decisões para citar** (1 min): a comissão vem da API, o app não calcula; a lista de cargas já vem ordenada da API; o app tem portões de qualidade (acessibilidade, Lighthouse, orçamento de JS) no CI. Respostas e arquivos em `mapa-do-codigo.md`.
3. **Divisão do trabalho** (1 min): tabela da seção 9.
4. Deixe 30 s para perguntas. Tenha o `mapa-do-codigo.md` aberto numa aba.

## 3. Antes de subir ao palco

1. Duas janelas **em perfis de navegador diferentes** (por exemplo, Chrome normal para a empresa e janela anônima ou Edge para o motorista). O token e a disponibilidade ativa ficam no `localStorage` do navegador (`app/src/lib/armazenamentoComum.ts:5`); duas abas do mesmo perfil dividem a sessão e uma desloga a outra.
2. Janela A (empresa) já logada na conta empresa demo. Janela B (motorista) em `/cadastro/motorista`, sem logar.
3. Ping em `GET /saude` feito pelo Diogo minutos antes (acorda o Render, que dorme em ~50 s sem uso). Combine o horário no grupo.
4. Tema, zoom do projetor e volume conforme a seção 7. Notificações do sistema desligadas.
5. Cadastro ao vivo gasta um e-mail e um CPF por tentativa (a API devolve 409 se repetir). Deixe uma lista de e-mails e CPFs de 11 dígitos **ainda não usados** no quadro da seção 8.
6. Vídeo de backup aberto em outra janela (seção 6).

## 4. Demonstração passo a passo (~5 min)

Janela A = empresa. Janela B = motorista. Textos de botões e telas conferidos no código.

| # | Janela | O que clicar | O que o público vê | Fala sugerida |
|---|---|---|---|---|
| 0 | A e B | As duas já abertas (`/entrar` e `/cadastro/motorista`) | Se o servidor dormiu: tela "Conectando ao servidor" com "Tentativa N de 18"; o app libera sozinho quando `/saude` responde | "O servidor gratuito dorme. O app espera e entra sozinho." (só se aparecer) |
| 1 | A | Menu **Publicar carga**. Preencher tipo de carga, origem e destino (cidades da lista), peso, valor, urgência **Crítico**, certificação **MOPP**, prazo. Botão **Publicar carga** | Prévia "Como o motorista vai ver" acompanha o que é digitado. Ao publicar, abre **Minhas cargas** com a carga nova e 0 propostas (o leitor de tela ouve "Carga publicada") | "A empresa publica uma carga crítica que exige MOPP." |
| 2 | B | **Criar conta** com e-mail, senha (8+), nome completo, CPF, CNH, tipo de veículo, placa e capacidade em kg (motorista **sem** MOPP). Entra direto em **Cargas próximas**, vazia, com a ação "Publicar disponibilidade". Preencher "Onde você está" (cidade da lista, ou "Usar minha localização"), raio, urgência e prazo. **Publicar disponibilidade** | **Cargas próximas** com distância em km; a carga MOPP **não aparece** | "Esse motorista acabou de se cadastrar e não tem MOPP. A carga perigosa não aparece para ele: o filtro é da API." |
| 3 | B | Menu **Sair** (cabeçalho). Entrar com o motorista demo **com** MOPP (quadro de contas). Em Cargas próximas, **Publicar disponibilidade** de novo | A carga MOPP no topo, selo **Crítico**, distância em km, certificação exigida | "Agora o motorista com MOPP aprovado. A carga crítica sobe para o topo: urgência primeiro, depois distância." |
| 4 | B | No cartão da carga, **Contraproposta** → informar o valor → **Enviar contraproposta** | O diálogo fecha e o cartão passa a mostrar "Proposta enviada", sem os botões de proposta (o leitor de tela ouve "Proposta enviada") | "Cada motorista tem uma contraproposta por carga." |
| 5 | A | Em **Minhas cargas**, abrir a carga (tela **Propostas da carga**) e **deixar a tela aberta** | Em até ~10 s a proposta aparece sozinha, com a etiqueta "Nova" e o anúncio "1 nova proposta"; nome do motorista, veículo e MOPP visíveis | "Sem recarregar: a tela atualiza a cada 10 segundos." |
| 6 | A | **Aceitar** na proposta → confirmar | "Frete criado"; as outras propostas pendentes seriam recusadas pela API | "Ao aceitar, a carga fecha e vira um frete." |
| 7 | B | Menu **Meus fretes** (se não aparecer em 10 s, **Atualizar**). **Iniciar transporte** → confirmar | Frete aparece e o status vai para "Em trânsito" | "O motorista avança o status da entrega." |
| 8 | A | Menu **Meus fretes** → **Pagar frete** → confirmar. **Não recarregar a página** | Resumo do pagamento: valor do frete, percentual de comissão, comissão da plataforma e situação ("Pago, retido até a entrega"), todos vindos da API | "A comissão é calculada pelo servidor; o app só mostra." |
| 9 | B | **Confirmar entrega** → confirmar | Pagamento passa a "Liberado ao motorista"; a janela A, aberta em Meus fretes, atualiza sozinha | "Entrega confirmada, pagamento liberado." |
| 10 | iPhone | (≤ 1 min, só se houver tempo) Expo Go com o QR do `npx expo start`, ou o PWA instalado | Login e Cargas próximas no celular | "O mesmo código roda no iPhone." |

Ordem de corte se estourar 5 min: tire o passo 10, depois o 9, depois a segunda parte do passo 2 (use direto a conta "motorista sem MOPP" do quadro). Os passos 1, 3, 5, 6 e 8 sustentam a história (urgência, MOPP, tempo quase real, comissão).

Para o público de leitor de tela (se o professor perguntar por acessibilidade): no passo 5, a nova proposta é anunciada em região viva sem mover o foco (ADR 0010). O card 029 pede uma passada só por teclado nesse passo no ensaio.

## 5. Valores e dados sugeridos

Sugestão, não fato do seed: cargas e cidades precisam estar na lista de `app/src/data/cidades.ts` (63 cidades do Triângulo Mineiro, Alto Paranaíba, sudeste goiano e polos). Origem da carga dentro do raio da disponibilidade. O Mateus, o Gustavo e o Guilherme definem valores e nomes realistas (tarefa de "realismo dos dados").

## 6. Plano B por risco

| Risco | Como aparece | O que fazer |
|---|---|---|
| **Servidor frio** (Render, ~50 s) | Tela "Conectando ao servidor" com contagem de tentativas (a cada 5 s, até 90 s: `app/src/api/saude.ts:14-17`) | Faça o ping antes. Se aparecer no palco, use como fala do problema ("plano grátis") e aguarde: a tela libera sozinha. Passou de 90 s: botão **Tentar de novo**. Se o servidor não voltar, vá para "API fora" |
| **API fora** ou site sem CORS | Erro "Algo deu errado. Tente de novo." nos formulários; ou tela de falha do portão | 1) Mostre o **vídeo de backup**. 2) Alternativa com dados de teste: o app tem modo mock (MSW) **somente no navegador**. Suba com `EXPO_PUBLIC_API_MOCK=msw` e `EXPO_PUBLIC_API_URL=https://api.mock.backhaul.test` (comando em `app/README.md`). Contas do mock: `empresa@mock.test`, `motorista@mock.test` (qualquer senha com 8+ caracteres). É um dado de teste, não a API real: diga isso ao professor. Teste esse caminho no ensaio |
| **GPS negado** | O botão "Usar minha localização" mostra "Você não permitiu o acesso à localização. Escolha a cidade na lista." | Use a **lista de cidades**, que é o caminho principal da demo. GPS é extra. Decida a permissão do navegador do notebook antes e anote no ensaio |
| **Rotas faltando no backend** (`GET /propostas/minhas`, `GET /disponibilidades/minhas`) | 404 nessas duas rotas | O app já cobre: a disponibilidade publicada fica guardada no aparelho (`app/src/state/disponibilidade-ativa/DisponibilidadeAtivaProvider.tsx`) e as propostas enviadas também (`app/src/lib/propostasEnviadas.ts`). Consequência: **cada login do motorista exige publicar a disponibilidade de novo** (o login limpa o que estava guardado). Já está no roteiro (passos 2 e 3) |
| **Rede do local** (Wi-Fi do campus) | Lentidão, queda | Hotspot do celular como reserva (teste no ensaio); vídeo de backup; abra tudo antes. O app não funciona offline (o service worker só guarda arquivos do site, não a API) |
| **Cadastro ao vivo falha** (409 por e-mail/CPF repetido, 400 de validação) | Mensagem junto do campo ou no resumo de erros | Tenha outro e-mail e CPF na lista. Plano B: conta "motorista sem MOPP" do quadro |
| **Proposta não aparece em 10 s** | Tela de propostas sem novidade | Botão **Atualizar**. Verifique se a aba está visível: com a aba oculta o polling para (ADR 0010) |
| **Recarregou depois de pagar** | Comissão some da tela | Explique que a lista de fretes não traz a comissão (decisão registrada, Q3). Se precisar, a comissão fica visível no pagamento de outro frete |
| **Projetor** | Texto pequeno ou cores lavadas | Zoom do navegador a 125–150% (o layout reflui até 320 px sem rolagem horizontal); alterne o tema claro/escuro no cabeçalho e escolha o mais legível na sala |

## 7. Checklist de ensaio (28/10, ambiente hospedado)

Marque cada item e anote o horário e o resultado no registro (seção 10).

**Infraestrutura**
- [ ] `curl https://backhaul-api.onrender.com/saude` responde `{"status":"ok","banco":"conectado"}` (o Diogo faz o ping; primeira chamada ~50 s)
- [ ] Deploy de produção da Vercel atualizado: `https://backhaul-front.vercel.app/entrar` responde 200 (hoje 404)
- [ ] **CORS:** a origem `https://backhaul-front.vercel.app` está no `CORS_ORIGIN` do Render. Teste sem credencial: `curl -s -i -X OPTIONS https://backhaul-api.onrender.com/login -H "Origin: https://backhaul-front.vercel.app" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type"` deve devolver o cabeçalho `access-control-allow-origin`. Teste final: um login real no site publicado, sem erro de CORS no console
- [ ] URL de produção **aberta antes** nas duas janelas (evita o servidor frio no palco)
- [ ] Rotas do plano B: `GET /propostas/minhas` e `GET /disponibilidades/minhas` continuam 404? Se o Diogo as publicou, repita o roteiro inteiro (muda o comportamento)

**Contas e dados**
- [ ] Seed de demo no ar (a definir com o Diogo): 1 empresa, 1 motorista com MOPP aprovado e válido, 1 motorista sem MOPP, cargas com e sem exigência na região da lista de cidades
- [ ] Cada conta do quadro (seção 8) entra pelo login do site publicado
- [ ] Lista de e-mails e CPFs novos para o cadastro ao vivo (um por ensaio mais reserva)
- [ ] Não existe credencial em arquivo do repositório (`npm run verificar:proibidos` em `app/`, com `DEMO_EMAILS` preenchida localmente)

**Equipamento**
- [ ] Permissão de GPS do navegador do notebook decidida (permitida ou bloqueada de propósito) e anotada
- [ ] Tema (claro ou escuro) e zoom do projetor ajustados; texto legível do fundo da sala
- [ ] Dois perfis de navegador (empresa e motorista) sem sessão cruzada
- [ ] Vídeo de backup baixado no notebook, abre sem internet
- [ ] Expo Go no iPhone do Pedro (mesma conta Expo do CLI; atualização automática de apps desligada até 12/11) e PWA instalado. Prova: login e Cargas próximas em ≤ 1 min
- [ ] Hotspot de reserva testado

**Execução**
- [ ] Roteiro da seção 4 **duas vezes seguidas**, cada uma em ≤ 5 min e sem erro (MVP-18)
- [ ] Mede-se o tempo entre a ação numa janela e o reflexo na outra (meta ≤ 15 s sem clicar)
- [ ] Passada só por teclado do passo 5 (card 029)
- [ ] Lighthouse da produção (`/` e `/entrar`) anotado como evidência: `npm run lhci:mobile` e `npm run lhci:desktop` medem o build local com o mock (depois de `npm run export:ci`); para a URL publicada, use o Lighthouse do Chrome DevTools

## 8. Quadro de contas (preencher fora do repositório)

Não escreva e-mail nem senha aqui. Mantenha este quadro em papel ou em arquivo local não versionado.

| Conta | E-mail | Senha | Onde guardado | Situação |
|---|---|---|---|---|
| Empresa demo | a definir com o Diogo (seed de demo) | (fora do repo) | | |
| Motorista demo **com** MOPP aprovado e válido | a definir com o Diogo (seed de demo) | (fora do repo) | | |
| Motorista demo **sem** MOPP (reserva do cadastro ao vivo) | a definir com o Diogo (seed de demo) | (fora do repo) | | |
| Cadastro ao vivo: e-mails e CPFs ainda não usados | a definir pelo grupo | (fora do repo) | | |

O card 029 prevê um script `app/scripts/verificar-contas-demo.mjs` (lê as contas de variáveis de ambiente locais e imprime só "ok" ou "falhou"). **Ainda não existe**: depende do seed do Diogo.

## 9. Divisão do trabalho

Base: `docs/termo_abertura.md` §8 e `docs/cronograma.md` ("Divisão de papéis"). O termo de abertura deixa as responsabilidades como `[preencher]`; a divisão abaixo é a do cronograma, e a coluna "Na apresentação" é sugestão.

| Pessoa | Papel (cronograma) | Na apresentação (sugestão) |
|---|---|---|
| Diogo (`Diogo-Rodrigues00`) | Banco, dados de exemplo, API | Ping em `/saude`, seed de demo, CORS; fala da parte técnica do banco e da API |
| Pedro (`PedroAugusto2208`) | Telas (Expo) e publicação do site | Conduz a demo; deploy na Vercel; fala do front |
| Mateus (`MateuHuTv`) | Sem código: realismo dos dados, roteiro de testes, pitch de 30 s, vídeo de backup, pôster da mostra, atas, board | Board do GitHub (issues, labels) e dados realistas |
| Gustavo (`GustavoF`) | idem | Atas e pitch |
| Guilherme (`guilherme508`) | idem | Vídeo de backup e pôster |

A distribuição das tarefas "sem código" entre Mateus, Gustavo e Guilherme é sugestão; o cronograma não as separa por pessoa. Todos devem saber responder sobre qualquer parte do código (live code sorteado): estudem `mapa-do-codigo.md`.

## 10. Registro do ensaio

| Ensaio | Data/hora | Duração | Erros | Quem rodou |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |
| Mostra Tech (12/11): conferir antes | | | | |

## 11. Pendências deste documento

- Seed de demo e quadro de contas: Diogo.
- CORS da origem da Vercel e novo deploy de produção: Diogo e Pedro.
- Card 026 (Minhas propostas): fora do MVP; o item foi removido do menu do motorista. Se o card entrar, devolver o item a `itensDaArea.ts` e rever os passos 4 e 7.
- `GET /propostas/minhas` e `GET /disponibilidades/minhas`: se saírem em produção, rever as seções 1 e 6.
- Script de verificação de contas e registro dos ensaios: depois do seed.
- Os caminhos `docs/front/demo/roteiro.md` e `docs/front/demo/checklist-ensaio.md` do card 029 foram unificados neste arquivo, a pedido do orquestrador.
