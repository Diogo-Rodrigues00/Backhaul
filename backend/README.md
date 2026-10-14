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

### Em produção (hospedagem)

Na hospedagem não se usa o `npm run dev`: o TypeScript é compilado **uma vez** e o servidor roda JavaScript puro, que é mais rápido e não depende das ferramentas de desenvolvimento.

```bash
npm install
npm run build   # gera dist/ a partir de src/
npm start       # roda node dist/server.js
```

No painel da hospedagem, configure: comando de build `npm install && npm run build`, comando de start `npm start`, pasta raiz `backend`.
O `.env` **não** vai para o servidor: as variáveis abaixo são cadastradas no painel da hospedagem.

## Variáveis de ambiente

| Variável       | Obrigatória? | Para que serve |
|----------------|--------------|----------------|
| `DATABASE_URL` | sim | Endereço do Postgres: `postgres://USUARIO:SENHA@HOST:PORTA/BANCO` |
| `JWT_SECRET`   | sim | Segredo que assina os tokens de login. Texto longo e aleatório; trocar invalida todos os tokens |
| `PORT`         | não (padrão `3000`) | Porta da API. Na hospedagem, quem define é o próprio serviço |
| `CORS_ORIGIN`  | em produção | Sites que podem chamar a API pelo navegador, separados por vírgula (ex.: `http://localhost:8081,https://backhaul.exemplo.com`) |

Sem `DATABASE_URL` ou `JWT_SECRET` o servidor nem sobe: ele avisa logo na inicialização, em vez de falhar na primeira requisição.

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
  server.ts              cria o app Express, liga CORS e as rotas, trata erros
  validacao.ts           validação de formato (e-mail, senha, CPF, CNPJ, carga...)
  middleware/
    autenticacao.ts      gera e confere tokens JWT (exigirAutenticacao, exigirTipo)
  rotas/
    cadastro.ts          POST /cadastro/motorista e POST /cadastro/empresa
    login.ts             POST /login e GET /eu
    certificacoes.ts     GET /certificacoes
    cargas.ts            POST /cargas e GET /cargas/minhas
```

## Rotas

| Método | Rota                  | Protegida? | O que faz                                              |
|--------|-----------------------|------------|--------------------------------------------------------|
| GET    | `/saude`              | não        | Confere se a API e o banco estão no ar                 |
| POST   | `/cadastro/motorista` | não        | Cria o usuário (tipo motorista) e o perfil de motorista |
| POST   | `/cadastro/empresa`   | não        | Cria o usuário (tipo empresa) e o perfil de empresa     |
| POST   | `/login`              | não        | Confere e-mail e senha e devolve um token JWT (7 dias) |
| GET    | `/eu`                 | **sim**    | Devolve os dados básicos do usuário logado             |
| GET    | `/certificacoes`      | **sim**    | Lista as certificações (MOPP/ONU)                      |
| POST   | `/cargas`             | **empresa** | Publica uma carga da empresa logada                   |
| GET    | `/cargas/minhas`      | **empresa** | Cargas da empresa logada, com total de propostas      |

**Códigos de resposta:** `201` criado · `400` dados inválidos · `401` login inválido ou token ausente/expirado · `403` logado, mas o tipo de usuário não pode usar a rota · `404` não encontrado · `409` e-mail, CPF ou CNPJ já cadastrado · `500` erro interno · `503` banco fora do ar (só no `/saude`).

O formato completo de cada rota (corpo, respostas, regras) está em [`../docs/api.md`](../docs/api.md).

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

Publicar uma carga (com o token de uma **empresa**; de motorista dá 403):
```bash
curl -X POST http://localhost:3000/cargas   -H "Content-Type: application/json" -H "Authorization: Bearer SEU_TOKEN"   -d '{"tipo_carga":"Grãos","origem":{"lat":-18.9186,"lng":-48.2772},"destino":{"lat":-19.7469,"lng":-47.9319},"peso_kg":8000,"valor_oferecido":3500,"urgencia":"urgente","expira_em":"2026-12-01T18:00:00Z"}'
# 201 {"carga":{"id":"...","origem":{"lat":-18.9186,"lng":-48.2772},...,"status":"aberto"}}
```

Listar as cargas da empresa:
```bash
curl http://localhost:3000/cargas/minhas -H "Authorization: Bearer SEU_TOKEN"
# 200 {"cargas":[{"id":"...","tipo_carga":"Grãos",...,"certificacao_exigida":null,"total_propostas":0}]}
```

> Coordenadas: a API sempre usa `{lat, lng}`, mas o PostGIS guarda o ponto como (longitude, latitude). A troca de ordem acontece só dentro de `rotas/cargas.ts`.

> Os exemplos usam a sintaxe do Git Bash / Linux. No PowerShell, use `curl.exe` e coloque o comando em uma linha só.

> A senha é guardada só como hash bcrypt (`senha_hash`) e nunca é devolvida por nenhuma rota.

> O arquivo `.env` tem a sua senha e **não** vai para o Git. Só o `.env.example` é versionado.
