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
| 409 | Valor repetido (e-mail, CPF ou CNPJ) | `{ "erro": "cnpj já cadastrado" }` |
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
  "cpf": "123.456.789-01",
  "cnh": "11122233344",
  "veiculo_tipo": "carreta",
  "veiculo_placa": "ABC1D23",
  "capacidade_kg": 15000
}
```
- **201:** `{ "usuario": { "id": "uuid", "email": "joao@exemplo.com", "tipo": "motorista", "criado_em": "2026-10-14T19:00:00.000Z" } }`
- **400** dados inválidos · **409** e-mail ou CPF já cadastrado.
- CPF aceita pontuação (ela é removida antes de salvar). A senha nunca volta na resposta.

### POST /cadastro/empresa
Cria o usuário (tipo `empresa`) e o perfil de empresa.

Corpo:
```json
{
  "email": "contato@transportesrapidos.com",
  "senha": "minimo8caracteres",
  "razao_social": "Transportes Rápidos LTDA",
  "cnpj": "12.345.678/0001-99"
}
```
- **201:** `{ "usuario": { "id", "email", "tipo": "empresa", "criado_em" } }`
- **400** dados inválidos · **409** e-mail ou CNPJ já cadastrado.

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

---

## 🔜 Rotas planejadas — semana 2 (contrato proposto)

> Enquanto o servidor não tem essas rotas, as telas podem usar dados falsos (mock) com **exatamente** os formatos abaixo. Assim, quando a rota ficar pronta, só se troca a origem dos dados.

**Convenções**
- Coordenadas sempre como `{ "lat": -18.9186, "lng": -48.2772 }`.
- `urgencia`: `"normal" | "urgente" | "critico"`.
- Valores em reais, como número (`3500.00`). Datas em ISO 8601.
- Distâncias em km, calculadas pelo banco (PostGIS).

### Propostas (oferta e uma única contraproposta)

**POST /propostas** 🔒 *(motorista)*
```json
{ "chamado_carga_id": "uuid", "chamado_disp_id": "uuid", "tipo": "aceite", "valor_proposto": 3500.00 }
```
- `tipo: "aceite"` aceita o valor da carga; `tipo: "contraproposta"` pede outro valor (só uma por carga).
- **201:** `{ "proposta": { "id", "tipo", "valor_proposto", "status": "pendente" } }`
- **409** se esse motorista já fez a contraproposta única.

**GET /cargas/:id/propostas** 🔒 *(empresa dona da carga)* — propostas recebidas, com dados do motorista (nome, veículo, certificações).

**POST /propostas/:id/responder** 🔒 *(empresa)*
Corpo: `{ "acao": "aceitar" }` ou `{ "acao": "recusar" }`
- **200 (aceitar):** cria o frete e fecha a carga → `{ "frete": { "id", "valor_final", "status_entrega": "aceito" } }`
- **200 (recusar):** `{ "proposta": { "status": "recusada" } }`

### Fretes e pagamento simulado

**GET /fretes/meus** 🔒 *(motorista ou empresa)* — fretes do usuário logado.
- **200:** `{ "fretes": [ { "id", "tipo_carga", "valor_final", "status_entrega", "coleta_em", "entrega_em" } ] }`

**PATCH /fretes/:id/status** 🔒 — Corpo: `{ "status_entrega": "em_transito" }` ou `"entregue"`.

**POST /fretes/:id/pagamento** 🔒 *(empresa)* — pagamento **simulado**: registra a transação com a comissão da plataforma (5%).
- **201:**
```json
{ "transacao": { "id": "uuid", "valor_frete": 3500.00, "percentual_comissao": 5.00,
                 "valor_comissao": 175.00, "status_pagamento": "retido" } }
```

---

## Como testar no PowerShell

```powershell
$corpo = @{ email="teste@empresa.com"; senha="senha12345"; razao_social="Empresa Teste"; cnpj="11222333000181" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/cadastro/empresa -ContentType "application/json" -Body $corpo

$login = @{ email="teste@empresa.com"; senha="senha12345" } | ConvertTo-Json
$resp = Invoke-RestMethod -Method Post -Uri http://localhost:3000/login -ContentType "application/json" -Body $login
Invoke-RestMethod -Uri http://localhost:3000/eu -Headers @{ Authorization = "Bearer $($resp.token)" }
```
