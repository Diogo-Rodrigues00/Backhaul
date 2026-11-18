# Guia de estudo para a defesa do Backhaul

Para cada pergunta: **resposta curta** (diga isto primeiro) e **onde está no código** (abra se pedirem para mostrar).

## 1. O projeto em 30 segundos
Plataforma que conecta caminhoneiros que estão voltando vazios (retorno) a empresas com carga urgente, parecido com o Uber. A plataforma ganha **5% de comissão** por frete entregue. Stack: Node.js + TypeScript (Express 5), PostgreSQL com PostGIS (Neon), app em React Native/Expo (web na Vercel), API no Render, pagamento Pix pelo Asaas (sandbox).

## 2. Perguntas sobre arquitetura
**Por que um monólito modular e não microsserviços?** Equipe pequena, prazo curto, um banco só e transações simples. Microsserviços trariam complexidade de rede e consistência sem ganho. Os módulos (`rotas/`, `pagamentos/`, `validacao.ts`) deixam a separação pronta para o futuro. → `backend/src/`

**Por que PostgreSQL e não MongoDB?** Os dados são relacionais (usuário, carga, proposta, frete, transação) e o dinheiro exige transação ACID. Além disso, o **PostGIS** resolve a busca por proximidade dentro do banco. → `database/schema.sql`

**Como a API é organizada?** Cada área tem um arquivo de rotas, e os middlewares (`exigirAutenticacao`, `exigirTipo`) protegem por perfil. → `rotas/`, `middleware/autenticacao.ts`

## 3. Banco de dados e PostGIS
**Como encontram cargas perto do motorista?** `ST_DWithin` com colunas `GEOGRAPHY` (a unidade é metro, então `raio_km * 1000`), com índice GiST. A ordem é urgência (crítico, urgente, normal) e depois a distância. → `rotas/cargas.ts`, `GET /cargas/proximas`

**Por que `ST_DWithin` e não `ST_Distance < raio`?** O `ST_DWithin` usa o índice espacial; o `ST_Distance` calcularia a distância para todas as linhas.

**Por que `ST_MakePoint(lng, lat)`?** O PostGIS usa (x, y) = (longitude, latitude). Inverter é um erro clássico.

**Por que valores de ENUM em minúsculo e sem acento?** Padrão do projeto, para evitar problemas de comparação e de integração. → `CLAUDE.md`, `schema.sql`

**Por que o dinheiro é `NUMERIC` e não `float`?** O float acumula erro de arredondamento. No código, os cálculos de comissão e repasse são feitos em **centavos inteiros** e só viram reais na borda com o Asaas. → `frete-regras`, `pagamentos/asaas.ts`

**Por que não apagam usuário?** `fretes` e `transacoes` têm `ON DELETE RESTRICT` de propósito: o histórico financeiro precisa ficar guardado. A solução é **desativar** (`usuarios.ativo`). → `PATCH /admin/usuarios/:id/ativo`

## 4. Segurança
**Como guardam senha?** Hash com **bcrypt** (bcryptjs), nunca texto puro. → `rotas/cadastro.ts`, `rotas/login.ts`

**Como funciona a autenticação?** Login devolve um **JWT** assinado com `JWT_SECRET`, válido por 7 dias. O token carrega só id e tipo. Qualquer um lê um JWT, mas ninguém altera sem a chave. → `middleware/autenticacao.ts`

**E se desativarem um usuário com token válido?** O middleware consulta `ativo` no banco a cada chamada e devolve 401 na hora.

**401 ou 403?** 401 = "não sei quem você é"; 403 = "sei, mas você não pode isso".

**Como evitam SQL injection?** Todas as consultas usam parâmetros (`$1`, `$2`), nunca concatenação de texto.

**Como protegem o webhook do Asaas?** Cabeçalho `asaas-access-token` comparado com `timingSafeEqual` (evita ataque por tempo). Sem token configurado: 503. Token errado: 401. → `rotas/webhooks.ts`

**Segredos?** Só em variáveis de ambiente do Render. O `.env` não vai para o Git. O repositório é público.

## 5. Pagamento (a parte mais cobrada)
**Como funciona o pagamento?** A empresa paga por Pix, o dinheiro fica **retido** na plataforma e só é **liberado** ao motorista na entrega, descontados os 5%. Estados: `pendente`, `retido`, `liberado` e `estornado`. → `docs/pagamentos.md`

**O que é o modo simulado?** A mesma interface `ProvedorPagamento` com duas implementações: `simulado` e `asaas`. `PAGAMENTOS_MODO` escolhe qual. Há ainda `PAGAMENTOS_REPASSE=simulado`: cobrança e webhook reais, só o repasse simulado. Isso mostra desacoplamento. → `pagamentos/index.ts`

**Por que o repasse está simulado?** O sandbox do Asaas passou a recusar transferências e a geração de QR Code com "erro desconhecido" a partir de 14/11, mesmo com payload mínimo. Cobrança, recebimento e webhook foram testados de ponta a ponta nos dias 13 e 14. Em produção seria preciso CNPJ.

**O que é idempotência e onde usam?** Repetir a mesma operação não duplica o efeito. O Asaas pode reenviar um webhook; `eventos_pagamento` tem `UNIQUE(gateway, evento_id)` e `registrarEvento` ignora o repetido. Pedir pagamento de novo com o Pix pendente devolve a mesma cobrança. → `pagamentos/eventos.ts`

**Como evitam dois aceites ao mesmo tempo?** Transação com `SELECT ... FOR UPDATE` trava a carga; a segunda aceitação espera a primeira e recebe 409. → `rotas/propostas.ts`

**E se o gateway falhar na entrega?** O repasse é pedido dentro da transação do banco. Se o gateway recusar, o frete continua em trânsito e o motorista tenta de novo (502 com rollback).

**Quanto custa o Pix para vocês?** No sandbox, cerca de R$ 0,99 por Pix recebido; transferência sem custo. Entra na conta de viabilidade da comissão de 5%.

## 6. Fluxo de negócio
Empresa publica carga, motorista publica disponibilidade, motorista faz proposta (aceita o valor ou contraproposta, uma por carga), empresa aceita e o frete nasce, empresa paga, motorista inicia transporte, entrega, pagamento liberado. Aceitar fecha a carga e a disponibilidade e recusa as outras propostas pendentes. → `rotas/propostas.ts`, `rotas/fretes.ts`

**Como tratam urgência?** Enum `normal`, `urgente` e `critico`. A busca ordena por urgência antes da distância.

**Cargas perigosas?** Exigem certificação (ex.: MOPP) aprovada pelo admin e dentro da validade, conferida na busca e no aceite.

## 7. Qualidade e entrega
**Como testam?** Testes automatizados (`node:test` + `tsx`) para validação, regras de frete e pagamentos; a CI no GitHub Actions roda `tsc --noEmit` e os testes em todo PR. O front tem testes de componente e E2E.

**Como trabalham em equipe?** Branches por tarefa, PR com CI verde, commits em português (`feat:`, `fix:`, `docs:`). Diogo: banco e API; Pedro: front.

## 8. Perguntas difíceis (responda com honestidade)
- **"Dá para entregar sem pagar?"** Com o gateway ligado, não (409). No modo simulado da demo a regra é mais permissiva. → `rotas/fretes.ts`
- **"Como sabem que a carga foi entregue?"** Hoje, pela confirmação do motorista. Evolução: código (PIN) de entrega com o recebedor, foto do canhoto e CT-e. → `docs/garantias-e-riscos.md`
- **"E se o motorista sumir com a carga?"** O dinheiro não é liberado sem entrega. Falta seguro e verificação de identidade (roadmap).
- **"E a LGPD?"** Coletamos o mínimo; admin não vê CPF/CNPJ nem senha; desativamos conta sem apagar histórico financeiro; anonimização seria o caminho para exclusão de dados pessoais.
- **"Escala?"** Índices GiST, consultas parametrizadas, API sem estado (JWT), mas o Render free dorme e o Neon é gratuito; em produção seriam instâncias fixas e fila para webhooks.
- **"Por que não usaram Uber/99 ou apps de frete existentes?"** Diferencial: foco no **retorno vazio** e na **urgência** como critério de ordenação.
- **"O que não está pronto?"** Pix em produção (CNPJ), prova de entrega, disputa, notificações em tempo real, rastreamento, chat com tempo real (hoje é consulta periódica).

## 9. Se pedirem para mostrar o código
1. `database/schema.sql` (tabelas e ENUMs).
2. `backend/src/rotas/cargas.ts` (`/proximas`: PostGIS).
3. `backend/src/rotas/propostas.ts` (aceite: transação e `FOR UPDATE`).
4. `backend/src/pagamentos/` (interface e eventos idempotentes).
5. `docs/api.md` (contrato) e `docs/garantias-e-riscos.md`.
