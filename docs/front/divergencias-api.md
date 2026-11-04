# Divergências entre contrato, backend e front

Relatório vivo, mantido pela integração com a API. Cada rodada ganha uma seção com a data. Quem muda o backend ou o contrato atualiza a linha correspondente.

Legenda: **OK** = contrato, backend e front batem · **DIVERGE** = algo não bate · **FALTA** = o front usa e não existe · **NÃO EXISTE** = nem no contrato.

---

## 2026-11-04

**Base da comparação.** `docs/api.md` e `backend/src/` da `origin/main` em `e5d7a88` (PR #103). Branch da integração: `feat/contrato-fase6`, a partir de `chore/trazer-main` (`814ad3f`; PR #105 ainda aberto). Fontes lidas: `docs/api.md`, `backend/src/rotas/{certificacoes,propostas,admin,cadastro,login,cargas,fretes,disponibilidades}.ts`, `backend/src/validacao.ts`, `backend/src/middleware/autenticacao.ts`, `backend/src/server.ts`. Nenhuma chamada à API de produção nesta rodada; o teste de produção de 04/11 está em `docs/front/spec-fase-backend-novo.md`, seção 2.1.

### 1. Rotas da Fase 6.0 (contrato × backend × front)

| Rota | No contrato | Implementada | Front (tipo / hook) | Situação |
|---|---|---|---|---|
| `GET /certificacoes/minhas` | sim | sim | `MinhaCertificacao` / `useMinhasCertificacoes` | OK. `situacao` e `nome` batem |
| `POST /certificacoes/minhas` | sim | sim | `CorpoEnviarCertificacao` / `useEnviarCertificacao` | OK. 201 no reenvio, 409 só aprovada e vigente, 400 com as mesmas mensagens |
| `GET /certificacoes/pendentes` | sim (com `cpf` e `cnh`) | sim (com `cpf` e `cnh`) | `CertificacaoPendente` / `useCertificacoesPendentes` | DIVERGE de intenção: o backend ainda devolve `cpf` e `cnh`. O fetcher descarta os dois (`paraCertificacaoPendente`), com teste. Pedido D (P7) pendente |
| `POST /certificacoes/pendentes/:id/responder` | sim | sim | `useResponderCertificacao` | OK. 404 "certificação pendente não encontrada" (também para id inexistente) |
| `GET /propostas/:id/mensagens` | sim | sim | `Mensagem` / `useMensagens` | OK. `texto`, `remetente_id` (id do usuário), 404 para quem não participa, inclusive admin |
| `POST /propostas/:id/mensagens` | sim | sim | `useEnviarMensagem` | OK. As quatro mensagens de 400 e a de 409 batem com `validacao.ts`. Filtro de contato copiado com as mesmas expressões (`app/mocks/handlers/mensagens.ts`) |
| `GET /admin/resumo` | sim | sim | `ResumoAdmin` / `useResumoAdmin` | OK. Comissão vem da API, sem cálculo no front |
| `GET /admin/fretes` | sim | sim | `FreteAdmin` / `useFretesAdmin` | OK. `status_pagamento` e `valor_comissao` `null` antes do pagamento |
| `GET /admin/usuarios` | sim | sim | `UsuarioAdmin` / `useUsuariosAdmin` | DIVERGE de documentação: `nome` vem `null` para o admin, o contrato escreve só `nome`. Ver seção 2 |

### 2. Divergências de contrato × backend fora desta fase

| # | Rota / campo | Contrato | Backend | Front | Ação |
|---|---|---|---|---|---|
| 1 | `POST /cadastro/motorista` (409) | texto: "e-mail ou CPF já cadastrado" | `email já cadastrado` ou `cpf já cadastrado` (uma mensagem, conforme a constraint violada) | mocks `handlers/sessao.ts` e `handlers/comEstado.ts` usam o texto do contrato | Backend e contrato devem concordar. Mock a alinhar com o backend (card 037) |
| 2 | `POST /cadastro/empresa` (409) | texto: "e-mail ou CNPJ já cadastrado" | `email já cadastrado` ou `cnpj já cadastrado` | `handlers/sessao.ts` já responde `email já cadastrado` (bate com o backend) | Contrato a corrigir |
| 3 | `GET /eu`, `GET /admin/usuarios`: campo `nome` | `string` | `null` para o admin (`COALESCE` sem perfil) | `Usuario.nome: string` em `tipos.ts`. Mantido; `UsuarioAdmin.nome` já é `string \| null` | Card 038 (`Usuario.nome` nulo). Contrato a documentar `nome: string \| null` |
| 4 | `GET /propostas/minhas` | formato plano | formato plano (`chamado_carga_id`, `tipo_carga`, `frete_id` etc.) | `MinhaProposta` antigo (`disponibilidade_id`, `carga{…}`) em `tipos.ts`; `handlers/propostas.ts` responde nesse formato antigo; `comEstado.ts` responde 404 HTML | DIVERGE no front. Card 036. Não tocado nesta entrega |
| 5 | `GET /cargas/:id/propostas`, `certificacoes[].validade` | `YYYY-MM-DD` | `YYYY-MM-DD` (o `json_build_object` sobre `DATE` já sai assim) | fixture `propostas.ts` usa `2027-05-01T03:00:00.000Z` em um dos casos | OK no backend. Fixture do front a alinhar (baixa prioridade) |
| 6 | `GET /fretes/meus` | sem `proposta_id`, `origem`, `destino`, `comissao` | igual ao contrato | igual ao contrato | OK. Campos pedidos em A4 não existem no contrato nem no backend |
| 7 | Rota desconhecida e corpo grande | não descritos | 404 e 413 viram HTML (Express), 413 vira 500 | cliente trata HTML como `falha` (correto) | Pedido C. Front OK |

### 3. O front usa e não existe no backend (FALTA) e o que não existe nem no contrato (NÃO EXISTE)

| Rota | Quem usa no front | Backend | Mock | Plano B |
|---|---|---|---|---|
| `GET /disponibilidades/minhas` | `useMinhasDisponibilidades` (`disponibilidades.hooks.ts`), tela Minhas disponibilidades | **FALTA**: o `router.use(exigirAutenticacao, exigirTipo("motorista"))` responde 401 sem token e 404 HTML com token de motorista | `handlers/disponibilidades.ts` (sem estado) responde **200 com fixture**: o mock inventa a rota. `comEstado.ts` responde 404 HTML, como o backend | Disponibilidade guardada no aparelho (vigente). Pedido A3 |
| `POST /cargas/:id/cancelar` | nenhum ainda (cards 033) | **NÃO EXISTE** (nem contrato) | nenhum | nenhum. Pedido A1 |
| `POST /disponibilidades/:id/cancelar` | nenhum ainda (cards 034) | **NÃO EXISTE** (nem contrato) | nenhum | nenhum. Pedido A2 |
| `GET /fretes/meus` com `proposta_id`, `origem`, `destino`, `comissao` | cards 044 e 043 (chat a partir do frete) | **NÃO EXISTE** | nenhum | comissão só logo após pagar. Pedido A4 |
| `GET /propostas/minhas` com `origem`, `destino`, `urgencia`, `certificacao_exigida`, `carga_status`, `carga_expira_em` | card 026 | **NÃO EXISTE** | nenhum | sem "carga indisponível". Pedido A5 |
| Regras no aceite: disponibilidade vigente, recusar as outras propostas do motorista, 409 em proposta repetida | card 042 e demo | **NÃO EXISTE** | nenhum | nenhum; na demo não aceitar duas propostas do mesmo motorista. Pedido B1 |
| Status `expirado` em `GET /cargas/minhas` | cards 024 e 035 | **NÃO EXISTE** (o backend devolve `aberto` com `expira_em` vencido) | nenhum | "expirada" calculada no app pela data. Pedido B2 |

**Atenção ao pedido A3.** Os campos que `pedido-ao-diogo.md` propõe para `GET /disponibilidades/minhas` (`origem`, `raio_km`, `capacidade_kg`) não são os que o front já tipa em `DisponibilidadeDoMotorista` (`tipos.ts`). O front espera `local`, `raio_busca_km`, `urgencia`, `status`, `expira_em`, `criado_em` e `propostas_pendentes`: o formato de `POST /disponibilidades` com um campo a mais. Recomendação: propor o formato do front, para não refazer o mock e as telas.

### 4. Sugestões de texto para o contrato (não aplicadas: `docs/api.md` é do backend)

- Em `GET /admin/usuarios` e `GET /eu`: `nome` é `string | null` (null para o admin).
- Em `POST /cadastro/motorista` e `POST /cadastro/empresa`: trocar a prosa pelas mensagens reais (`email já cadastrado`, `cpf já cadastrado`, `cnpj já cadastrado`).
- Em `GET /certificacoes/pendentes`: quando o pedido D for atendido, remover `cpf` e `cnh` do exemplo.

### 5. Pendências que dependem do backend (ver `docs/front/pedido-ao-diogo.md`)

A1, A2, A3, A4, A5, B1, B2 e C seguem como estão. D (`cpf`/`cnh` na fila do admin) é a única com efeito de privacidade e já tem tratamento no front.
