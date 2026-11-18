# Pedido ao Diogo — o que o front precisa do backend

_2026-11-04, do Pedro (front). Sem prazo fixo: quanto antes, melhor. O front executa cada item assim que ele estiver na `main` com o contrato no `docs/api.md`. A Mostra Tech é 12/11._

_Correspondência com a spec do front (`spec-fase-backend-novo.md`): P1 = A1 · P2 = A2 · 4b = A3 · P4 = A4 · P3 = A5 · P5 = B1 e B2 · P6 = C · P7 = D._

Diogo, o app já usa as rotas novas que você subiu (propostas/minhas, certificações, chat, admin, CPF/CNPJ com dígito). Valeu. Abaixo o que falta, em ordem de prioridade. Cada item diz o que quebra ou deixa de existir se não vier, e o plano B do front.

## A. Rotas que eu preciso para fechar telas

### A1. `POST /cargas/:id/cancelar` (empresa dona)
- Sem corpo. Numa transação com `FOR UPDATE` na carga: `chamados_carga.status` → `cancelado`; propostas `pendente` da carga → `recusada`.
- `200 { "carga": { "id": "uuid", "status": "cancelado" } }`
- Erros: 400 id inválido · 401 · 403 não é empresa · 404 `"carga não encontrada"` (também de outra empresa) · 409 `"carga não está aberta"` (fechada, cancelada ou vencida).
- Sem isso: não existe botão "Cancelar carga". Plano B: nenhum.

### A2. `POST /disponibilidades/:id/cancelar` (motorista dono)
- Sem corpo. Status → `cancelado`; propostas `pendente` feitas com ela → `recusada`.
- `200 { "disponibilidade": { "id": "uuid", "status": "cancelado" } }`
- Erros: 400 · 401 · 403 · 404 `"disponibilidade não encontrada"` (também de outro motorista) · 409 `"disponibilidade não está aberta"`.
- Sem isso: não existe "Encerrar disponibilidade". Plano B: nenhum.

### A3. `GET /disponibilidades/minhas` (motorista)
Segue sem existir (testei: o 401 que a rota devolve vem do `router.use(exigirAutenticacao)` do arquivo, que responde para qualquer subcaminho). Preciso do `chamado_disp_id` depois de recarregar o app.
- `200 { "disponibilidades": [ { "id", "local": {"lat","lng"}, "raio_busca_km", "urgencia", "status", "expira_em", "criado_em", "propostas_pendentes" } ] }`, mais recentes primeiro. São os campos que o app já usa; `status` vem `expirado` quando `aberto` e `expira_em <= now()`.
- Erros: 401 · 403 `"acesso negado para este tipo de usuário"` · 404 `"perfil de motorista não encontrado"`.
- Sem isso: o motorista republica a disponibilidade a cada login (plano B guardado no aparelho). Funciona na demo, mas é desajeitado.

### A4. Extensão de `GET /fretes/meus`
- Cada item ganha `proposta_id`, `origem` e `destino` (`{lat,lng}`).
- Só para a empresa: `comissao: { "percentual_comissao": 5, "valor_comissao": 175, "status_pagamento": "retido" }`, ou `null` enquanto não pagou.
- Sem isso: a comissão some ao recarregar a página (só aparece logo depois de pagar), não há chat nem mapa a partir do frete.

### A5. Extensão de `GET /propostas/minhas` (campos novos; os atuais não mudam)
- `origem`, `destino` (`{lat,lng}`), `urgencia`, `certificacao_exigida` (texto ou `null`), `carga_status` (`aberto|fechado|cancelado|expirado`, com `expirado` calculado quando aberto e `expira_em <= now()`) e `carga_expira_em` (ISO).
- Sem isso: "Minhas propostas" não consegue dizer "essa carga não está mais disponível".

## B. Regras de negócio (podem estragar a demo)

### B1. Regras no aceite (`POST /propostas/:id/responder`, `aceitar`)
- Antes de aceitar, a disponibilidade da proposta precisa estar `aberto` e vigente; senão `409 "disponibilidade não está mais aberta"`.
- Ao aceitar, as propostas `pendente` do **mesmo motorista** (mesmo `chamado_disp_id`) em outras cargas viram `recusada`.
- `POST /propostas`: `409 "você já fez proposta para esta carga"` para proposta repetida na mesma carga (decisão de vocês).
- Hoje: o mesmo motorista pode acabar com dois fretes na mesma disponibilidade.

### B2. `GET /cargas/minhas` com status `expirado`
Devolver `expirado` quando `aberto` e `expira_em <= now()`. Hoje carga vencida aparece como `aberto` (o app mostra "expirada" pelo `expira_em`, mas o status cru engana).

## C. Robustez (se der tempo)

- Tetos: `400 "<campo> deve ter no máximo N caracteres"` para `nome_completo` 150, `cnh` 20, `veiculo_tipo` 50, `email` 150, `razao_social` 150, `tipo_carga` 80. `peso_kg`, `valor_oferecido` e `capacidade_kg` com teto 99999999.99 (`400 "... deve ser no máximo 99999999.99"`). Hoje estouram e viram `500`.
- Rota inexistente: `404 {"erro":"rota não encontrada"}` em JSON (hoje é HTML do Express).
- Corpo grande: `413 {"erro":"corpo muito grande"}` (hoje vira 500).

## D. Privacidade

- `GET /certificacoes/pendentes` hoje devolve `cpf` e `cnh` do motorista ao admin. O front só mostra nome e placa e descarta os dois campos. Pode tirá-los da resposta?

## D2. Divergências entre `docs/api.md` e o backend (achadas em 04/11)

1. **Fuso na validade da certificação:** `POST /certificacoes/minhas` compara com a data UTC (`new Date().toISOString()`). Entre 21h e 24h de Brasília, validade "hoje" volta `400` "no passado", mas o `docs/api.md` diz "hoje ou futuro". Sugestão: comparar com a data em `America/Sao_Paulo` (ou documentar).
2. **`nome: null` do admin:** `GET /eu` e `GET /admin/usuarios` devolvem `nome: null` para admin; o contrato não diz que pode ser nulo. Só documentar.
3. **Mensagens de 409 do cadastro:** o contrato fala "e-mail ou CPF/CNPJ já cadastrado", o backend devolve `email já cadastrado` / `cpf já cadastrado` / `cnpj já cadastrado`. Só alinhar o texto do contrato.
4. **`comissao_total` de `/admin/resumo`:** soma só pagamentos `liberado`. O nome sugere "tudo"; vale documentar (o front mostra como "Comissão recebida").

## E. Operação / ambiente (confirmar, não é código)

1. ~~**CORS** no Render~~ **resolvido**: em 04/11 o preflight de `https://backhaul-front.vercel.app` já volta liberado. Obrigado!
2. **Seeds no Neon**: já rodou `database/seed-demo.sql` (empresa, motorista com MOPP, motorista sem MOPP, 4 cargas) e `database/seed-admin.sql`? Me passe as credenciais por fora do repositório. As cargas do seed expiram 30 dias depois da execução: reexecutar na semana da Mostra Tech.
3. **Seed extra (opcional)**: uma certificação pendente do motorista "sem MOPP", para mostrar a aprovação do admin sem precisar cadastrar ao vivo.
4. **Seeds com CPF/CNPJ de dígito inválido** (`seed.sql`, `seed-demo.sql`): o login funciona, mas não servem de exemplo no cadastro. Só aviso.
5. **Ping em `/saude`** (cold start do Render, ~50 s) nos dias de ensaio e em 12/11 de manhã.
6. **Datas**: me avise antes de mergear mudança de contrato na `main` perto da Mostra Tech (12/11), para eu não ser pego de surpresa no ensaio.

## Resumo para colar no grupo

> Diogo, valeu pelas rotas novas. Preciso, o quanto antes: (A1) cancelar carga, (A2) cancelar disponibilidade, (A3) GET /disponibilidades/minhas, (A4) comissão/proposta_id/origem/destino em GET /fretes/meus, (A5) campos extras em GET /propostas/minhas, (B1) regras no aceite (disponibilidade aberta; recusar as outras propostas do motorista; 409 em proposta repetida) e (E2) seeds no Neon (o CORS do Vercel já está ok). Detalhes e erros em `docs/front/pedido-ao-diogo.md`. Me avisa antes de mudar contrato perto da Mostra Tech (12/11).
