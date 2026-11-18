# Deploy do Backhaul

Três serviços, todos no plano grátis. A API (Render) publica sozinha a cada push na `main`. **O app na Vercel NÃO publica sozinho: o deploy é manual pela CLI** (ver abaixo).

| Peça | Onde | Branch | Como configurar |
|---|---|---|---|
| Banco (Postgres + PostGIS) | Neon | n/a | rodar `database/schema.sql` e as migrações de `database/migracoes/` |
| API (`backend/`) | Render (Web Service) | `main` | `render.yaml` na raiz é a referência; as variáveis ficam no painel |
| App web/PWA (`app/`) | Vercel | `front` (deploy manual) | Root Directory `app`; `app/vercel.json` define build e cache |

> **Atenção às duas branches.** A API sai da `main`, o app sai da `front`. Quando a `main` ganha rotas novas, o `front` precisa receber a `main` (PR `main → front`, como o #153), senão o app fica sem o contrato novo e a documentação diverge.

## Publicar o app (Vercel) depois de mergear no `front`
Os deploys de produção da Vercel saem pela CLI, não por push. Mergear no `front` **não atualiza o site**: se ninguém rodar o comando, o site fica com a versão antiga (foi o que aconteceu com o botão de bloquear usuário). O botão "Redeploy" do painel também não resolve, porque refaz o build do código antigo.

```bash
git checkout front && git pull
vercel deploy --prod --yes
```

Depois confira em Deployments, com o filtro Environment = Production, se o deploy novo ficou `Ready` e com a data de hoje. Responsável pelo deploy: Pedro (`docs/front/STATUS.md`).

## Ordem para publicar do zero
1. **Neon:** criar o projeto, habilitar `postgis` e `uuid-ossp` e rodar `database/schema.sql`. Depois, cada arquivo de `database/migracoes/` em ordem. Copiar a *connection string* (já com `?sslmode=require`).
2. **Render:** novo Web Service apontando para o repositório, pasta raiz `backend`, build `npm install && npm run build`, start `npm start`, *health check path* `/saude`. Cadastrar as variáveis da tabela abaixo.
3. **Vercel:** importar o repositório, Root Directory `app`, variável `EXPO_PUBLIC_API_URL` com a URL do Render, e publicar com `vercel deploy --prod --yes`.
4. **CORS:** voltar ao Render e colocar a URL da Vercel em `CORS_ORIGIN`.
5. **Dados de demonstração:** rodar `database/seed.sql`, `seed-admin.sql` e `seed-demo.sql` (e-mails e senhas entram como variáveis do `psql`, ver o cabeçalho de cada arquivo).

## Variáveis de ambiente (painel do Render)

| Variável | Valor |
|---|---|
| `DATABASE_URL` | connection string do Neon |
| `JWT_SECRET` | texto aleatório longo: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Trocar invalida todos os logins |
| `CORS_ORIGIN` | URL do app na Vercel, sem barra no final (várias separadas por vírgula) |
| `PAGAMENTOS_MODO` | `simulado` (padrão) ou `sandbox` |
| `PAGAMENTOS_REPASSE` | `simulado` enquanto o sandbox do Asaas recusar transferências |
| `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` | só se `sandbox`. **Nunca** no GitHub |

## Checklist antes de uma demonstração
- [ ] **Acordar tudo 5 a 10 min antes.** Render grátis dorme (primeira chamada ~50 s) e o Neon pausa. Rode o workflow *Aquecer API* (Actions) ou abra `<URL da API>/saude`: deve responder `{"status":"ok","banco":"conectado"}`.
- [ ] `CORS_ORIGIN` contém a URL exata da Vercel (sem barra final). Sintoma de erro: o login falha só no navegador.
- [ ] O último deploy de produção da Vercel é posterior ao último merge no `front` (painel → Deployments → Production). Se não for, rode o deploy manual da seção acima.
- [ ] Contas de demonstração existem no Neon e conseguem logar (empresa, motorista, admin).
- [ ] Se for mostrar Pix: `PAGAMENTOS_MODO=sandbox`, webhook cadastrado no painel do Asaas apontando para `<URL da API>/webhooks/asaas` com o mesmo `ASAAS_WEBHOOK_TOKEN`. Roteiro em `docs/demo-pagamento-pix.md`.
- [ ] Plano B: se o Render falhar, o app roda contra o mock (`app/README.md`, seção do mock).

## Aquecer a API
O workflow `.github/workflows/aquecer-api.yml` chama `/saude` (que também acorda o Neon). Ele roda **só quando você pedir** (Actions → *Aquecer API* → *Run workflow*). Configuração única: em *Settings → Secrets and variables → Actions → Variables*, criar `API_URL` com a URL do Render.
Não deixe agendado o tempo todo: manter o Neon sempre acordado gasta as horas de computação do plano grátis.

## O que ainda depende de decisão ou conta de vocês
- **Pix em produção:** exige CNPJ da plataforma, conta aprovada no gateway e parecer sobre custódia do dinheiro (`docs/pagamentos.md`).
- **Domínio próprio, monitoramento e backups:** o plano grátis não oferece. Para a faculdade, o `/saude` e os logs do Render bastam.
- **Rate limit em memória:** vale para uma única instância (`docs/decisoes-backend.md`, item 12).
