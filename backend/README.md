# Backhaul: backend

API em Node.js + TypeScript (Express) que conversa com o PostgreSQL do projeto.

## Pré-requisitos
- Node.js 20 ou mais novo
- PostgreSQL rodando, com o schema de `../database/schema.sql` aplicado

## Como rodar

```bash
cd backend
npm install
cp .env.example .env   # depois abra o .env e coloque a sua senha do Postgres
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
  env.ts      carrega o .env (precisa ser o primeiro import)
  db.ts       cria o pool de conexões com o Postgres
  server.ts   cria o app Express e as rotas
```

> O arquivo `.env` tem a sua senha e **não** vai para o Git. Só o `.env.example` é versionado.
