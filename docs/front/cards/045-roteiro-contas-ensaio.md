# 045 — Roteiro, contas e ensaio da demo (atualiza o 029)

| Campo | Valor |
|---|---|
| Itens | MVP-18, RNF-07, RNF-10; riscos R3, R4, R8 da spec da Fase 6 |
| Tipo | docs |
| Agente / modelo | `documentador` + `devops` / **haiku** — documento e verificações manuais, sem código de produto |
| Branch | `docs/045-roteiro-fase6` |
| Estimativa | P (≈2 h) para o documento + 2 ensaios com o grupo |
| Bloqueado por | documento: 026, 031, 032, 037, 040, 042 em `front` (043 desejável) · ensaio: seeds no Neon (externo, **não confirmado**) e deploy de produção de `front` |
| Bloqueia | — |
| Onda | 3 |

## Objetivo
Deixar a Mostra Tech (12/11) repetível com o mundo novo: cadastro ao vivo com documentos **válidos**, Minhas propostas, chat, certificação aprovada pelo admin e o painel do admin.

## Rotas da API
Todas as do app, em produção. `GET /saude` para o ping (cold start ~50 s).

## Arquivos
- `docs/front/roteiro-demo.md` (o roteiro atual; não criar outro arquivo):
  - Seção 1: trocar "Estado real em 23/10" pelo estado da Fase 6 (o que existe, o que é plano B).
  - Seção 3, passo 5 (hoje pede só "11 dígitos"): CPF/CNPJ precisam de **dígito verificador válido**. Preparar **3 CPFs e 2 CNPJs** gerados pelo algoritmo (o helper `app/e2e/documentos.ts` do 037 serve), anotados **só no Quadro de contas, fora do repo** (são números de teste, mas não precisam ficar públicos). Placa no formato `ABC1234` ou `ABC1D23`.
  - Seção 4 (passo a passo): incluir (a) motorista abre "Minhas propostas" e vê a proposta aceita com "Ver frete"; (b) empresa e motorista trocam uma mensagem no chat (exemplo **sem** 10+ dígitos seguidos: "Chego às 14h no portão 2"); (c) admin entra, vê o resumo e aprova a certificação do motorista "sem MOPP"; o motorista passa a ver a carga MOPP. Manter o plano B da disponibilidade (motorista republica após login, enquanto o A3 não existir).
  - Seção 6 (plano B por risco): chat recusou a mensagem (filtro) → reescrever sem número/link; admin sem conta no Neon → pular o passo (c); Diogo sem P1/P2/P4 → não mostrar cancelar nem comissão depois de recarregar.
  - Seção 7 (checklist de ensaio): tirar a data de 28/10; incluir login das 4 contas (empresa, motorista com MOPP, motorista sem MOPP, admin), certificação pendente pronta para aprovar (seed extra E3 do pedido ou cadastrada no ensaio), CORS ok (resolvido em 04/11), vídeo de backup.
  - Seção 8 (Quadro de contas, **fora do repo**): acrescentar a conta admin e os documentos válidos.
- `docs/front/STATUS.md`: registrar o resultado dos ensaios.

## Critérios de aceite
- [ ] Roteiro cobre cadastro com documento válido, publicar carga, disponibilidade, proposta, aceite, Minhas propostas, chat, pagamento, admin aprovando certificação.
- [ ] Nenhuma credencial, CPF ou CNPJ de pessoa real no repositório; `npm run verificar:proibidos` passa (e-mails de demo continuam fora).
- [ ] Pré-requisitos do Diogo listados com dono: `seed-demo.sql` e `seed-admin.sql` rodados no Neon, seed de cargas reexecutado na semana da Mostra (as cargas vencem em 30 dias), ping no `/saude` nos dias de ensaio e da Mostra.
- [ ] **2 ensaios** completos no ambiente hospedado antes de 12/11, sem erro, com tempo anotado na seção 10; vídeo de backup gravado.
- [ ] Prova no iPhone (Expo Go e PWA): login e "Cargas próximas" em ≤ 1 min, ou "não verificado" registrado.

## Testes exigidos
Nenhum automatizado. Evidência: seção 10 do roteiro preenchida (data, quem, tempo, falhas) e Lighthouse da produção (`/`, `/entrar`) anotado.

## Checklist de acessibilidade e performance
- [ ] Um trecho do ensaio só por teclado (empresa vê proposta chegar; motorista recebe mensagem anunciada).
- [ ] Tema e zoom do projetor conferidos (contraste no tema escolhido).
