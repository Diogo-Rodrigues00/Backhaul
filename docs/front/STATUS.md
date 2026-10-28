# STATUS — Front-end do Backhaul

_Atualizado em 2026-10-23, véspera do congelamento de funcionalidades (24/10)._

## Fase atual
**Fase 5 — Fechamento.** O fluxo principal do MVP está completo e mergeado em `front`. Resta: PR #90 (home e menu), janela de correção 25–28/10, ensaio em 28/10, apresentação em 29/10 e Mostra Tech em 12/11.

## Fases
| Fase | Estado |
|---|---|
| 0 — Preparação | concluída |
| 1 — Grill do produto | concluída (PRD + MVP aprovados em 2026-10-20) |
| 2 — Arquitetura e cards | concluída (cards, ADRs, DS e protótipo aprovados) |
| 3 — Fundação | concluída (cards 001–008) |
| 4 — Execução dos cards | concluída para o MVP (cards 009–030, exceto 026) |
| 5 — Fechamento | em andamento |

## Cards por estado
Lista completa em `cards/README.md`. Cards 001–035 = issues #16–#50.

| Estado | Cards |
|---|---|
| Mergeados | 001–025, 027, 028, 029, 030 (issues fechadas); PRs #90–#93 |
| Em PR | nenhum |
| Cortado do MVP | 026 Minhas propostas (depende da rota 4a do Diogo; só no backlog) |
| "Se der", não iniciados | 031 certificações do motorista, 032 admin aprova certificações, 033 cancelar carga, 034 cancelar disponibilidade, 035 mapa |

Protótipo aprovado: https://claude.ai/artifact/VDeLDcq1BYMsMwfJVEV6sP
Site publicado: https://backhaul-front.vercel.app (último deploy de produção em 2026-10-26, com `front` atualizado após o PR #93).

## Limite de JS inicial
360 KiB (368.640 bytes), medido em bytes, por rota (adendo 3 do ADR 0011). **Após o PR #93 (TanStack só nas áreas logadas, adendo ao ADR 0004):** log do CI de 339,1 a 342,1 KiB por rota (antes: 355,0 a 357,9); `/entrar` 342,1 (antes 357,9). O TanStack ficou num chunk próprio de 18,0 KiB (`consultas-*.js`), aberto por `import()` junto com o corpo de cada tela de dados. Telas pesadas usam casca na rota + corpo em `src/telas` via `React.lazy` depois da hidratação (ADR 0003). Pendente da meta do adendo 3: alias mais enxuto do TanStack (opcional, o ganho já cumpriu ≤ 345 KiB).

## Dívida técnica conhecida (detalhes em `auditoria-final.md`)
- `BarraAbas` sticky sobrepõe alvos da primeira dobra no mobile (`target-size`); contornado na tela de publicar disponibilidade e na fixture da lista. Precisa de folga de rolagem sob a barra no template.
- Comissão some ao recarregar a página (`GET /fretes/meus` não a devolve); aparece só logo após o pagamento.
- Lighthouse mobile Performance 85–93 (aceito pelas decisões); Performance de desktop oscila no CI (0,88–1,00) e já reprovou PRs sem relação com a mudança (PR #88 só de docs passou ao reexecutar). Decisão pendente do Pedro: tornar `warn` no desktop como no mobile.
- iPhone/Expo Go, VoiceOver e Dynamic Type não verificados em nenhuma tela.
- Ajustes menores de revisão (ver PRs): foco após recusar proposta e após 409; `ResumoCarga` mostra o selo de urgência em carga expirada; `aria-controls` do combobox só com a lista aberta; helper único do rótulo "Nome - UF".

## Backend (dependências do Diogo)
- **CORS:** `https://backhaul-front.vercel.app` NÃO está no `CORS_ORIGIN` do Render (só `localhost:8081`): o site publicado não loga. **Bloqueia a demo real.**
- **Seed de demo:** escrito em `database/seed-demo.sql` (branch `feat/seed-demo`): 1 empresa, 1 motorista com MOPP aprovado e válido, 1 motorista sem MOPP (nenhuma linha em `motorista_certificacoes`) e 4 cargas (2 com MOPP, 2 sem) com origem em Uberlândia, Araguari e Tupaciguara. E-mail e senha não estão no arquivo: entram como variáveis do psql e o hash bcrypt é gerado no banco (pgcrypto). Pode rodar de novo, porque apaga as contas demo e o que veio delas antes de recriar. **Falta rodar no Neon** antes do ensaio de 28/10:
  ```sh
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -v email_empresa=... -v senha_empresa=... \
    -v email_mopp=... -v senha_mopp=... \
    -v email_sem_mopp=... -v senha_sem_mopp=... \
    -f database/seed-demo.sql
  ```
- **Rotas ausentes:** `GET /propostas/minhas` e `GET /disponibilidades/minhas` (404 em produção). O front usa plano B local no aparelho (cada login do motorista exige publicar a disponibilidade de novo).
- Desejável: `percentual_comissao`/`valor_comissao` em `GET /fretes/meus`; 409 para disponibilidade não aberta; ping em `/saude` em 28/10, 29/10 e 12/11.

## Depende do Pedro
- Mandar ao Diogo o texto de CORS, seed e rotas (acima).
- Instalar Expo Go no iPhone (desligar atualização automática de apps até 12/11; mesma conta Expo no iPhone e no CLI).
- Confirmar com o professor que PWA conta como "instalável".
- Preencher o "Quadro de contas" do `roteiro-demo.md` **fora do repositório** depois do seed.
- Decidir: Performance de desktop como `warn`; antecipar a otimização do TanStack (recomendado depois do #90).
- Opcional: proteção da branch `front` (comando no PR #54; o CI só roda com mudança em `app/**`).
- Opcional: GitHub Projects (`gh auth refresh -s read:project,project`).

## Janela 25–28/10 (só correção, acabamento, a11y e Lighthouse)
1. ~~Otimização estrutural do JS (TanStack nas áreas)~~ feita no PR #93.
2. Folga de rolagem sob a barra de abas (`target-size`).
3. Verificar no iPhone (Expo Go) e com leitor de tela.
4. Ensaio em 28/10 no ambiente hospedado, 2 vezes seguidas, seguindo `roteiro-demo.md`.
5. Vídeo de backup da demo.
