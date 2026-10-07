# Cronograma — Backhaul (entrega final)

> Substitui o rascunho antigo (CP-1 a CP-5). O curso passou a ter **uma única apresentação final**.

## Datas e regras

| Item | Data / regra |
|---|---|
| Início do desenvolvimento | 07/10/2026 |
| Apresentação para o professor | **29/10/2026** (10 min, provavelmente sem live coding) |
| Mostra Tech da faculdade (com empresas) | **12/11/2026** (a confirmar) |
| Commits | no mínimo 1 por semana; meta de 2–3, de pessoas diferentes |

## Regras do curso que valem para o grupo todo

- **Todos precisam ter commits**, inclusive quem não programa (atas, README, docs, dados de exemplo, roteiro de testes). Grupo com "carregador" perde nota no critério GitHub.
- **Mensagens descritivas**: `feat: adiciona endpoint de criação de usuário`, nunca `update`.
- **Branches**: ninguém trabalha direto na `main`. Cada tarefa tem uma branch (`feat/login`, `docs/ata-s05`) e entra por merge/pull request.
- **Issues com labels** (`bug`, `feature`, `docs`) + Kanban no GitHub Projects.
- **Live Code**: qualquer membro pode ser sorteado, então todos estudam o código inteiro. Não contar com "sem live coding".
- **README** explica o projeto e como rodar, para alguém de fora.
- **Pasta `/docs`** organizada e indexada (atas, diagramas, cronograma).
- **Hospedagem desde cedo**: a primeira versão publicada vai ao ar na semana 1.
- **Atas** toda semana.

## Critérios de nota

| Critério | Pontos |
|---|---|
| Funcionamento completo do sistema | 25 |
| Hospedagem ativa e acessível | 10 |
| Qualidade do código + defesa técnica | 15 |

## Decisões em aberto (até 09/10)

- **Desktop**: ✅ decidido em 07/10 — versão **instalável**, feita como PWA (o mesmo site hospedado, instalável no Chrome/Edge e adicionável à tela inicial do iPhone). Só falta confirmar com o professor se isso atende ao que ele espera por "instalável".
- **Base do front-end**: Expo (um código para iPhone via Expo Go e navegador) — confirmar com o Pedro.
- **Onde hospedar API e site**: pesquisar na semana 1.
- **Banco na nuvem**: Neon (plano grátis, suporta PostGIS) — recomendado.

## Divisão de papéis

| Pessoa | Foco |
|---|---|
| Diogo | Banco, dados de exemplo, API |
| PedroAugusto2208 | Telas (Expo) e publicação do site |
| MateuHuTv, GustavoF, guilherme508 | Sem código: realismo dos dados, roteiro de testes, pitch de 30s, vídeo de backup, pôster da mostra, atas, board |

Contrato entre API e telas: `docs/api.md` (escrito na semana 1; qualquer mudança é combinada antes).

## Semana 1 — 07/10 a 13/10: base funcionando

- [x] Decidir "desktop" → instalável (PWA)
- [ ] Confirmar com o professor que PWA atende ao "instalável"
- [ ] Criar projeto no Neon e rodar `schema.sql` + `seed.sql`
- [ ] Estrutura do repositório (`backend/`, `app/`, `database/`, `docs/`)
- [ ] Servidor Node + TypeScript conectado ao banco
- [ ] Cadastro e login (motorista e empresa)
- [ ] Escrever `docs/api.md`
- [ ] Página mínima publicada online
- [ ] Pelo menos 1 commit de **cada um dos 5 membros** (quem não programa: ata, README, board, dados de exemplo)
- [ ] Board no GitHub Projects com issues e labels (Mateus)
- [ ] README com instruções de como rodar
- [ ] Ata da semana

## Semana 2 — 14/10 a 20/10: fluxo principal

- [ ] Empresa publica carga (com exigência de certificação, ex.: MOPP)
- [ ] Motorista publica disponibilidade
- [ ] Lista de cargas próximas com distância em km (PostGIS)
- [ ] Filtro por certificação (MOPP/ONU)
- [ ] Proposta (oferta + contraproposta única) e criação do frete
- [ ] Telas correspondentes
- [ ] Transformar o site em PWA instalável (manifesto, ícone, instalação testada no Chrome/Edge e no iPhone)
- [ ] Ata da semana

## Semana 3 — 21/10 a 27/10: fechamento e polimento

- [ ] Pagamento simulado com registro da comissão
- [ ] Acabamento visual
- [ ] Dados de exemplo realistas
- [ ] Testes de ponta a ponta
- [ ] **Congelar funcionalidades em 24/10**
- [ ] "Mapa do código": 1 página com as prováveis perguntas técnicas e onde está cada resposta
- [ ] Vídeo de backup da demonstração
- [ ] Roteiro de 10 min: 2 min problema, 5 min demonstração, 3 min técnica e divisão do trabalho
- [ ] Ata da semana

## Reta final

| Data | O que fazer |
|---|---|
| 28/10 | Ensaio geral no ambiente hospedado |
| **29/10** | **Apresentação ao professor** (todos preparados para responder sobre qualquer parte do código) |
| 30/10 a 12/11 | Ajustes pedidos, pôster, QR code (se a hospedagem permitir), conferir se a hospedagem não caiu |
| 12/11 | Mostra Tech |

## Fica de fora se faltar tempo

- Chat com moderação
- Painel de administração completo
- Avaliações e histórico

## Riscos

| Risco | O que fazer |
|---|---|
| Hospedagem gratuita cair ou dormir | Testar a cada semana; ter o vídeo de backup |
| Conflito de código entre os dois programadores | Pastas separadas, `git pull` antes de começar e de enviar, mudanças no `schema.sql` por uma pessoa só |
| Pouco tempo (≈5 h/semana) | Cortar itens da lista "fica de fora" antes de cortar o fluxo principal |
| Dúvida técnica na defesa | "Mapa do código" e ensaio com perguntas |
| Segredos no repositório público | Nunca subir `.env` ou senhas |
