# Backhaul: backend

API em Node.js + TypeScript (Express) que conversa com o PostgreSQL do projeto.

## Pré-requisitos
- Node.js 20 ou mais novo
- PostgreSQL rodando, com o schema de `../database/schema.sql` aplicado

## Como rodar

```bash
cd backend
npm install
cp .env.example .env   # depois abra o .env e preencha DATABASE_URL e JWT_SECRET
npm run dev
```

Teste no navegador ou no terminal:

```bash
curl http://localhost:3000/saude
# {"status":"ok","banco":"conectado"}
```

## Scripts
| Comando         | O que faz                                                       |
|-----------------|-----------------------------------------------------------------|
| `npm run dev`   | Roda direto do TypeScript e reinicia sozinho quando você salva |
| `npm run build` | Compila `src/` (TypeScript) para `dist/` (JavaScript)          |
| `npm start`     | Roda a versão compilada em `dist/` (rode o build antes)        |

## Estrutura
```
src/
  env.ts                 carrega o .env (precisa ser o primeiro import)
  db.ts                  pool de conexões com o Postgres + helper emTransacao()
  server.ts              cria o app Express, liga as rotas e trata erros
  validacao.ts           validação de formato (e-mail, senha, CPF, CNPJ...)
  middleware/
    autenticacao.ts      gera e confere tokens JWT (exigirAutenticacao)
  rotas/
    cadastro.ts          POST /cadastro/motorista e POST /cadastro/empresa
    login.ts             POST /login e GET /eu
```

## Rotas

| Método | Rota                  | Protegida? | O que faz                                              |
|--------|-----------------------|------------|--------------------------------------------------------|
| GET    | `/saude`              | não        | Confere se a API e o banco estão no ar                 |
| POST   | `/cadastro/motorista` | não        | Cria o usuário (tipo motorista) e o perfil de motorista |
| POST   | `/cadastro/empresa`   | não        | Cria o usuário (tipo empresa) e o perfil de empresa     |
| POST   | `/login`              | não        | Confere e-mail e senha e devolve um token JWT (7 dias) |
| GET    | `/eu`                 | **sim**    | Devolve os dados básicos do usuário logado             |

**Códigos de resposta:** `201` criado · `400` dados inválidos · `401` login inválido ou token ausente/expirado · `409` e-mail, CPF ou CNPJ já cadastrado · `500` erro interno.

**Formatos aceitos:** e-mail válido; senha com no mínimo 8 caracteres; CPF com 11 dígitos e CNPJ com 14. Pode mandar CPF e CNPJ com pontuação, ela é removida antes de salvar. O e-mail é salvo em minúsculas.

### Exemplos com curl

Cadastrar motorista:
```bash
curl -X POST http://localhost:3000/cadastro/motorista \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@exemplo.com","senha":"senha1234","nome_completo":"João da Silva","cpf":"123.456.789-09","cnh":"12345678900","veiculo_tipo":"truck","veiculo_placa":"ABC1D23","capacidade_kg":14000}'
# 201 {"usuario":{"id":"...","email":"joao@exemplo.com","tipo":"motorista","criado_em":"..."}}
```

Cadastrar empresa:
```bash
curl -X POST http://localhost:3000/cadastro/empresa \
  -H "Content-Type: application/json" \
  -d '{"email":"contato@transportes.com","senha":"senha1234","razao_social":"Transportes Exemplo LTDA","cnpj":"12.345.678/0001-90"}'
# 201 {"usuario":{"id":"...","email":"contato@transportes.com","tipo":"empresa","criado_em":"..."}}
```

Login:
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@exemplo.com","senha":"senha1234"}'
# 200 {"token":"eyJhbGciOi...","tipo":"motorista"}
# 401 {"erro":"email ou senha inválidos"}
```

Dados do usuário logado (troque SEU_TOKEN pelo token recebido no login):
```bash
curl http://localhost:3000/eu -H "Authorization: Bearer SEU_TOKEN"
# 200 {"usuario":{"id":"...","email":"joao@exemplo.com","tipo":"motorista","ativo":true,"criado_em":"...","nome":"João da Silva"}}
```

> Os exemplos usam a sintaxe do Git Bash / Linux. No PowerShell, use `curl.exe` e coloque o comando em uma linha só.

> A senha é guardada só como hash bcrypt (`senha_hash`) e nunca é devolvida por nenhuma rota.

> O arquivo `.env` tem a sua senha e **não** vai para o Git. Só o `.env.example` é versionado.
