# 046 — E2E do fluxo e auditoria final das rotas novas (atualiza o 030)

| Campo | Valor |
|---|---|
| Itens | CT-01 a CT-10 no conjunto; métrica "≤ 15 s entre janelas" do PRD |
| Tipo | qa |
| Agente / modelo | `dev-front` / **sonnet** — mock com estado ampliado (admin, certificações, mensagens) e teste com três contextos de navegador |
| Branch | `test/046-e2e-auditoria-fase6` |
| Estimativa | G (≈6 h) |
| Bloqueado por | todos os cards de feature da Fase 6 que entrarem (026, 031, 032, 040, 041, 042, 043, 035; 033/034/044 se as rotas existirem) |
| Bloqueia | — |
| Onda | 3 |

## Objetivo
Provar no CI (com mocks) o roteiro da Mostra no mundo novo e fechar a auditoria de acessibilidade e Lighthouse de **todas** as rotas novas antes do ensaio. Falhas viram cards `fix:` separados; este PR não corrige tela.

## Rotas da API
Todas, via `mocks/servidor-http.ts` com estado em memória (`mocks/estado.ts`, `POST /__reset`).

## Arquivos prováveis
- `app/mocks/estado.ts`: usuário **admin** do fluxo (hoje o tipo exclui `'admin'`), certificações do motorista com situação (`pendente`/`aprovada`/`vencida`), mensagens por proposta.
- `app/mocks/handlers/comEstado.ts`: `GET`/`POST /certificacoes/minhas`, `GET /certificacoes/pendentes` (com `cpf`/`cnh`, como a API, para provar que a tela descarta), `POST /certificacoes/pendentes/:id/responder` (recusar apaga), `GET`/`POST /propostas/:id/mensagens` (mesmo filtro e 409 da API), `GET /admin/*`. `GET /cargas/proximas` passa a respeitar a certificação aprovada no estado.
- `app/e2e/fluxo-completo.spec.ts` (ou `fluxo-fase6.spec.ts`): contextos empresa, motorista e admin.
- `docs/front/auditoria-final.md`: nova seção "Fase 6" (acrescentar, não reescrever).
- `.github/workflows/front.yml`: só se o job `web` passar de 35 min (registrar o tempo; aumentar com justificativa no PR).

## Passos do E2E (com `expect.poll` de até 15 s para cada reflexo entre janelas)
1. Motorista se cadastra com CPF gerado (`e2e/documentos.ts`, 037) e placa válida; entra.
2. Motorista envia MOPP em "Minhas certificações" → "Aguardando aprovação".
3. Admin entra, vê "Certificações aguardando aprovação: 1" no resumo, aprova em `/admin/certificacoes`.
4. Motorista vê "Aprovada" e, em "Cargas próximas", a carga que exige MOPP.
5. Empresa publica carga; motorista publica disponibilidade e faz proposta; "Cargas próximas" marca "Proposta enviada" (lista real, sem plano B).
6. Empresa abre a conversa da proposta e envia mensagem; motorista vê e responde em "Minhas propostas" (≤ 15 s, anúncio).
7. Empresa aceita; motorista vê "Aceita" + "Ver frete" em "Minhas propostas"; segue o fluxo de frete e pagamento do 030.
8. Mensagem com telefone é recusada no campo; proposta recusada mostra conversa encerrada.

## Auditoria
- axe: 0 violações em todas as rotas de `e2e/rotas.ts`, dois temas, 1280 e 320 px, e com os estados abertos (diálogo de aprovação, conversa aberta, formulário de certificação com erro, mapa aberto).
- Lighthouse mobile e desktop em todas as rotas: A11y, Boas práticas e SEO = 100; Performance registrada (agora `warn` nos dois).
- JS inicial de cada rota frente ao orçamento de 360 KiB (tabela no relatório).
- Checklist manual WCAG por tela nova (teclado, foco, leitor de tela, contraste, zoom 200 %, 320 px, movimento reduzido, erros associados).
- iPhone/Expo Go, VoiceOver e Dynamic Type: **não verificados desde a Fase 5**. Pedir ao Pedro uma sessão com o aparelho e registrar o resultado (ou "não verificado").

## Critérios de aceite
- [ ] Passos 1–8 passam no CI; cada reflexo entre janelas ≤ 15 s sem clique.
- [ ] Teste de regressão: aba oculta 30 s = 0 requisições em "Minhas propostas", "Propostas da carga" (com conversa aberta) e "Meus fretes".
- [ ] axe e Lighthouse conforme acima; relatório na seção "Fase 6" de `docs/front/auditoria-final.md`.
- [ ] Cada falha encontrada virou card `fix:` (número e link no relatório).
- [ ] Nenhum CPF/CNH aparece em tela ou log no passo 3 (asserção explícita).

## Testes exigidos
O próprio E2E; reexecução do workflow completo.

## Checklist de acessibilidade e performance
- [ ] Anúncios conferidos com `RegiaoViva` (texto esperado) nos passos 4, 6 e 7.
- [ ] Tempo do job `web` registrado no PR.
