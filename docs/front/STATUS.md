# STATUS — Front-end do Backhaul

_Atualizado em 2026-11-05 (Fase 6, Onda 1, orquestrador)._

## Fase atual
**Fase 6 — Backend novo: Onda 0 concluída e em produção; Onda 1 em execução.** Spec: `spec-fase-backend-novo.md` (os cards em `cards/` são a fonte vigente). Sem cronograma com datas (decisão do Pedro em 04/11): ondas em ordem, até onde der antes da Mostra Tech (12/11).

**Regra de operação (05/11):** o orquestrador só avança (merge, retomada de agente, ação nova) com permissão explícita do Pedro.

Bug crítico de "Cargas próximas" (036) corrigido e publicado: deploy de produção a partir de `bcc8884` (front com 036, INT, 037 e 038), Ready em https://backhaul-front.vercel.app.

## Fases
| Fase | Estado |
|---|---|
| 0–4 | concluídas |
| 5 — Fechamento do MVP | concluída (PRs #90–#93; deploy em 26/10) |
| 6 — Backend novo | em andamento (6.0 e Onda 0 concluídas; Onda 1) |

## Fase 6.0 — checklist
- [x] `git fetch`; `chore/trazer-main` com merge commit de `origin/main` (`e5d7a88`), sem conflitos → **PR #105 (aguarda merge do Pedro, merge commit)**
- [x] Produção conferida em 04/11: `/saude` 200; `propostas/minhas`, `certificacoes/minhas`, `certificacoes/pendentes`, `admin/{resumo,fretes,usuarios}`, `propostas/:id/mensagens` → 401 JSON (existem); rota inventada → 404 HTML
- [x] **CORS ok:** `OPTIONS /login` com `Origin: https://backhaul-front.vercel.app` → 204 com `access-control-allow-origin` (risco R2 resolvido)
- [x] Decisões do Pedro registradas em `decisoes.md` (sem datas; admin 040/041 sem protótipo; Lighthouse desktop Performance `warn`)
- [x] Lighthouse desktop `warn` → **PR #106 (aguarda merge)**
- [x] tech-lead: cards 026, 031–035 reescritos, 036–046 criados, ADR 0016 (chat), adendo ADR 0013 → **PR #107 (aguarda merge)**
- [x] integracao-api: tipos/fetchers/hooks/MSW de certificações, mensagens e admin + `divergencias-api.md` → **PR #108 ("INT"; precisa revisão + auditoria)**
- [x] designer: protótipos do 039 publicados e **aprovados pelo Pedro** (barra "Mais" no motorista, "Aprovações" no admin, 4 ícones novos)
- [x] Lista de cards aprovada pelo Pedro; issues #109–#119 criadas; #37, #46–#50 comentadas com a revisão
- [x] `pedido-ao-diogo.md` sem datas e com divergências novas (seção D2) → **Pedro envia ao Diogo**

## Cards da Fase 6
| # | Issue | Card | Modelo | Bloqueado por | Onda | Estado |
|---|---|---|---|---|---|---|
| 036 | #109 | Minhas propostas no formato real (crítico) | sonnet | — | 0 | **mergeado** (#122) |
| 037 | #110 | Validação de CPF/CNPJ/placa | sonnet | — | 0 | **mergeado** (#123) |
| 038 | #111 | 409 disponibilidade, 404 perfil, tetos, `nome` nulo | haiku | — | 0 | **mergeado** (#121) |
| 039 | #112 | Protótipos | designer | — | 0 | aprovado |
| INT | PR #108 | Contrato das rotas novas | integracao-api | — | 0 | **mergeado** (#108) |
| 040 | #113 | Admin: casca e resumo | sonnet | INT | 1 | **mergeado** (#125, 05/11); ressalvas A1–A4 da auditoria → 046 |
| 026 | #37 | Minhas propostas (tela) + "Mais" na barra | haiku | 036, PROTO | 1 | PR #124: revisão e auditoria aprovadas com ressalvas; **corrigindo itens 1–4 do "Mais"** (ordem do Pedro) antes do merge |
| 031 | #46 | Certificações do motorista | sonnet | INT, PROTO | 1 | PR #126: revisão aprovada com ressalvas; **corrigindo achados**; depois auditoria e integração com o #124 |
| 042 | #115 | Chat (empresa) | sonnet | INT, PROTO | 1 | PR #127: auditoria reprovou 1× (texto longo sem espaço cortado); **corrigindo**; depois reauditoria |
| 032 | #47 | Admin aprova certificações | haiku | 040, INT, PROTO | 2 | aguardando |
| 041 | #114 | Admin: fretes e usuários | haiku | 040, INT | 2 | aguardando |
| 043 | #116 | Chat (motorista) | haiku | 026, 042 | 2 | aguardando |
| 035 | #50 | Mapa sob demanda | sonnet | PROTO | 2 | aguardando |
| 033 | #48 | Cancelar carga | haiku | ROTA-P1 | 2 | bloqueado externo |
| 034 | #49 | Cancelar disponibilidade | haiku | ROTA-P2 | 2 | bloqueado externo |
| 044 | #117 | Comissão/origem/destino em fretes | haiku | ROTA-P4 | 2 | bloqueado externo |
| 045 | #118 | Roteiro, contas e ensaio | haiku | features + seeds no Neon | 3 | aguardando |
| 046 | #119 | E2E + auditoria final | sonnet | features | 3 | aguardando |

Ordem de merge (arquivos compartilhados): Onda 0: 036 → INT → 037 → 038 · Onda 1: 040 → 026 → 031 → 042 · Onda 2: 041 → 032 → 043 → 035 (+ 033/034/044 se as rotas saírem) · Onda 3: 046 por último.

Protótipo aprovado (Fase 2): https://claude.ai/artifact/VDeLDcq1BYMsMwfJVEV6sP · Protótipos da Fase 6 (aprovados): https://claude.ai/artifact/DogM2ZsRMyK9k16Q88fUg4
Site publicado: https://backhaul-front.vercel.app (último deploy de produção em 2026-11-04, a partir de `bcc8884`, com a Onda 0).

## Bloqueios e atenção
- **Integração #124 × #126 (armadilha sem conflito de texto):** `hourglass` sai duplicado em `icones.ts` e `Icone.test.tsx` → manter o do #124 e só o `award` do #126; em `itensDaArea.ts` o item Certificações precisa de `noMais: true` (cabeçalho com 5 links; barra com 3 itens + "Mais" com Disponibilidade e Certificações); ajustar `e2e/sessao.spec.ts` (desktop 5, demais 3) e `sessao.test.tsx`.
- Rate limit secundário do GitHub com vários `gh run watch` em paralelo: agentes usam `-i 120`.
- Falha de infraestrutura conhecida do Lighthouse no CI ("TimeoutError ... WS endpoint"): `gh run rerun <id> --failed` resolve.
- Playwright usa portas fixas (4173, 4010) compartilhadas entre worktrees: agentes em paralelo não rodam E2E/Lighthouse local; CI é a fonte.
- Ressalvas do #108 (`catalogo()` como prefixo; datas absolutas) resolvidas no #126 (031).
- Teste pré-existente instável: `cadastro/__tests__/empresa.test.tsx:215` falha na suíte completa (passa isolado) e `formulario.test.tsx` estourou timeout na linha de base (relato do integracao-api). Investigar no 037, que mexe nesse teste.
- `npm run lint` sai com código 2 ("ESLint output (JSON parse failed: EOF...)") na linha de base; `npx expo lint` passa. Conferir o script no CI.

## Pendências de baixa severidade da Onda 0 (para 045/046 ou card `fix:` posterior)
- 036: comentários desatualizados (`usePropostasDoMotorista.ts:60`, `tipos.ts:1-2`); título do teste "recusada ou aceita" só testa recusada; `comEstado` de `/propostas/minhas` sem teste direto; docs (`arquitetura.md`, `mvp.md`, `mapa-do-codigo.md`, ADR 0005) ainda chamam a rota de "4a / 404".
- 037: campo Placa sem `ajuda` com o formato antes do erro.
- 038: aviso de perfil não indica o que fazer (3.3.3); `refAviso` como função nova a cada render (`CorpoCargasProximas.tsx:209`).
- E2E de axe não cobre os estados de erro novos (aviso 409/404 no cartão, CPF/CNPJ/placa inválidos) → card 046.

## Pendências da Onda 1 que vão para o card 046
- 040 (A1): `Banner` com `role=alert` não anuncia no iOS; axe sem esperar o corpo carregar; foco depois de "Tentar de novo"; rótulo do gráfico passou a "Volume dos fretes entregues".
- 026: Dynamic Type 2× na barra de 4 colunas e no painel "Mais" (rótulos quebram no meio da palavra; `minWidth` fixo de 236); `accessibilityHint` no "Mais" quando a página atual está dentro dele; links "Ver frete de {tipo_carga}" com nomes repetidos.
- iPhone (Expo Go), VoiceOver e Dynamic Type seguem não verificados em aparelho.

## Limite de JS inicial
360 KiB (368.640 bytes), medido em bytes, por rota (adendo 3 do ADR 0011). **Após o PR #93 (TanStack só nas áreas logadas, adendo ao ADR 0004):** log do CI de 339,1 a 342,1 KiB por rota (antes: 355,0 a 357,9); `/entrar` 342,1 (antes 357,9). O TanStack ficou num chunk próprio de 18,0 KiB (`consultas-*.js`), aberto por `import()` junto com o corpo de cada tela de dados. Telas pesadas usam casca na rota + corpo em `src/telas` via `React.lazy` depois da hidratação (ADR 0003). Pendente da meta do adendo 3: alias mais enxuto do TanStack (opcional, o ganho já cumpriu ≤ 345 KiB).

## Dívida técnica conhecida (detalhes em `auditoria-final.md`)
- `BarraAbas` sticky sobrepõe alvos da primeira dobra no mobile (`target-size`); contornado na tela de publicar disponibilidade e na fixture da lista. Precisa de folga de rolagem sob a barra no template.
- Comissão some ao recarregar a página (`GET /fretes/meus` não a devolve); aparece só logo após o pagamento.
- Lighthouse mobile Performance 85–93 (aceito pelas decisões); Performance de desktop oscila no CI (0,88–1,00) e já reprovou PRs sem relação com a mudança (PR #88 só de docs passou ao reexecutar). Decisão pendente do Pedro: tornar `warn` no desktop como no mobile.
- iPhone/Expo Go, VoiceOver e Dynamic Type não verificados em nenhuma tela.
- Ajustes menores de revisão (ver PRs): foco após recusar proposta e após 409; `ResumoCarga` mostra o selo de urgência em carga expirada; `aria-controls` do combobox só com a lista aberta; helper único do rótulo "Nome - UF".

## Backend (dependências do Diogo)
- **CORS:** resolvido (verificado em 04/11).
- **Pedido da Fase 6:** `pedido-ao-diogo.md` (A1–A5, B1–B2, C, D, D2, E). Rotas ausentes: `GET /disponibilidades/minhas`, `POST /cargas/:id/cancelar`, `POST /disponibilidades/:id/cancelar`; extensões de `GET /fretes/meus` e `GET /propostas/minhas`.
- **Seed de demo:** escrito em `database/seed-demo.sql` (branch `feat/seed-demo`): 1 empresa, 1 motorista com MOPP aprovado e válido, 1 motorista sem MOPP (nenhuma linha em `motorista_certificacoes`) e 4 cargas (2 com MOPP, 2 sem) com origem em Uberlândia, Araguari e Tupaciguara. E-mail e senha não estão no arquivo: entram como variáveis do psql e o hash bcrypt é gerado no banco (pgcrypto). Pode rodar de novo, porque apaga as contas demo e o que veio delas antes de recriar. **Rodou no Neon? Não confirmado** (perguntado no pedido, item E2):
  ```sh
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -v email_empresa=... -v senha_empresa=... \
    -v email_mopp=... -v senha_mopp=... \
    -v email_sem_mopp=... -v senha_sem_mopp=... \
    -f database/seed-demo.sql
  ```
- `GET /propostas/minhas` existe desde a main de 04/11 (formato plano). `GET /disponibilidades/minhas` segue ausente: o plano B local continua (cada login do motorista republica a disponibilidade).
- Desejável: `percentual_comissao`/`valor_comissao` em `GET /fretes/meus`; 409 para disponibilidade não aberta; ping em `/saude` nos dias de ensaio e em 12/11.

## Depende do Pedro
- Permissão para cada merge da Onda 1 (ordem 026 → 031 → 042) e para iniciar a Onda 2.
- Enviar `pedido-ao-diogo.md` ao Diogo (resumo no fim do arquivo).
- Confirmar com o Diogo se `seed-demo.sql` e `seed-admin.sql` rodaram no Neon; credenciais fora do repo.
- Instalar Expo Go no iPhone e marcar uma sessão de teste com VoiceOver/Dynamic Type antes de 11/11.
- Confirmar com o professor que PWA conta como "instalável".
- Preencher o "Quadro de contas" do `roteiro-demo.md` **fora do repositório** depois do seed.
