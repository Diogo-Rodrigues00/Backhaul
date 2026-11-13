# Contrato da API — Backhaul

Este arquivo é o combinado entre o backend e as telas. **Quem quiser mudar uma rota avisa o grupo antes** e atualiza este arquivo no mesmo commit.

- **URL base (local):** `http://localhost:3000`
- **URL base (produção):** `https://backhaul-api.onrender.com` (no plano grátis, a primeira chamada depois de um tempo parado demora ~50 s)
- **Formato:** JSON nas duas direções (`Content-Type: application/json`).
- **Autenticação:** depois do login, enviar o token em todas as rotas protegidas:
  `Authorization: Bearer <token>`. O token vale 7 dias.
- **CORS:** só importa para quem chama a API **pelo navegador** (Expo Web, painel web). O app nativo não é afetado. Em produção, só as origens listadas na variável `CORS_ORIGIN` do servidor são aceitas; se a sua tela web receber erro de CORS, peça para incluírem a origem dela (ex.: `http://localhost:8081`).
- **Legenda:** ✅ já implementada · 🔜 planejada (contrato proposto, ainda não existe no servidor).

## Erros (formato padrão)

| Código | Quando | Corpo |
|---|---|---|
| 400 | Dados inválidos | `{ "erros": ["email inválido", "cpf deve ter 11 dígitos"] }` |
| 401 | Sem token, token inválido/expirado ou login errado | `{ "erro": "token ausente" }` |
| 403 | Usuário logado, mas o tipo dele não pode usar a rota | `{ "erro": "..." }` |
| 404 | Item não encontrado | `{ "erro": "..." }` |
| 409 | Valor repetido (e-mail, CPF ou CNPJ) ou conflito de estado (carga fechada, proposta já respondida, contraproposta repetida, transição de status de frete inválida, frete já pago, mensagem em proposta recusada/expirada) | `{ "erro": "cnpj já cadastrado" }` |
| 500 | Falha interna (o detalhe fica só no log do servidor) | `{ "erro": "erro interno" }` |

---

## ✅ Rotas já implementadas

### GET /saude
Confere se o servidor e o banco estão no ar.
- **200:** `{ "status": "ok", "banco": "conectado" }`
- **503:** `{ "status": "erro", "banco": "indisponivel" }` — a API está no ar, mas o banco não respondeu (o detalhe fica só no log).

### POST /cadastro/motorista
Cria o usuário (tipo `motorista`) e o perfil de motorista.

Corpo:
```json
{
  "email": "joao@exemplo.com",
  "senha": "minimo8caracteres",
  "nome_completo": "João da Silva",
  "cpf": "529.982.247-25",
  "cnh": "11122233344",
  "veiculo_tipo": "carreta",
  "veiculo_placa": "ABC1D23",
  "capacidade_kg": 15000
}
```
- **201:** `{ "usuario": { "id": "uuid", "email": "joao@exemplo.com", "tipo": "motorista", "criado_em": "2026-10-14T19:00:00.000Z" } }`
- **400** dados inválidos · **409** e-mail ou CPF já cadastrado.
- CPF aceita pontuação (ela é removida antes de salvar) e precisa ter os **dígitos verificadores corretos** (400 `"cpf inválido"` caso contrário). `veiculo_placa` aceita `ABC1234` ou `ABC1D23` (Mercosul), com ou sem hífen, e é salva em maiúsculas sem hífen. A senha nunca volta na resposta.

### POST /cadastro/empresa
Cria o usuário (tipo `empresa`) e o perfil de empresa.

Corpo:
```json
{
  "email": "contato@transportesrapidos.com",
  "senha": "minimo8caracteres",
  "razao_social": "Transportes Rápidos LTDA",
  "cnpj": "11.222.333/0001-81"
}
```
- **201:** `{ "usuario": { "id", "email", "tipo": "empresa", "criado_em" } }`
- **400** dados inválidos · **409** e-mail ou CNPJ já cadastrado.
- O CNPJ também precisa ter os dígitos verificadores corretos (400 `"cnpj inválido"`).

### POST /login
Corpo: `{ "email": "joao@exemplo.com", "senha": "minimo8caracteres" }`
- **200:** `{ "token": "eyJ...", "tipo": "motorista" }` — guardar o token e enviar nas próximas chamadas.
- **401:** `{ "erro": "email ou senha inválidos" }` (a mesma mensagem vale para e-mail inexistente e senha errada).

### GET /eu 🔒
Devolve os dados de quem está logado (serve para a tela inicial e para saber o tipo de usuário).
- **200:**
```json
{ "usuario": { "id": "uuid", "email": "joao@exemplo.com", "tipo": "motorista",
               "ativo": true, "criado_em": "2026-10-14T19:00:00.000Z", "nome": "João da Silva" } }
```
- **401** sem token ou token inválido.

### GET /certificacoes 🔒
Lista as certificações (MOPP/ONU) para preencher formulários. Qualquer usuário logado pode usar. Ordem alfabética por nome.
- **200:** `{ "certificacoes": [ { "id": "uuid", "nome": "MOPP - Classe 3 Inflamáveis", "classificacao_onu": "3" } ] }`
- `classificacao_onu` pode ser `null`.

### GET /certificacoes/minhas 🔒 *(só motorista)*
Certificações que o motorista logado enviou, em ordem alfabética.
- **200:** `{ "certificacoes": [ { "id": "uuid", "certificacao_id": "uuid", "nome": "MOPP - Classe 3 Inflamáveis", "numero_certificado": "123456", "validade": "2027-05-01", "validado_por_admin": false, "situacao": "pendente", "criado_em": "..." } ] }`
- `situacao`: `pendente` (aguardando o admin) · `aprovada` · `vencida` (aprovada, mas fora da validade). Só `aprovada` libera cargas que exigem certificação.
- **401** · **403** usuário não é motorista · **404** usuário sem perfil de motorista.

### POST /certificacoes/minhas 🔒 *(só motorista)*
Envia uma certificação para o admin aprovar.
```json
{ "certificacao_id": "uuid (de GET /certificacoes)", "numero_certificado": "123456", "validade": "2027-05-01" }
```
- `validade`: data `AAAA-MM-DD`, hoje ou futuro. `numero_certificado`: obrigatório, até 60 caracteres.
- Reenviar uma certificação **pendente** (ou vencida) atualiza os dados e volta para `pendente`.
- **201:** `{ "certificacao": { "id", "certificacao_id", "numero_certificado", "validade", "validado_por_admin": false, "criado_em" } }`
- **400** dados inválidos ou `certificacao_id` inexistente · **401** · **403** · **404** sem perfil de motorista
- **409** `"certificação já aprovada e dentro da validade"`.

### GET /certificacoes/pendentes 🔒 *(só admin)*
Fila de certificações aguardando aprovação, mais antigas primeiro.
- **200:** `{ "certificacoes": [ { "id": "uuid", "certificacao": "MOPP - Classe 3 Inflamáveis", "numero_certificado": "123456", "validade": "2027-05-01", "criado_em": "...", "motorista": { "id", "nome_completo", "cpf", "cnh", "veiculo_placa" } } ] }`
- **401** · **403** usuário não é admin.

### POST /certificacoes/pendentes/:id/responder 🔒 *(só admin)*
Corpo: `{ "acao": "aprovar" }` ou `{ "acao": "recusar" }`. O `:id` é o `id` que vem em `GET /certificacoes/pendentes`.
- **200 (aprovar):** `{ "certificacao": { "id": "uuid", "validado_por_admin": true } }`
- **200 (recusar):** `{ "certificacao": { "id": "uuid", "recusada": true } }` — o registro é apagado e o motorista pode corrigir e reenviar.
- **400** id ou `acao` inválidos · **401** · **403** · **404** `"certificação pendente não encontrada"` (não existe ou já foi decidida).

### POST /cargas 🔒 *(só empresa)*
A empresa logada publica uma carga. A empresa é descoberta pelo token, não vai no corpo.
```json
{
  "tipo_carga": "Produtos inflamáveis",
  "origem": { "lat": -18.9186, "lng": -48.2772 },
  "destino": { "lat": -19.7469, "lng": -47.9319 },
  "peso_kg": 8000,
  "valor_oferecido": 3500.00,
  "urgencia": "urgente",
  "certificacao_requerida_id": "uuid ou null",
  "expira_em": "2026-10-16T18:00:00.000Z"
}
```
Regras:
- `tipo_carga` obrigatório.
- `peso_kg` e `valor_oferecido`: número (não texto) maior que zero.
- `lat` entre -90 e 90, `lng` entre -180 e 180, também como número.
- `urgencia`: `"normal" | "urgente" | "critico"`. **Opcional**: se não vier, fica `"normal"`.
- `certificacao_requerida_id`: opcional (ausente ou `null` = qualquer motorista pode pegar). Se vier, tem que ser o `id` de uma certificação de `GET /certificacoes`.
- `expira_em`: data ISO 8601 no futuro.

Respostas:
- **201:**
```json
{ "carga": {
    "id": "uuid", "tipo_carga": "Produtos inflamáveis",
    "origem": { "lat": -18.9186, "lng": -48.2772 }, "destino": { "lat": -19.7469, "lng": -47.9319 },
    "peso_kg": 8000, "valor_oferecido": 3500, "urgencia": "urgente", "status": "aberto",
    "certificacao_requerida_id": null, "expira_em": "2026-10-16T18:00:00.000Z",
    "criado_em": "2026-10-14T19:00:00.000Z"
} }
```
- **400:** dados inválidos, ou certificação inexistente: `{ "erros": ["certificacao_requerida_id não corresponde a nenhuma certificação"] }`
- **401** sem token · **403** usuário não é empresa: `{ "erro": "acesso negado para este tipo de usuário" }` · **404** usuário sem perfil de empresa.

### GET /cargas/minhas 🔒 *(só empresa)*
Cargas publicadas pela empresa logada, **mais recentes primeiro**, com a quantidade de propostas e o nome da certificação exigida.
- **200:** `{ "cargas": [ { ...mesmos campos do POST /cargas, "certificacao_exigida": "MOPP - Classe 3 Inflamáveis", "total_propostas": 2 } ] }`
- `certificacao_exigida` é `null` quando a carga não exige certificação. `total_propostas` é `0` quando ninguém fez proposta.
- **401** · **403** · **404** como no `POST /cargas`.

### POST /disponibilidades 🔒 *(só motorista)*
O motorista logado avisa que está livre e procurando carga numa região até um horário. O motorista é descoberto pelo token.
```json
{ "local": { "lat": -18.9186, "lng": -48.2772 }, "raio_busca_km": 80, "urgencia": "urgente",
  "expira_em": "2026-10-16T18:00:00.000Z" }
```
Regras:
- `local`: `lat` entre -90 e 90 e `lng` entre -180 e 180, como número.
- `raio_busca_km`: número (não texto) maior que zero e até 500. **Opcional**: se não vier, fica `50`.
- `urgencia`: `"normal" | "urgente" | "critico"`. **Opcional**: se não vier, fica `"normal"`.
- `expira_em`: data ISO 8601 no futuro.

Respostas:
- **201:**
```json
{ "disponibilidade": {
    "id": "uuid", "local": { "lat": -18.9186, "lng": -48.2772 }, "raio_busca_km": 80,
    "urgencia": "urgente", "status": "aberto", "expira_em": "2026-10-16T18:00:00.000Z",
    "criado_em": "2026-10-14T19:00:00.000Z"
} }
```
- **400** dados inválidos · **401** sem token · **403** usuário não é motorista · **404** usuário sem perfil de motorista.

### GET /cargas/proximas?lat=-18.9186&lng=-48.2772&raio_km=100 🔒 *(só motorista)*
Cargas com status `aberto` e ainda não expiradas cuja **origem** está dentro do raio informado. Só aparecem as cargas que o motorista pode pegar: se a carga exige certificação, o motorista precisa ter essa certificação **aprovada pelo admin e dentro da validade**. Ordem: urgência (`critico`, `urgente`, `normal`) e depois distância (mais perto primeiro).

Parâmetros (todos obrigatórios): `lat` entre -90 e 90, `lng` entre -180 e 180, `raio_km` maior que zero e até 500.
- **200:**
```json
{ "cargas": [ {
    "id": "uuid", "tipo_carga": "Produtos inflamáveis", "empresa": "Transportes Rápidos LTDA",
    "peso_kg": 8000, "valor_oferecido": 3500.00, "urgencia": "urgente",
    "distancia_origem_km": 12.4, "certificacao_exigida": "MOPP - Classe 3 Inflamáveis",
    "origem": { "lat": -18.9186, "lng": -48.2772 }, "destino": { "lat": -19.7469, "lng": -47.9319 },
    "expira_em": "2026-10-16T18:00:00.000Z"
} ] }
```
- `distancia_origem_km`: distância em linha reta (calculada pelo PostGIS) até a origem da carga, com 1 casa decimal. `certificacao_exigida` é `null` quando a carga não exige certificação. Lista vazia: `{ "cargas": [] }`.
- **400** parâmetro ausente ou inválido · **401** · **403** usuário não é motorista · **404** usuário sem perfil de motorista.

### POST /propostas 🔒 *(só motorista)*
O motorista logado faz uma proposta para uma carga, usando uma disponibilidade **dele**.
```json
{ "chamado_carga_id": "uuid", "chamado_disp_id": "uuid", "tipo": "contraproposta", "valor_proposto": 3200.00 }
```
Regras:
- `tipo`: `"aceite"` (aceita o valor da carga) ou `"contraproposta"` (pede outro valor).
- `valor_proposto`: obrigatório na contraproposta (número maior que zero). No `aceite` é **ignorado**: vale o `valor_oferecido` da carga.
- A carga precisa estar com status `aberto` e não expirada.
- Se a carga exige certificação, o motorista precisa tê-la **aprovada pelo admin e dentro da validade** (mesma regra do `GET /cargas/proximas`).
- **Contraproposta única:** cada motorista só pode fazer **uma** contraproposta por carga.

Respostas:
- **201:**
```json
{ "proposta": { "id": "uuid", "chamado_carga_id": "uuid", "chamado_disp_id": "uuid", "tipo": "contraproposta",
                "valor_proposto": 3200, "status": "pendente", "criado_em": "2026-10-14T19:00:00.000Z" } }
```
- **400** dados inválidos · **401** · **403** usuário não é motorista · **403** `"motorista sem a certificação exigida"`
- **404** `"disponibilidade não encontrada"` (não existe ou é de outro motorista) · `"carga não encontrada"` · usuário sem perfil de motorista
- **409** `"carga não está mais aberta para propostas"` (fechada, cancelada ou expirada) · `"disponibilidade não está mais aberta"` (já usada num frete ou vencida) · `"você já fez a contraproposta única para esta carga"`

### GET /propostas/minhas 🔒 *(só motorista)*
Propostas feitas pelo motorista logado, **mais recentes primeiro**. É por aqui que o motorista vê se a empresa aceitou ou recusou.
- **200:**
```json
{ "propostas": [ {
    "id": "uuid", "tipo": "contraproposta", "valor_proposto": 3200, "status": "recusada",
    "criado_em": "2026-10-14T19:00:00.000Z",
    "chamado_carga_id": "uuid", "chamado_disp_id": "uuid",
    "tipo_carga": "Grãos", "valor_oferecido": 3500, "empresa": "Transportes Rápidos LTDA",
    "frete_id": null
} ] }
```
- `status`: `pendente | aceita | recusada | expirada`. `frete_id` só vem preenchido quando a proposta foi `aceita` (use com `GET /fretes/meus`). Lista vazia: `{ "propostas": [] }`.
- **401** · **403** usuário não é motorista · **404** usuário sem perfil de motorista.

### GET /cargas/:id/propostas 🔒 *(só a empresa dona da carga)*
Propostas recebidas pela carga, com os dados do motorista. Ordem: pendentes primeiro, depois as mais antigas.
- **200:**
```json
{ "propostas": [ {
    "id": "uuid", "tipo": "contraproposta", "valor_proposto": 3200, "status": "pendente",
    "criado_em": "2026-10-14T19:00:00.000Z",
    "motorista": {
      "id": "uuid", "nome_completo": "João da Silva", "veiculo_tipo": "carreta", "veiculo_placa": "ABC1D23",
      "capacidade_kg": 15000,
      "certificacoes": [ { "nome": "MOPP - Classe 3 Inflamáveis", "validade": "2027-05-01", "validado_por_admin": true } ]
    }
} ] }
```
- `certificacoes` é `[]` quando o motorista não tem nenhuma. Lista vazia: `{ "propostas": [] }`.
- **400** id inválido · **401** · **403** usuário não é empresa · **404** carga não existe **ou é de outra empresa** (mesma resposta nos dois casos).

### POST /propostas/:id/responder 🔒 *(só a empresa dona da carga)*
Corpo: `{ "acao": "aceitar" }` ou `{ "acao": "recusar" }`
- **200 (recusar):** `{ "proposta": { "id": "uuid", "status": "recusada" } }`
- **200 (aceitar):** numa única transação, a proposta vira `aceita`, as outras propostas **pendentes** da carga viram `recusada`, a carga e a disponibilidade usada pelo motorista viram `fechado` e o frete é criado:
```json
{ "frete": { "id": "uuid", "proposta_id": "uuid", "valor_final": 3200, "status_entrega": "aceito",
             "criado_em": "2026-10-14T19:00:00.000Z" } }
```
- `valor_final` = `valor_proposto` da proposta aceita.
- **400** id ou `acao` inválidos · **401** · **403** usuário não é empresa · **404** proposta não existe ou é de carga de outra empresa
- **409** `"proposta já está aceita"` / `"... recusada"` (já respondida) · `"carga não está mais aberta"`. Duas aceitações ao mesmo tempo nunca criam dois fretes: a segunda espera a primeira terminar e recebe 409.

### GET /propostas/:id/mensagens 🔒 *(só a empresa dona da carga e o motorista da proposta)*
Histórico do chat da proposta, em **ordem cronológica** (mais antiga primeiro). Continua disponível em qualquer status, inclusive `recusada` e `expirada`.
- **200:**
```json
{ "mensagens": [ {
    "id": "uuid", "remetente_id": "uuid", "texto": "Chego na coleta às 14h",
    "criado_em": "2026-10-29T10:59:18.137Z"
} ] }
```
- `remetente_id` é o id do **usuário** (o mesmo do token), não o id do perfil de empresa/motorista. Lista vazia: `{ "mensagens": [] }`.
- **400** id inválido · **401** · **404** proposta não existe **ou** o usuário não é nenhum dos dois lados dela (mesma resposta; vale também para admin).

### POST /propostas/:id/mensagens 🔒 *(só a empresa dona da carga e o motorista da proposta)*
Corpo: `{ "texto": "Combinado, portão 2." }`. O remetente é sempre o usuário do token (não vai no corpo).
- **201:**
```json
{ "mensagem": { "id": "uuid", "proposta_id": "uuid", "remetente_id": "uuid",
                "texto": "Combinado, portão 2.", "criado_em": "2026-10-29T10:59:18.214Z" } }
```
- `texto` é gravado sem espaços nas pontas e tem limite de **1000 caracteres**.
- **400** id inválido · `"texto é obrigatório"` (ausente, vazio ou só espaços) · `"texto deve ter no máximo 1000 caracteres"` · `"mensagem não pode conter telefone, e-mail ou link"` (10 ou mais dígitos seguidos, mesmo com espaço/ponto/hífen/parênteses; `@` ou a palavra "arroba"; `http://`, `https://`, `www.` ou domínio `.com`/`.br`/`.me`/`.ly`)
- **401** · **404** mesma regra do GET
- **409** `"proposta encerrada: não é possível enviar mensagens"` (proposta `recusada` ou `expirada`). Só participantes recebem 409; os outros recebem 404 antes.

### GET /fretes/meus 🔒 *(motorista ou empresa)*
Fretes do usuário logado, **mais recentes primeiro**. Para o motorista: os fretes das propostas dele. Para a empresa: os fretes das cargas dela. Cada lado recebe os dados da **outra parte**.
- **200 (motorista):**
```json
{ "fretes": [ {
    "id": "uuid", "tipo_carga": "Grãos", "valor_final": 3500, "status_entrega": "em_transito",
    "coleta_em": "2026-10-15T08:00:00.000Z", "entrega_em": null, "criado_em": "2026-10-14T19:00:00.000Z",
    "status_pagamento": "retido",
    "empresa": { "id": "uuid", "razao_social": "Transportes Rápidos LTDA" }
} ] }
```
- **200 (empresa):** mesmos campos, mas no lugar de `empresa` vem
  `"motorista": { "id": "uuid", "nome_completo": "João da Silva", "veiculo_tipo": "carreta", "veiculo_placa": "ABC1D23" }`, e mais dois campos: `pix_copia_cola` e `pix_expira_em`, preenchidos **só enquanto `status_pagamento` for `pendente`** (modo de teste com gateway) e `null` nos demais casos. Para o QR Code em imagem, chame de novo `POST /fretes/:id/pagamento` (idempotente enquanto pendente).
- `coleta_em` / `entrega_em` ficam `null` até o frete ir para `em_transito` / `entregue`. `status_pagamento` é `null` enquanto a empresa não pagou. Lista vazia: `{ "fretes": [] }`.
- **401** · **403** usuário admin · **404** usuário sem perfil de motorista/empresa.

### PATCH /fretes/:id/status 🔒 *(só o motorista do frete)*
Corpo: `{ "status_entrega": "em_transito" }` ou `{ "status_entrega": "entregue" }`

Regras:
- Única ordem permitida: `aceito` → `em_transito` → `entregue`. Não dá para pular etapa nem voltar.
- Ao ir para `em_transito`, `coleta_em` recebe a hora atual; ao ir para `entregue`, `entrega_em`.
- Ao ir para `entregue`, se o frete já foi pago, a transação passa de `retido` para `liberado` **na mesma transação do banco** (ou as duas mudanças acontecem, ou nenhuma).

Respostas:
- **200:**
```json
{ "frete": { "id": "uuid", "valor_final": 3500, "status_entrega": "entregue",
             "coleta_em": "2026-10-15T08:00:00.000Z", "entrega_em": "2026-10-15T14:00:00.000Z",
             "status_pagamento": "liberado" } }
```
- **400** id inválido ou `status_entrega` fora de `aceito, em_transito, entregue, cancelado`
- **401** · **403** usuário não é motorista · **404** frete não existe **ou é de outro motorista** (mesma resposta)
- **409** transição não permitida: `{ "erro": "não é possível mudar o frete de aceito para entregue" }`

### POST /webhooks/asaas *(chamado pelo Asaas, não pelo app)*
Recebe os avisos do gateway. Exige o header `asaas-access-token` igual a `ASAAS_WEBHOOK_TOKEN`. **Idempotente**: o mesmo evento (`id`) enviado duas vezes é aplicado uma só (tabela `eventos_pagamento`).
- **200** `{ "resultado": "aplicado" | "ignorado" | "duplicado" }` (evento que não usamos também responde 200, para o Asaas não reenviar).
- **401** token inválido · **503** webhook não configurado, ou repasse ainda não encontrado (o Asaas reenvia).
- Eventos tratados: `PAYMENT_RECEIVED`/`PAYMENT_CONFIRMED` (pendente → retido), `TRANSFER_DONE` (retido → liberado), `TRANSFER_FAILED`/`TRANSFER_CANCELLED` (continua retido; permite novo pedido de repasse).

### POST /fretes/:id/pagamento 🔒 *(só a empresa dona do frete)*
Registra a transação com a comissão da plataforma de **5%**. Sem corpo. O comportamento depende de `PAGAMENTOS_MODO` no servidor:

- **`simulado` (padrão):** não há gateway; a transação nasce `retido` (descrito abaixo). É o modo da demonstração.
- **`sandbox`:** gera uma cobrança Pix no Asaas (ambiente de teste). A transação nasce **`pendente`** e a resposta traz também `pix`: `{ "copia_e_cola", "qr_code_base64", "expira_em" }`. Quando a empresa paga o Pix, o webhook muda para `retido`. Neste modo: frete `entregue` não pode ser pago (**409**); o motorista só inicia o transporte (`em_transito`) com o pagamento `retido` (**409** "aguardando a confirmação do pagamento da empresa"); e ao entregar, o repasse Pix ao motorista é solicitado ao gateway e o pagamento vira `liberado` só quando o webhook `TRANSFER_DONE` chega (**409** "cadastre sua chave Pix antes de concluir a entrega" se faltar a chave). Falha do gateway: **502**.
  - **Idempotente enquanto `pendente`:** chamar o `POST` de novo devolve **200** com a **mesma** cobrança (`transacao` + `pix`), com o QR Code buscado outra vez. É assim que a empresa recupera o Pix ao recarregar a página. Se o frete já foi pago, **409**.
  - **Pix não expira na prática durante a demo:** o QR do Asaas vale cerca de 1 ano (`expira_em`), e a transação continua `pendente` até o pagamento.
  - **Erros com `codigo` estável** (o front deve usar o `codigo`, não a frase): `gateway_indisponivel` (502), `pagamento_nao_confirmado` (409, iniciar transporte sem pagamento retido), `pagamento_nao_retido` (409, entregar sem pagamento retido), `chave_pix_ausente` (409, motorista sem chave Pix ao entregar), `frete_entregue` (409, pagar frete já entregue no modo de teste), `frete_ja_pago` (409). Formato: `{ "erro": "texto", "codigo": "chave_pix_ausente" }`.

- O valor fica **`retido`** pela plataforma até a entrega (o motorista sabe que o dinheiro existe, a empresa só o vê repassado quando a carga chega). Quando o frete vira `entregue`, passa para **`liberado`**.
- Se a empresa pagar um frete que **já está** `entregue`, a transação já nasce `liberado`.
- `valor_comissao` = `valor_frete` × 5%, arredondado para o centavo (meio centavo sobe). A conta é feita em centavos inteiros, sem erro de ponto flutuante.

Respostas:
- **201:**
```json
{ "transacao": { "id": "uuid", "frete_id": "uuid", "valor_frete": 3500.00, "percentual_comissao": 5.00,
                 "valor_comissao": 175.00, "status_pagamento": "retido", "criado_em": "2026-10-14T19:00:00.000Z" } }
```
- **400** id inválido · **401** · **403** usuário não é empresa · **404** frete não existe **ou é de outra empresa**
- **409** `"frete já foi pago"` (cada frete só pode ser pago uma vez) · `"frete cancelado não pode ser pago"`

### GET /admin/resumo 🔒 *(só admin)*
Números gerais da plataforma, para o painel do admin.
- **200:**
```json
{ "resumo": { "motoristas": 2, "empresas": 1, "cargas_abertas": 3, "propostas_pendentes": 1,
              "fretes_aceitos": 0, "fretes_em_transito": 1, "fretes_entregues": 2,
              "certificacoes_pendentes": 1,
              "volume_liberado": 7000, "comissao_total": 350, "comissao_retida": 175 } }
```
- `comissao_total` soma só pagamentos já `liberado` (frete entregue); `comissao_retida`, os que ainda aguardam a entrega.
- **401** · **403** usuário não é admin.

### GET /admin/fretes 🔒 *(só admin)*
Todos os fretes (até 100), mais recentes primeiro, com empresa, motorista e pagamento.
- **200:** `{ "fretes": [ { "id", "tipo_carga", "valor_final", "status_entrega", "coleta_em", "entrega_em", "criado_em", "empresa": "Transportes Rápidos LTDA", "motorista": "João da Silva", "veiculo_placa": "ABC1D23", "status_pagamento": "retido", "valor_comissao": 175 } ] }`
- `status_pagamento` e `valor_comissao` são `null` enquanto a empresa não pagou. **401** · **403**.

### GET /admin/usuarios 🔒 *(só admin)*
Usuários cadastrados (até 200), mais recentes primeiro. Nunca traz senha, CPF ou CNPJ.
- **200:** `{ "usuarios": [ { "id", "email", "tipo", "ativo", "criado_em", "nome" } ] }`
- **401** · **403**.

### GET /motorista/chave-pix 🔒 *(só motorista)*
Chave Pix do motorista logado (para onde o frete será repassado na entrega).
- **200:** `{ "chave_pix": "52998224725", "tipo_chave_pix": "cpf" }`. Sem chave cadastrada: os dois campos vêm `null`.
- **401** · **403** usuário não é motorista · **404** usuário sem perfil de motorista.

### PUT /motorista/chave-pix 🔒 *(só motorista)*
Cadastra ou troca a chave.
```json
{ "tipo_chave_pix": "cpf", "chave_pix": "529.982.247-25" }
```
- `tipo_chave_pix`: `cpf | cnpj | email | telefone | aleatoria`. A chave é conferida conforme o tipo e devolvida **normalizada**: CPF/CNPJ/telefone só com dígitos (telefone com 11 dígitos, aceita `+55`), e-mail e chave aleatória em minúsculas.
- **200:** `{ "chave_pix": "52998224725", "tipo_chave_pix": "cpf" }`
- **400** tipo desconhecido ou chave inválida para o tipo · **401** · **403** · **404** sem perfil de motorista.
- Pré-requisito no banco: `database/migracoes/001_pagamentos_pix.sql`.

---

## 🔜 Rotas planejadas — semana 2 (contrato proposto)

> Enquanto o servidor não tem essas rotas, as telas podem usar dados falsos (mock) com **exatamente** os formatos abaixo. Assim, quando a rota ficar pronta, só se troca a origem dos dados.

**Convenções**
- Coordenadas sempre como `{ "lat": -18.9186, "lng": -48.2772 }`.
- `urgencia`: `"normal" | "urgente" | "critico"`.
- Valores em reais, como número (`3500.00`). Datas em ISO 8601.
- Distâncias em km, calculadas pelo banco (PostGIS).

Nenhuma rota pendente no momento.

---

## Como testar no PowerShell

```powershell
$corpo = @{ email="teste@empresa.com"; senha="senha12345"; razao_social="Empresa Teste"; cnpj="11222333000181" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/cadastro/empresa -ContentType "application/json" -Body $corpo

$login = @{ email="teste@empresa.com"; senha="senha12345" } | ConvertTo-Json
$resp = Invoke-RestMethod -Method Post -Uri http://localhost:3000/login -ContentType "application/json" -Body $login
Invoke-RestMethod -Uri http://localhost:3000/eu -Headers @{ Authorization = "Bearer $($resp.token)" }
```
