# Relatório inicial da API: contrato × backend

Data: 2026-10-20 · Branch: `chore/preparacao-front` · Escopo: somente leitura do backend.

Fontes lidas: `docs/api.md` (contrato, fonte da verdade), `backend/src/rotas/*.ts`, `backend/src/server.ts`, `backend/src/middleware/autenticacao.ts`, `backend/src/perfis.ts`, `backend/src/validacao.ts`, `backend/src/env.ts`, `backend/src/db.ts`, `backend/package.json`, `backend/.env.example`, `database/schema.sql`.

Observação: não rodei `git pull` (tarefa só de leitura). A análise vale para o estado atual do checkout.

---

## 1. Tabela de rotas

Legenda: ✅ conforme · ⚠️ divergência leve · ❌ divergência que quebra ou confunde a tela.

| Rota | Auth / perfil | No contrato | Implementada | Divergência |
|---|---|---|---|---|
| `GET /saude` | público | sim | sim | ✅ 200 e 503 conforme |
| `POST /cadastro/motorista` | público | sim | sim | ✅ 201/400/409 conforme. Senha longa (>72 bytes) é truncada pelo bcrypt sem aviso (sem máximo de tamanho) |
| `POST /cadastro/empresa` | público | sim | sim | ✅ 201/400/409 conforme |
| `POST /login` | público | sim | sim | ✅ 200/401 conforme. ⚠️ 400 quando faltam campos (`{erros:[...]}`), não documentado, mas coerente |
| `GET /eu` | logado | sim | sim | ✅ corpo conforme. ⚠️ 404 `usuário não encontrado` não documentado (só ocorre se o usuário foi apagado) |
| `GET /certificacoes` | logado | sim | sim | ✅ conforme |
| `POST /cargas` | empresa | sim | sim | ✅ 201/400/401/403/404 e 400 de certificação inexistente conforme. ❌ sem limite máximo para `peso_kg`, `valor_oferecido` (NUMERIC(10,2), máx. 99.999.999,99) e sem limite de tamanho para `tipo_carga` (VARCHAR(80)): estouro vira **500** em vez de 400 |
| `GET /cargas/minhas` | empresa | sim | sim | ✅ conforme. ⚠️ carga com `expira_em` vencido continua com `status: "aberto"` (o status `expirado` nunca é gravado por ninguém) |
| `GET /cargas/proximas` | motorista | sim | sim | ✅ conforme (filtro de certificação, ordem por urgência e distância, 400 de parâmetros) |
| `POST /disponibilidades` | motorista | sim | sim | ✅ 201/400/401/403/404 conforme |
| `POST /propostas` | motorista | sim | sim | ✅ 201/400/401/403/404/409 conforme. ❌ não confere se a **disponibilidade** está `aberto` nem se não expirou (ver seção 5) ⚠️ permite duas propostas `aceite` pendentes da mesma pessoa para a mesma carga (contrato silencioso) |
| `GET /cargas/:id/propostas` | empresa dona | sim | sim | ✅ formato conforme. ⚠️ `motorista.certificacoes[].validade` é tipo DATE; o `pg` devolve como `Date` (meia-noite local), que sai no JSON como timestamp ISO com fuso (ex.: `2027-05-01T03:00:00.000Z`), e não como `"2027-05-01"` do contrato. Provável; confirmar com uma chamada real |
| `POST /propostas/:id/responder` | empresa dona | sim | sim | ✅ 200 (recusar e aceitar), 400, 404, 409 conforme, com transação e trava. ❌ aceitar não confere se a disponibilidade do motorista ainda está `aberto` (ver seção 5) |
| `GET /fretes/meus` | motorista ou empresa | sim | sim | ✅ conforme (lado oposto aparece certo para cada perfil) |
| `PATCH /fretes/:id/status` | motorista dono | sim | sim | ✅ 200/400/401/403/404/409 conforme e mensagem 409 idêntica. ⚠️ o contrato aceita `cancelado` no corpo, mas a tabela de transições nunca permite ir para `cancelado`: sempre 409. A tela não deve oferecer cancelar frete |
| `POST /fretes/:id/pagamento` | empresa dona | sim | sim | ✅ 201/400/401/403/404/409 conforme. Comissão 5% em centavos, arredondamento correto |

Rotas do contrato que **não existem**: nenhuma. Todas as 16 rotas de `docs/api.md` estão implementadas. Rotas que o front precisa e não existem: seção 4.

---

## 2. Formato de erros

| Código | Contrato | Backend | Situação |
|---|---|---|---|
| 400 | `{ "erros": [...] }` | `{ erros: [...] }` nas validações | ✅ |
| 400 | idem | JSON malformado vira `{ "erro": "JSON inválido no corpo da requisição" }` | ⚠️ formato diferente (`erro` singular). O front deve aceitar `erro` e `erros` no 400 |
| 401 | `{ "erro": "token ausente" }` | `token ausente` (sem Bearer) e `token inválido ou expirado` (assinatura ou validade) | ✅ (a segunda mensagem não está no contrato, mas o código é o mesmo) |
| 403 | `{ "erro": "..." }` | `acesso negado para este tipo de usuário` e `motorista sem a certificação exigida` | ✅ |
| 404 | `{ "erro": "..." }` | várias mensagens | ✅ |
| 409 | `{ "erro": "..." }` | idem | ✅ |
| 500 | `{ "erro": "erro interno" }` | handler global de `server.ts` | ✅ detalhe só no log |
| 404 rota inexistente | não especificado | HTML padrão do Express (`Cannot GET /x`) | ⚠️ não é JSON; o front deve tratar resposta não-JSON |
| 413 corpo grande demais | não especificado | cai no handler global e vira **500** | ⚠️ deveria ser 413 (baixa prioridade) |

Recomendação para o front: tratar qualquer resposta, lendo `erro` ou `erros` e usando mensagem genérica se o corpo não for JSON.

---

## 3. CORS e expiração do token

### CORS (`backend/src/server.ts` linhas 22-30, `.env.example`)

- A variável `CORS_ORIGIN` é lida em `process.env.CORS_ORIGIN`, dividida por vírgula, com `trim` e sem entradas vazias.
- `cors({ origin: lista })` com a lista de origens. Se a lista estiver vazia (variável ausente ou em branco), o código usa `origin: false`, que **não libera nenhuma origem, nem localhost**.
- O comentário do código (linhas 931-933) diz que `true` libera qualquer site, mas o código nunca usa `true`. O comentário está enganoso e não há modo "libera tudo".
- Não há diferença entre desenvolvimento e produção: o `.env.example` já traz `CORS_ORIGIN=http://localhost:8081`. Em produção (Render), a variável precisa estar no painel. Se não estiver, o web falha com erro de CORS e o app nativo não é afetado.
- A comparação é de string exata: esquema + host + porta, sem barra final. `http://127.0.0.1:8081` não é `http://localhost:8081`. Se o Expo Web subir em outra porta (ex.: 8082 ou 19006), é preciso adicioná-la.
- Métodos: o `cors` padrão já inclui `PATCH`, `POST`, `GET`. Cabeçalhos: reflete o que o navegador pedir, então `Authorization` e `Content-Type` passam. O preflight (OPTIONS) é respondido antes das rotas. Não há `credentials`, o que está certo porque o token vai no cabeçalho.
- CORS só vale para o navegador. Curl e app nativo não são bloqueados.

### Expiração do token (`autenticacao.ts`)

- Validade fixa de **7 dias** (`expiresIn: "7d"`). Não há refresh token, nem rota de logout (logout é só apagar o token no front).
- `exigirAutenticacao` confere assinatura e `exp`. Se `JWT_SECRET` faltar, o servidor nem sobe.
- ❌ O token não é revalidado no banco a cada chamada. Um usuário desativado (`ativo = false`) só é barrado no próximo login; quem já tem token mantém acesso até 7 dias. Hoje não há rota que desative usuário, então o risco é baixo, mas o front não deve contar com desativação imediata.
- Se o usuário for apagado, `GET /eu` responde 404; as outras rotas podem responder 404 ou 403 conforme o caso.

---

## 4. Rotas que o front provavelmente precisa e não existem (propostas de contrato)

### (a) GET /propostas/minhas (motorista)

- **Auth:** Bearer, só motorista.
- **Request:** sem corpo. Query opcional `?status=pendente|aceita|recusada` (opcional).
- **Response 200:**
```json
{ "propostas": [ {
    "id": "uuid", "tipo": "contraproposta", "valor_proposto": 3200.00, "status": "pendente",
    "criado_em": "2026-10-14T19:00:00.000Z",
    "disponibilidade_id": "uuid",
    "carga": {
      "id": "uuid", "tipo_carga": "Produtos inflamáveis", "empresa": "Transportes Rápidos LTDA",
      "origem": { "lat": -18.9186, "lng": -48.2772 }, "destino": { "lat": -19.7469, "lng": -47.9319 },
      "valor_oferecido": 3500.00, "urgencia": "urgente", "status": "aberto",
      "certificacao_exigida": "MOPP - Classe 3 Inflamáveis", "expira_em": "2026-10-16T18:00:00.000Z"
} } ] }
```
- Ordem: `criado_em` DESC. Lista vazia: `{ "propostas": [] }`.
- **Erros:** 401 sem token · 403 não é motorista · 404 `perfil de motorista não encontrado`.
- Observação: incluir `carga.status` e `carga.expira_em` permite à tela mostrar "carga fechou" sem outra chamada.

### (b) GET /disponibilidades/minhas (motorista)

- **Auth:** Bearer, só motorista.
- **Request:** sem corpo.
- **Response 200:**
```json
{ "disponibilidades": [ {
    "id": "uuid", "local": { "lat": -18.9186, "lng": -48.2772 }, "raio_busca_km": 80,
    "urgencia": "urgente", "status": "aberto", "expira_em": "2026-10-16T18:00:00.000Z",
    "criado_em": "2026-10-14T19:00:00.000Z", "propostas_pendentes": 1
} ] }
```
- Ordem: `criado_em` DESC. Lista vazia: `{ "disponibilidades": [] }`.
- `status` deve sair como `expirado` quando `status = 'aberto'` e `expira_em <= now()`, porque o banco nunca grava `expirado`. Sugestão: o backend calcula isso no SELECT (`CASE`), para o front não precisar comparar datas.
- **Erros:** 401 · 403 não é motorista · 404 perfil de motorista não encontrado.

### (c) Cancelar / encerrar a própria carga e a própria disponibilidade

Duas rotas. "Encerrar" e "cancelar" são a mesma operação para o front.

**C1. Cancelar carga (empresa)**
- `POST /cargas/:id/cancelar` · **Auth:** Bearer, só empresa dona · **Request:** sem corpo.
- **Efeito (mesma transação, com trava na carga como em `POST /propostas/:id/responder`):** `chamados_carga.status` vira `cancelado`; propostas `pendente` da carga viram `recusada`.
- **Response 200:** `{ "carga": { "id": "uuid", "status": "cancelado" } }`
- **Erros:** 400 id inválido · 401 · 403 não é empresa · 404 `carga não encontrada` (também para carga de outra empresa) · 409 `carga não está aberta` (se já estiver `fechado`, `cancelado` ou expirada por data; carga fechada tem frete e não pode ser cancelada por esta rota).

**C2. Cancelar disponibilidade (motorista)**
- `POST /disponibilidades/:id/cancelar` · **Auth:** Bearer, só motorista dono · **Request:** sem corpo.
- **Efeito (mesma transação):** `chamados_disponibilidade.status` vira `cancelado`; propostas `pendente` feitas com ela viram `recusada` (confirmar com o backend se prefere `expirada`).
- **Response 200:** `{ "disponibilidade": { "id": "uuid", "status": "cancelado" } }`
- **Erros:** 400 id inválido · 401 · 403 não é motorista · 404 `disponibilidade não encontrada` (também para disponibilidade de outro motorista) · 409 `disponibilidade não está aberta`.

**Opcional C3. Retirar a própria proposta (motorista):** `POST /propostas/:id/cancelar`, só se `pendente` e do motorista dono. 200 `{ "proposta": { "id", "status": "recusada" } }`. Erros: 404, 409 `proposta já está <status>`.

### (d) Motorista informar certificações MOPP/ONU e admin aprovar

Hoje a tabela `motorista_certificacoes` existe, mas não há rota para preenchê-la nem para aprovar. Só dá para fazer por SQL. Sem isso, nenhum motorista consegue pegar carga com certificação exigida.

**D1. Listar as próprias certificações (motorista)**
- `GET /motorista/certificacoes` · Bearer, só motorista.
- **200:** `{ "certificacoes": [ { "id": "uuid", "certificacao_id": "uuid", "nome": "MOPP - Classe 3 Inflamáveis", "classificacao_onu": "3", "numero_certificado": "MOPP-123456", "validade": "2027-05-01", "validado_por_admin": false, "criado_em": "2026-10-14T19:00:00.000Z" } ] }`
- Lista vazia: `[]`. `validade` como `YYYY-MM-DD`, sugerido via `to_char(validade, 'YYYY-MM-DD')` no SQL (ver divergência da seção 1).
- **Erros:** 401 · 403 não é motorista · 404 perfil não encontrado.

**D2. Cadastrar certificação (motorista)**
- `POST /motorista/certificacoes` · Bearer, só motorista.
- **Request:** `{ "certificacao_id": "uuid (de GET /certificacoes)", "numero_certificado": "MOPP-123456", "validade": "2027-05-01" }`
- Regras: `certificacao_id` UUID existente (senão 400); `numero_certificado` obrigatório, até 60 caracteres; `validade` data `YYYY-MM-DD` no futuro. `validado_por_admin` é sempre `false` no cadastro.
- **Response 201:** `{ "certificacao": { ...mesmos campos de D1 } }`
- **Erros:** 400 dados inválidos ou certificação inexistente · 401 · 403 · 404 perfil · 409 `certificação já cadastrada` (a tabela tem UNIQUE motorista+certificação; para alterar, usar D3).

**D3. Atualizar certificação (motorista)**
- `PUT /motorista/certificacoes/:id` · Bearer, só o motorista dono · **Request:** `{ "numero_certificado": "...", "validade": "2028-01-01" }`
- Efeito: volta `validado_por_admin` para `false` (nova aprovação necessária).
- **Response 200:** `{ "certificacao": { ... } }` · **Erros:** 400 · 401 · 403 · 404 (também para certificação de outro motorista).

**D4. Listar certificações para aprovação (admin)**
- `GET /admin/certificacoes?status=pendente|aprovada` · Bearer, só `admin` · padrão `pendente`.
- **200:** `{ "certificacoes": [ { "id": "uuid", "motorista": { "id": "uuid", "nome_completo": "João da Silva" }, "certificacao": { "id": "uuid", "nome": "MOPP - Classe 3 Inflamáveis" }, "numero_certificado": "MOPP-123456", "validade": "2027-05-01", "validado_por_admin": false, "criado_em": "2026-10-14T19:00:00.000Z" } ] }`
- **Erros:** 401 · 403 não é admin.

**D5. Aprovar ou reprovar certificação (admin)**
- `PATCH /admin/certificacoes/:id` · Bearer, só admin · **Request:** `{ "validado_por_admin": true }` (ou `false`)
- **Response 200:** `{ "certificacao": { ... } }` · **Erros:** 400 campo inválido · 401 · 403 · 404.
- Efeito: `GET /cargas/proximas` e `POST /propostas` já checam `validado_por_admin = TRUE` e `validade >= hoje`. Nenhuma mudança necessária nelas.

**Observação:** o tipo `admin` existe no banco, mas não há rota para criar admin nem login especial. Precisa decidir como o admin nasce (seed/SQL é o caminho mais simples).

### (e) Opcionais

**E1. Chat da negociação (proposta)**
- `GET /propostas/:id/mensagens`: Bearer, participante (motorista dono da disponibilidade ou empresa dona da carga). Não participante vê 404 `proposta não encontrada`. **200:** `{ "mensagens": [ { "id": "uuid", "remetente_id": "uuid", "conteudo": "Chego às 8h", "sinalizado_moderacao": false, "criado_em": "..." } ] }`, ordem ASC.
- `POST /propostas/:id/mensagens`: Bearer, participante. **Request:** `{ "conteudo": "texto de 1 a 1000 caracteres" }`. **201:** `{ "mensagem": { ...mesmos campos } }`. **Erros:** 400 conteúdo vazio ou longo · 404 · 409 `proposta não está em negociação` (`recusada` ou `expirada`).
- Regra de moderação (schema): mensagem com telefone, e-mail ou link vira `sinalizado_moderacao: true`. Decidir se bloqueia ou só marca. Recomendação: só marca.
- Sem tempo real: a tela faz polling.

**E2. Painel admin (mínimo)**
- `GET /admin/mensagens?sinalizadas=true&revisado=false` · admin · lista de mensagens para revisão.
- `PATCH /admin/mensagens/:id` · admin · `{ "revisado_por_admin": true }` · 200.
- `GET /admin/usuarios?tipo=motorista|empresa` · admin · lista com `ativo`.
- `PATCH /admin/usuarios/:id` · admin · `{ "ativo": false }` · 200. Para isso valer de imediato, `exigirAutenticacao` precisaria consultar `ativo` no banco (hoje não consulta, ver seção 3).

---

## 5. Lacunas de regra de negócio (contrato silencioso, banco permite)

Estas não são divergências com o contrato, mas o front vai esbarrar nelas:

1. **Uma disponibilidade pode virar dois fretes.** `POST /propostas` não confere se a disponibilidade está `aberto` nem se não expirou. `POST /propostas/:id/responder` (aceitar) também não confere. Se o motorista tiver propostas pendentes em duas cargas com a mesma disponibilidade, ao aceitar as duas o motorista fica com dois fretes. Sugestão: checar `chamados_disponibilidade.status = 'aberto' AND expira_em > now()` nas duas rotas, com 409 `disponibilidade não está mais aberta`.
2. **Carga e disponibilidade expiradas continuam com `status: "aberto"`** em `GET /cargas/minhas` e na listagem da disponibilidade. Ver (b) e sugerir o mesmo cálculo para cargas.
3. **`fretes.status_entrega = 'cancelado'`** existe no enum e no contrato, mas nunca é alcançável (ver tabela).
4. **Propostas `aceite` duplicadas** do mesmo motorista para a mesma carga são permitidas. Decidir se é bug ou se a contraproposta única deve valer também para aceite.
5. **`validacao.ts` sem limite de tamanho** em `nome_completo` (150), `cnh` (20), `veiculo_tipo` (50), `veiculo_placa` (10), `razao_social` (150), `email` (150) e `tipo_carga` (80). Estouro dos VARCHAR vira 500. Também faltam limites máximos para `capacidade_kg`, `peso_kg` e `valor_oferecido`.

---

## 6. Faltas gerais (além das rotas acima)

- **Cidades / coordenadas:** não há endpoint nem tabela de cidades. A tela precisa de lat/lng para origem e destino. Opções: (1) lista estática de cidades com coordenadas dentro do front (mais rápido, sem backend); (2) tabela `cidades` + `GET /cidades?q=uberlandia&uf=MG` (exige migration). Geocodificação externa exigiria chave de API. Decisão do time.
- **Detalhe de carga:** `GET /cargas/:id` não existe. Com (a) pronto, a tela de propostas já tem os campos da carga; não é urgente.
- **Notificações:** nenhuma. A tela vai ter que fazer polling em `/fretes/meus`, `/cargas/minhas` e `/propostas/minhas`.
- **Status `expirado` e `em_negociacao`:** o enum existe, mas nenhum código grava. Ou um job do banco/servidor grava, ou o backend calcula na leitura (ver seção 4b).
- **Logout e revogação:** não existem; token dura 7 dias (ver seção 3).
- **Edição de perfil** (`nome`, veículo, capacidade): sem rota. Não é bloqueante.
- **Log de auditoria:** `logs_auditoria` existe no banco, mas nenhuma rota grava nele.

---

## 7. Próximos passos sugeridos

1. Repassar ao Diogo as propostas (a), (b), (c1), (c2), (d1 a d5). São as que destravam as telas do motorista e da empresa.
2. Pedir correção de: 500 por estouro de tamanho/valor (seção 5.5), pg DATE em `validade` (seção 1), 409 para disponibilidade não aberta em propostas e aceite (seção 5.1), e comentário de CORS enganoso.
3. Confirmar com chamada real: formato de `validade` em `GET /cargas/:id/propostas`.
4. Decidir cidades (seção 6) e como o admin é criado.
5. Front: configurar `EXPO_PUBLIC_API_URL`, tratar 400 com `erro` ou `erros`, e cadastrar a origem do Expo Web em `CORS_ORIGIN` no ambiente local e no Render.
