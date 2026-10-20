# 029 — Contas, roteiro e checklist de ensaio da demo

| Campo | Valor |
|---|---|
| Itens MVP | MVP-18, RNF-07, RNF-10 |
| Prioridade | MVP |
| Agente / modelo | `devops` / **haiku** — documento e verificações por linha de comando, sem código de produto (o `documentador` também serve, se o orquestrador preferir) |
| Branch | `feat/roteiro-demo` |
| Estimativa | P (≈2 h) para os documentos; ensaio em 28/10 com o time |
| Bloqueado por | documentos: nenhum · verificação das contas: seed de demo do Diogo em produção · ensaio: 003 e todos os cards MVP (014–028) |
| Bloqueia | — |

## Objetivo
Deixar a apresentação de 29/10 (e a Mostra de 12/11) repetível: roteiro de ~5 min em 2 janelas, checklist de ensaio e verificação das contas do seed.

## Rotas da API
Todas do MVP, em produção. `GET /saude` para o ping.

## Telas / componentes
Nenhuma.

## Arquivos e pastas
- `docs/front/demo/roteiro.md`: os passos da seção 4.3 do PRD, com o que clicar e o que falar em cada passo; **sem credenciais** (escrever "conta Empresa demo — credencial no material do Pedro").
- `docs/front/demo/checklist-ensaio.md`: ping no `/saude` (Diogo) antes; URL de produção aberta antes; `CORS_ORIGIN` conferido (requisição da origem da Vercel sem erro de CORS); contas testadas; permissão de GPS decidida no navegador do notebook; tema e zoom do projetor; vídeo de backup; Expo Go e PWA no iPhone; plano para servidor frio (tela de conexão).
- `app/scripts/verificar-contas-demo.mjs`: lê e-mails e senhas de variáveis de ambiente locais (`DEMO_EMPRESA_EMAIL`, `DEMO_EMPRESA_SENHA`, …), faz `POST /login` + `GET /eu` em `EXPO_PUBLIC_API_URL` e imprime só "ok"/"falhou" por conta. Nada de credencial no repositório.

## Critérios de aceite
- [ ] Seed em produção com 1 empresa, 1 motorista com MOPP aprovado e válido, 1 motorista sem MOPP, cargas com e sem exigência na região da lista de cidades; todas as contas entram pelo `POST /login` (script verde) (MVP-18).
- [ ] Roteiro com os passos da seção 4.3 do PRD; busca no código e no site publicado pelos e-mails de demo = 0 ocorrências (`DEMO_EMAILS` no `verificar:proibidos`) (MVP-18).
- [ ] Checklist de ensaio com todos os itens de MVP-18.
- [ ] Ensaio de 28/10 no ambiente hospedado: roteiro 2 vezes seguidas em ≤ 5 min, sem erro; resultado registrado no `docs/front/demo/checklist-ensaio.md` (MVP-18).
- [ ] Prova no iPhone: login e cargas próximas no Expo Go e no PWA em ≤ 1 min (MVP-18).

## Testes exigidos
- Execução do script de contas (saída anexada ao PR, sem credenciais).

## Checklist de acessibilidade e performance
- [ ] Ensaio inclui uma passada só por teclado do passo 5 (empresa vê proposta chegar) para mostrar a região viva ao professor, se houver tempo.
- [ ] Lighthouse da produção (`/`, `/entrar`) anotado no checklist como evidência.
