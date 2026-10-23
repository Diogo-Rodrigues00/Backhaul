# Documentação do front-end (app Expo)

Índice dos documentos do app que fica em [`../../app`](../../app). Para rodar o app: [`../../app/README.md`](../../app/README.md). Documentos do projeto inteiro (API, banco, cronograma, atas) estão no fim desta página.

## Por onde começar

| Quero... | Leia |
|---|---|
| Rodar o app e entender a estrutura | [`app/README.md`](../../app/README.md) |
| Saber onde está a resposta de uma pergunta técnica | [`mapa-do-codigo.md`](mapa-do-codigo.md) |
| Ensaiar e apresentar a demo (29/10 e 12/11) | [`roteiro-demo.md`](roteiro-demo.md) |
| Entender o produto e o escopo | [`prd.md`](prd.md), [`mvp.md`](mvp.md) |
| Ver o estado do trabalho | [`STATUS.md`](STATUS.md) (última atualização em 20/10; o estado dos cards está em `git log origin/front` e [`cards/README.md`](cards/README.md)) |

## Produto

| Documento | Conteúdo |
|---|---|
| [`prd.md`](prd.md) | Problema, personas, jornadas (inclui a jornada da demo, §4.3), requisitos, riscos, dependências do backend |
| [`mvp.md`](mvp.md) | Backlog ordenado MVP-01 a MVP-28 com critérios de aceite e critérios transversais (CT-01 a CT-10) |
| [`decisoes.md`](decisoes.md) | Registro das decisões fechadas, com data e origem |
| [`STATUS.md`](STATUS.md) | Fases, pendências e ações do Pedro |
| [`roteiro-demo.md`](roteiro-demo.md) | Roteiro de 10 min, demonstração em 2 janelas, plano B, checklist de ensaio, quadro de contas (sem credenciais) |

## Técnico

| Documento | Conteúdo |
|---|---|
| [`arquitetura.md`](arquitetura.md) | Árvore de pastas, rota → tela → card, fluxo de dados, rotas da API usadas, tabela design system → código |
| [`mapa-do-codigo.md`](mapa-do-codigo.md) | Perguntas prováveis da banca e o arquivo/linha de cada resposta |
| [`relatorio-api-inicial.md`](relatorio-api-inicial.md) | Contrato × backend em 20/10, divergências e propostas de rotas novas (4a, 4b, 4c, 4d) |
| [`design-system.md`](design-system.md) | Tokens, componentes, estados e regras visuais |
| [`identidade/`](identidade/) | Logotipos e símbolo em SVG |
| [`prototipos/index.html`](prototipos/index.html) | Cópia local do protótipo; versão aprovada: <https://claude.ai/artifact/VDeLDcq1BYMsMwfJVEV6sP> |

### ADRs (decisões de arquitetura)

| ADR | Tema |
|---|---|
| [0001](adr/0001-expo-sdk-e-versoes.md) | Expo SDK 57 e versões; bibliotecas proibidas |
| [0002](adr/0002-roteamento-expo-router.md) | Roteamento com expo-router e site estático |
| [0003](adr/0003-estrutura-atomic-design.md) | Pastas, atomic design, convenções |
| [0004](adr/0004-dados-do-servidor.md) | Dados do servidor com TanStack Query |
| [0005](adr/0005-camada-api-erros-mocks.md) | Cliente HTTP, erros, portão do servidor, mocks |
| [0006](adr/0006-sessao-e-token.md) | Sessão e armazenamento do token |
| [0007](adr/0007-formularios-e-validacao.md) | Formulários e validação |
| [0008](adr/0008-temas-e-tokens.md) | Tema claro/escuro, tokens, fonte, responsivo |
| [0009](adr/0009-acessibilidade-no-expo.md) | Acessibilidade na web e no iPhone |
| [0010](adr/0010-atualizacao-automatica.md) | Atualização automática (polling) |
| [0011](adr/0011-performance-e-lighthouse.md) | Performance, orçamento de bundle, Lighthouse |
| [0012](adr/0012-testes.md) | Estratégia de testes |
| [0013](adr/0013-ci-e-portoes.md) | CI e portões do PR |
| [0014](adr/0014-deploy-vercel-e-pwa.md) | Deploy na Vercel e PWA |
| [0015](adr/0015-formatacao-pt-br-e-textos.md) | Formatação pt-BR e textos |

## Cards

[`cards/README.md`](cards/README.md) traz a tabela de cards, ondas e caminho crítico. Cada card tem a sua spec em `cards/NNN-slug.md` (001 a 035). Os cards 031 a 035 são "se der".

## Documentos do projeto (fora do front)

| Documento | Conteúdo |
|---|---|
| [`../api.md`](../api.md) | Contrato da API (fonte da verdade entre backend e telas) |
| [`../termo_abertura.md`](../termo_abertura.md) | Justificativa, escopo, riscos, equipe |
| [`../cronograma.md`](../cronograma.md) | Datas, regras do curso, critérios de nota, papéis |
| [`../atas/`](../atas/) | Atas semanais |
| [`../../database/`](../../database/) | `schema.sql`, `seed.sql`, diagrama ER |
| [`../../backend/README.md`](../../backend/README.md) | Como rodar e usar a API |
