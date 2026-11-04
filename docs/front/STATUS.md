# STATUS — Front-end do Backhaul

_Atualizado em 2026-11-04 (Fase 6.0, orquestrador)._

## Fase atual
**Fase 6 — Backend novo: 6.0 (preparação) quase concluída; Onda 0 em execução.** Spec: `spec-fase-backend-novo.md` (os cards em `cards/` são a fonte vigente). Sem cronograma com datas (decisão do Pedro em 04/11): ondas em ordem, até onde der antes da Mostra Tech (12/11).

**Bug crítico em produção:** "Cargas próximas" do motorista quebra com proposta pendente (`usePropostasDoMotorista.ts` lê `p.carga.id`; a API devolve `chamado_carga_id`) → card 036 (#109), primeiro a mergear, deploy logo depois.

## Fases
| Fase | Estado |
|---|---|
| 0–4 | concluídas |
| 5 — Fechamento do MVP | concluída (PRs #90–#93; deploy em 26/10) |
| 6 — Backend novo | em andamento (6.0 + Onda 0) |

## Fase 6.0 — checklist
- [x] `git fetch`; `chore/trazer-main` com merge commit de `origin/main` (`e5d7a88`), sem conflitos → **PR #105 (aguarda merge do Pedro, merge commit)**
- [x] Produção conferida em 04/11: `/saude` 200; `propostas/minhas`, `certificacoes/minhas`, `certificacoes/pendentes`, `admin/{resumo,fretes,usuarios}`, `propostas/:id/mensagens` → 401 JSON (existem); rota inventada → 404 HTML
- [x] **CORS ok:** `OPTIONS /login` com `Origin: https://backhaul-front.vercel.app` → 204 com `access-control-allow-origin` (risco R2 resolvido)
- [x] Decisões do Pedro registradas em `decisoes.md` (sem datas; admin 040/041 sem protótipo; Lighthouse desktop Performance `warn`)
- [x] Lighthouse desktop `warn` → **PR #106 (aguarda merge)**
- [x] tech-lead: cards 026, 031–035 reescritos, 036–046 criados, ADR 0016 (chat), adendo ADR 0013 → **PR #107 (aguarda merge)**
- [x] integracao-api: tipos/fetchers/hooks/MSW de certificações, mensagens e admin + `divergencias-api.md` → **PR #108 ("INT"; precisa revisão + auditoria)**
- [ ] designer: protótipos do 039 (em andamento) → publicar Artifact → aprovação do Pedro
- [x] Lista de cards aprovada pelo Pedro; issues #109–#119 criadas; #37, #46–#50 comentadas com a revisão
- [x] `pedido-ao-diogo.md` sem datas e com divergências novas (seção D2) → **Pedro envia ao Diogo**

## Cards da Fase 6
| # | Issue | Card | Modelo | Bloqueado por | Onda | Estado |
|---|---|---|---|---|---|---|
| 036 | #109 | Minhas propostas no formato real (crítico) | sonnet | — | 0 | em execução |
| 037 | #110 | Validação de CPF/CNPJ/placa | sonnet | — | 0 | em execução |
| 038 | #111 | 409 disponibilidade, 404 perfil, tetos, `nome` nulo | haiku | — | 0 | em execução |
| 039 | #112 | Protótipos | designer | — | 0 | em execução |
| INT | PR #108 | Contrato das rotas novas | integracao-api | — | 0 | PR aberto |
| 026 | #37 | Minhas propostas (tela) | haiku | 036, PROTO | 1 | aguardando |
| 031 | #46 | Certificações do motorista | sonnet | INT, PROTO | 1 | aguardando |
| 040 | #113 | Admin: casca e resumo | sonnet | INT | 1 | aguardando |
| 042 | #115 | Chat (empresa) | sonnet | INT, PROTO | 1 | aguardando |
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

Protótipo aprovado (Fase 2): https://claude.ai/artifact/VDeLDcq1BYMsMwfJVEV6sP · Protótipos da Fase 6: pendente.
Site publicado: https://backhaul-front.vercel.app (último deploy de produção em 2026-10-26).

## Bloqueios e atenção
- PRs #105–#107 só mergeiam pelo Pedro por enquanto: o modo automático bloqueou `gh pr merge` do orquestrador ("Merge Without Review"). #105 com **merge commit**.
- Teste pré-existente instável: `cadastro/__tests__/empresa.test.tsx:215` falha na suíte completa (passa isolado) e `formulario.test.tsx` estourou timeout na linha de base (relato do integracao-api). Investigar no 037, que mexe nesse teste.
- `npm run lint` sai com código 2 ("ESLint output (JSON parse failed: EOF...)") na linha de base; `npx expo lint` passa. Conferir o script no CI.

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
- Mergear os PRs #105 (merge commit), #106 e #107 — ou liberar `gh pr merge` para o orquestrador.
- Enviar `pedido-ao-diogo.md` ao Diogo (resumo no fim do arquivo).
- Aprovar os protótipos do 039 (Artifact, quando o designer entregar).
- Confirmar com o Diogo se `seed-demo.sql` e `seed-admin.sql` rodaram no Neon; credenciais fora do repo.
- Instalar Expo Go no iPhone e marcar uma sessão de teste com VoiceOver/Dynamic Type antes de 11/11.
- Confirmar com o professor que PWA conta como "instalável".
- Preencher o "Quadro de contas" do `roteiro-demo.md` **fora do repositório** depois do seed.
