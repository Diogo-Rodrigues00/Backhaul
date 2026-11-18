# Backhaul

Plataforma de conexão de fretes por urgência — conecta caminhoneiros disponíveis a cargas urgentes próximas, reduzindo o percentual de retorno vazio no transporte rodoviário.

> Documentação completa do projeto (justificativa, objetivo, escopo, riscos) está em [`docs/termo_abertura.md`](docs/termo_abertura.md).

## Estrutura do repositório

```
backhaul/
├── backend/        # API Node.js + TypeScript (Express). Ver backend/README.md
├── app/            # App React Native (Expo) + PWA. Ver app/README.md
├── database/       # schema.sql, migrações, seeds e diagrama ER
├── docs/           # termo de abertura, API, decisões, pagamentos, deploy, guia de estudo
├── render.yaml     # referência da configuração da API no Render
└── .github/        # CI do backend e do app, workflow para acordar a API
```

## Status atual

O MVP está implementado e publicado: cadastro e login, cargas, disponibilidades, propostas com chat, fretes com pagamento por Pix (sandbox, repasse simulado), painel admin e busca por proximidade com PostGIS.

- **Contrato da API:** [`docs/api.md`](docs/api.md)
- **Como publicar e checklist da demo:** [`docs/deploy.md`](docs/deploy.md)
- **Pagamentos e caminho para produção:** [`docs/pagamentos.md`](docs/pagamentos.md)
- **Riscos e garantias:** [`docs/garantias-e-riscos.md`](docs/garantias-e-riscos.md)
- **Guia de estudo para a defesa:** [`docs/guia-de-estudo.md`](docs/guia-de-estudo.md)

## Stack técnica

- **App:** React Native (Expo), com versão web publicada como PWA na Vercel
- **Backend:** Node.js + TypeScript (Express), no Render
- **Banco de dados:** PostgreSQL + PostGIS, no Neon

## Como contribuir (fluxo básico do grupo)

1. Antes de começar, rode `git pull` pra garantir que está com a versão mais atual.
2. Faça sua parte (arquivo, código, documento).
3. `git add <arquivo(s)>`
4. `git commit -m "mensagem clara descrevendo o que foi feito"`
5. `git push`

Se dois membros mexerem no mesmo arquivo ao mesmo tempo, o Git pode acusar conflito — nesse caso, avisa no grupo antes de forçar qualquer coisa.
