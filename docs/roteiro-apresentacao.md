# Roteiro de apresentação — Backhaul (4 pessoas)

> Base: texto de abertura do grupo + `docs/front/roteiro-demo.md` (clique a clique) + `docs/decisoes-backend.md` + `docs/api.md`.
> Duração-alvo: **10 min** (a de 29/10 foi assim; confirme o tempo da Mostra Tech de 12/11).
> Os nomes abaixo são **sugestão**, baseada na divisão do `cronograma.md`. Troquem à vontade, mas **todos** têm que saber responder sobre qualquer parte (Live Code é sorteado).

| Papel | Sugestão | Faz o quê |
|---|---|---|
| **P1 — Abertura** | quem tem o texto (Diogo) | Abre (problema, solução, diferencial) e fecha |
| **P2 — Mouse** | Pedro (telas) | Conduz as duas janelas da demo, sem falar muito |
| **P3 — Narrador** | Mateus / Gustavo / Guilherme | Narra a demo enquanto P2 clica |
| **P4 — Técnico** | Diogo (banco/API) | Explica a arquitetura e as decisões; responde perguntas técnicas |

Se P1 e P4 forem a mesma pessoa, a 4ª pessoa fica com a **concorrência/mercado** (bloco 1) e com o **plano B** (vídeo, hotspot, ping no servidor).

---

## Cronograma

| Tempo | Bloco | Quem |
|---|---|---|
| 0:00–2:30 | 1. Abertura (texto da imagem, completo) | P1 |
| 2:30–3:00 | 2. Ponte para a demo | P1 → P3 |
| 3:00–7:30 | 3. Demonstração ao vivo | P2 (mouse) + P3 (voz) |
| 7:30–9:30 | 4. Por dentro do sistema | P4 (com P2 apoiando) |
| 9:30–10:00 | 5. Fechamento e perguntas | P1 |

---

## 1. Abertura — P1 (≈ 2:30)

Texto da imagem, com os erros de digitação corrigidos e os pontos que achei que faltavam entre colchetes (corte o que não quiser).

> Boa noite, pessoal! Vou apresentar o nosso trabalho. Nosso projeto se chama **Backhaul**, uma plataforma que conecta caminhoneiros disponíveis a empresas com cargas urgentes.
>
> **O problema:** muitos caminhões voltam vazios depois da entrega, gerando custo e desperdício. [*Segundo a ANTT, citada no nosso termo de abertura, cerca de 40% dos caminhões no Brasil voltam vazios.*] Enquanto isso, empresas têm dificuldade de achar transporte rápido [*e acabam pagando um intermediário caro ou perdendo o prazo.*]
>
> **A solução funciona assim:** o motorista informa sua disponibilidade, a empresa publica a carga, e o sistema identifica oportunidades compatíveis. Depois vêm a proposta, o frete e a transação [*— com o pagamento retido até a entrega ser confirmada.*]
>
> **O diferencial:** o nosso projeto não é só uma lista de anúncios. O foco é **urgência e proximidade**: a carga mais urgente e mais perto aparece primeiro. [*E carga perigosa só aparece para quem tem a certificação exigida, como o MOPP.*]
>
> Já existem plataformas parecidas, como a Fretebras, a CargoX e a TruckPad, [*que conectam carga e caminhão*], mas, **até onde pesquisamos**, nenhuma tem foco em urgência. Esse é o nosso diferencial.

Dicas:
- **"Nenhuma foca em urgência" é uma afirmação forte.** O professor pode perguntar "como vocês sabem?". Por isso sugeri "até onde pesquisamos". O nome "Ze Frete" da imagem não aparece em nenhum documento do repositório; os concorrentes citados no termo de abertura são Fretebras, CargoX e TruckPad. Usem os nomes que vocês de fato pesquisaram.
- Fale devagar. Esse bloco tem que dar o contexto para a demo fazer sentido.

## 2. Ponte — P1 → P3 (≈ 0:30)

> P1: "Em vez de explicar, vamos mostrar. De um lado, uma empresa com uma carga crítica. Do outro, um motorista procurando frete. O P3 vai narrar e o P2 vai operar."

---

## 3. Demonstração ao vivo — P2 clica, P3 narra (≈ 4:30)

Detalhes de cada botão e do que aparece na tela: `docs/front/roteiro-demo.md`, seção 4. Resumo com a fala sugerida:

| # | Janela | Ação | P3 fala |
|---|---|---|---|
| 1 | A (empresa) | **Publicar carga**: urgência **Crítico**, certificação **MOPP** | "A empresa publica uma carga crítica de combustível, que exige MOPP." |
| 2 | B (motorista) | Entrar como motorista **sem MOPP** → **Publicar disponibilidade** (Uberlândia, raio 80 km) → **Cargas próximas** | "Este motorista não tem MOPP. A carga perigosa **não aparece** para ele: o filtro é feito na API." |
| 3 | B | **Sair** e entrar como motorista **com MOPP** → publicar disponibilidade de novo | "Agora, com MOPP aprovado: a carga crítica sobe para o topo, com a distância em km. Urgência primeiro, depois proximidade." |
| 4 | B | **Contraproposta** → valor → **Enviar** | "O motorista negocia. Cada motorista tem uma contraproposta por carga." |
| 5 | A | Abrir a carga em **Minhas cargas** e **deixar a tela aberta** | "Sem recarregar a página, a proposta aparece em até 10 segundos." |
| 6 | A | **Aceitar** → confirmar | "Ao aceitar, a carga fecha e vira um frete. As outras propostas pendentes são recusadas." |
| 7 | B | **Meus fretes** → **Iniciar transporte** | "O motorista avança o status da entrega." |
| 8 | A | **Meus fretes** → **Pagar frete** *(não recarregar a página)* | "O pagamento fica **retido**. A comissão de 5% da plataforma é calculada pelo servidor; o app só mostra." |
| 9 | B | **Confirmar entrega** | "Entrega confirmada: o pagamento é liberado ao motorista." |

**Se estourar o tempo**, cortem nesta ordem: passo 9 → passo 7 → a parte do cadastro ao vivo (usem a conta pronta). Os passos **1, 3, 5, 6 e 8** são os que sustentam a história (urgência, MOPP, tempo quase real, comissão).

**Opcional, 30 s (se sobrar tempo):** abrir o app no iPhone pelo Expo Go ou o PWA instalado — "o mesmo código roda no navegador e no celular".

### O que existe só na API (sem tela) — não prometam tela

Conferi `app/src/app/`: **não há telas** de chat, de certificações do motorista nem do admin (a tela do admin só avisa que não há telas para esse perfil). Isso já está pronto **no backend**, e vocês podem citar ou mostrar por requisição:

- Chat de proposta com bloqueio de contatos (`/propostas/:id/mensagens`) — responde ao risco "negociar por fora para fugir da comissão".
- Motorista envia certificação e o **admin aprova** (`/certificacoes/...`).
- Painel de monitoramento do admin (`/admin/resumo`, `/admin/fretes`, `/admin/usuarios`).

Frase honesta para o professor: "Essas três partes estão implementadas e testadas na API; as telas ficaram para a próxima etapa."

---

## 4. Por dentro do sistema — P4 (≈ 2:00)

**Arquitetura em uma frase por camada**
- **Banco:** PostgreSQL + **PostGIS** (Neon) — responde "qual carga está perto de mim?" dentro do próprio banco (`ST_DWithin`), com 11 tabelas e `ENUM`s (`database/schema.sql`, `database/modelo_er.png`).
- **API:** Node.js + TypeScript, monólito modular, em rotas por assunto (Render) — contrato em `docs/api.md`.
- **App:** Expo (React Native + react-native-web); um código só no navegador (Vercel) e no iPhone.

**Três decisões para citar** (`docs/decisoes-backend.md`)
1. **Dinheiro em centavos inteiros**, não `float`: `0.1 + 0.2` não dá `0.3`. A comissão de 5% é calculada sobre centavos e testada (`backend/src/frete-regras.ts`).
2. **Concorrência:** duas empresas aceitando propostas da mesma carga ao mesmo tempo não criam dois fretes — a rota usa transação com `SELECT ... FOR UPDATE`.
3. **Pagamento retido até a entrega**, na mesma transação do banco que muda o status do frete (ou as duas coisas acontecem, ou nenhuma). É simulado: não há gateway.

**Qualidade e equipe** (30 s): testes dos dois lados e CI no GitHub Actions; commits de todos os membros, branches e PRs.

**Limites conhecidos** (falem antes que perguntem): pagamento simulado; só o motorista confirma a entrega (próximo passo: código de entrega); servidor gratuito "dorme" no primeiro acesso.

---

## 5. Fechamento — P1 (≈ 0:30)

> "Resumindo: o Backhaul reduz o retorno vazio e ajuda empresas com pressa a achar transporte, com foco em **urgência e proximidade**. Já temos o fluxo completo funcionando — da disponibilidade ao pagamento liberado. Obrigado! Ficamos à disposição para perguntas."

---

## Antes de subir (quem faz o quê)

- [ ] **P4:** acordar a API minutos antes: `curl https://backhaul-api.onrender.com/saude` (a primeira chamada leva ~50 s). Repetir 5 min antes de entrar.
- [ ] **P4:** conferir que o seed de demo foi rodado e que as contas entram no site publicado, e que o **CORS** do Render aceita `https://backhaul-front.vercel.app`. No `roteiro-demo.md`/`STATUS.md` isso estava como **pendência bloqueante** em 23/10; confirmem se foi resolvido, não presumam.
- [ ] **P2:** duas janelas em **perfis de navegador diferentes** (empresa e motorista), já abertas na URL de produção. Notificações desligadas, zoom do projetor em 125–150%.
- [ ] **P2:** contas e senhas **fora do repositório** (papel ou bloco de notas local), mais uma lista de e-mails/CPFs não usados para o cadastro ao vivo.
- [ ] **P3:** **vídeo de backup** baixado no notebook (abre sem internet) e hotspot do celular testado.
- [ ] **Todos:** ensaiar **2 vezes seguidas**, cronometrando. Cada bloco tem que caber no seu tempo.
- [ ] **Todos:** ler `docs/front/mapa-do-codigo.md` e `docs/decisoes-backend.md` — qualquer um pode ser sorteado para o Live Code.

## Plano B

| Problema | O que fazer |
|---|---|
| Servidor dormindo ("Conectando ao servidor") | Usem como fala: "plano gratuito". A tela libera sozinha; se passar de 90 s, **Tentar de novo**. |
| API fora ou erro de CORS | Mostrar o **vídeo de backup**; ou modo mock do navegador (`EXPO_PUBLIC_API_MOCK=msw`, ver `app/README.md`). Avisem que são dados de teste. |
| Proposta não aparece em 10 s | Botão **Atualizar** (com a aba oculta, a atualização automática para). |
| Recarregou depois de pagar | A comissão some da tela (limite conhecido, decisão registrada). Explique e siga. |
| GPS negado | Usar a cidade da lista (caminho principal da demo). |
| Cadastro ao vivo falha (409) | Usar o próximo e-mail/CPF da lista ou a conta pronta "sem MOPP". |

## Perguntas prováveis (preparem as respostas)

- **Por que PostGIS?** Distância real e busca por raio no banco, com índice, em vez de trazer tudo para o Node.
- **Como o sistema evita que negociem por fora?** Contraproposta única + chat monitorado com filtro de contatos (termo de abertura, riscos).
- **O pagamento é de verdade?** Não, é simulado: nasce `retido` e vira `liberado` quando a entrega é confirmada.
- **Por que a comissão vem da API?** Para a regra de dinheiro ficar em um lugar só, testada, e o app não poder divergir.
- **O que falta?** Telas de chat, certificações e admin; gateway de pagamento real; confirmação de entrega dos dois lados.
