# 031 — Motorista: minhas certificações

## Revisão 2026-11-04
- **Deixou de ser "se der"**: as rotas existem na `main` com contrato em `docs/api.md`, com **outros caminhos e outra semântica** que a proposta 4d usada antes:
  - D1 `GET /motorista/certificacoes` → **`GET /certificacoes/minhas`**, agora com `situacao` (`pendente`/`aprovada`/`vencida`) e **sem** `classificacao_onu` (juntar com `GET /certificacoes`, se for mostrar).
  - D2 `POST /motorista/certificacoes` → **`POST /certificacoes/minhas`**, que **cadastra e reenvia** (não existe `PUT`). Reenviar pendente ou vencida volta para `pendente` e responde `201`. `409` só quando já está aprovada e dentro da validade.
  - D3 `PUT` **não existe**: "editar" vira "reenviar" pelo mesmo POST.
- **Consome as peças do `integracao-api`** (branch `feat/contrato-fase6`): tipos, fetchers, hooks, chaves e handlers MSW de `GET`/`POST /certificacoes/minhas`. Este card **não recria** nada disso; se faltar algo, pedir no PR do `integracao-api`.
- Novo: borda de fuso da validade (ver "Regras") e o lugar do link no menu definido pelo protótipo 039.
- Bloqueios: 009, 012, 013 já em `front`; agora **INT** (PR do `integracao-api` em `front`) e **PROTO**.

| Campo | Valor |
|---|---|
| Itens MVP | MVP-19 |
| Prioridade | Fase 6 |
| Agente / modelo | `dev-front` / **sonnet** — tela nova com lista + formulário, campo de data em três partes sem padrão anterior, reenvio que muda a situação |
| Branch | `feat/031-certificacoes-motorista` |
| Estimativa | M (≈4 h) |
| Bloqueado por | INT · PROTO (039) |
| Bloqueia | 032 (desejável para a demo), 045, 046 |
| Onda | 1 |

## Objetivo
`/motorista/certificacoes`: o motorista envia MOPP/ONU para o admin aprovar, acompanha a situação e reenvia quando a certificação vence ou quando quer corrigir uma pendente.

## Rotas da API
- `GET /certificacoes` ✅: catálogo (`id`, `nome`, `classificacao_onu | null`), ordem alfabética.
- `GET /certificacoes/minhas` ✅: `{ certificacoes: [{ id, certificacao_id, nome, numero_certificado, validade: 'AAAA-MM-DD', validado_por_admin, situacao, criado_em }] }`, ordem alfabética. Erros: 401 · 403 · 404 sem perfil de motorista.
- `POST /certificacoes/minhas` ✅: `{ certificacao_id, numero_certificado (≤ 60), validade: 'AAAA-MM-DD' }` → `201 { certificacao: { id, certificacao_id, numero_certificado, validade, validado_por_admin: false, criado_em } }` (sem `nome` nem `situacao`: **recarregar a lista**, não inserir à mão). `400` com `erros` (`certificacao_id …`, `numero_certificado …`, `validade …`, `"validade não pode estar no passado"`, `"certificacao_id não corresponde a nenhuma certificação"`). `409 "certificação já aprovada e dentro da validade"`.

## Regras
- **Situação em texto:** `pendente` → "Aguardando aprovação"; `aprovada` → "Aprovada"; `vencida` → "Vencida". Rótulos em `lib/rotulos.ts`.
- **Reenvio:** pendente e vencida têm o botão "Reenviar" (abre o formulário já com a certificação e o número). Aviso fixo no formulário em modo reenvio: "Ao reenviar, a certificação volta para Aguardando aprovação."
- **Aprovada e vigente:** sem botão de reenvio; no seletor do formulário a opção aparece desabilitada (ou fora da lista) com "já aprovada".
- **Validade (borda de fuso):** o app valida "data real" (31/02 não passa) e "hoje ou depois" pelo **relógio local**. O backend compara com a data **UTC** (`new Date().toISOString()`): entre 21h e 24h no horário de Brasília, "hoje" ainda é recusado como passado. A API é a autoridade: a mensagem `400` vai para o grupo "Validade". Não tentar corrigir no front.

## Telas / componentes
- `src/app/motorista/certificacoes.tsx`: casca com `h1` "Minhas certificações" e `CorpoSobDemanda`.
- `src/telas/CorpoCertificacoesMotorista.tsx` + `.carregar.ts`: lista + formulário (sem atualização automática; botão "Atualizar").
- `src/telas/FormularioCertificacao.tsx`: react-hook-form (ADR 0007), `CampoSelecao` (certificação), `CampoTexto` (número, `maximo(60)`), campo de validade, `ResumoErros`, `aplicarErroApi` com o mapa `{ certificacao_id: 'certificacaoId', numero_certificado: 'numero', validade: 'validade' }`.
- `src/components/molecules/CampoDataPartes.tsx` (novo): três `CampoNumero` "Dia", "Mês", "Ano" dentro de um grupo com nome "Validade" (`role="group"` + `aria-labelledby`; web: `fieldset`/`legend` se o padrão do ADR 0009 permitir), erro único associado ao grupo. Função pura `montarData(dia, mes, ano) → 'AAAA-MM-DD' | null` em `src/lib/datas.ts` (ou `prazos.ts`).
- `src/components/organisms/CartaoCertificacao.tsx`: nome (`h3`), número, validade só data (`formatarValidade`), situação em texto + `Etiqueta`, "Reenviar" quando permitido.
- `itensDaArea.ts`: item "Certificações" do motorista **onde o protótipo 039 mandar** (a barra inferior com 5 itens a 320 px é risco; alternativa é link no cabeçalho ou em "Cargas próximas").

## Arquivos e pastas
Os acima + testes (`src/app/__tests__/certificacoes-motorista.test.tsx`, `CampoDataPartes.test.tsx`, teste de `montarData`), `e2e/certificacoes-motorista.spec.ts`, `e2e/rotas.ts` (`{ caminho: '/motorista/certificacoes', perfil: 'motorista' }`).

## Passos
1. Conferir em `front` as peças do INT (`src/api/certificacoes*.ts`, `chaves`, handlers MSW). Se o tipo não tiver `situacao` como união literal, ajustar no PR do INT, não aqui.
2. `montarData` + `CampoDataPartes` com testes.
3. Formulário (cadastro e reenvio no mesmo componente).
4. Lista + cartão + estados.
5. Casca da rota, menu, `e2e/rotas.ts`, E2E.

## Critérios de aceite
- [ ] Lista com nome, número, validade (só data) e situação em texto; ordem da API (MVP-19).
- [ ] Cadastro: `201` → mensagem "Certificação enviada. Aguardando aprovação." anunciada, lista recarregada mostrando "Aguardando aprovação".
- [ ] Reenvio de pendente ou vencida pelo mesmo POST; aviso de volta para "Aguardando aprovação" visível antes de enviar.
- [ ] Aprovada e vigente: sem reenvio na lista nem no seletor; se a API ainda devolver `409`, mostrar a mensagem e recarregar.
- [ ] Validade: data inexistente e data anterior a hoje (local) bloqueadas antes do POST; `400` da API (inclusive o de fuso) aparece no grupo "Validade".
- [ ] Número com mais de 60 caracteres bloqueado no campo.
- [ ] Vazio: "Você ainda não enviou certificações" + o formulário visível.
- [ ] 500/rede → `EstadoErro` com "Tentar de novo"; 404 de perfil → mensagem; 401 → login (global).
- [ ] Rota em `e2e/rotas.ts`; Portões do ADR 0013; JS inicial ≤ 360 KiB, corpo e formulário fora do JS inicial.

## Testes exigidos
- Unidade: `montarData` (29/02 em ano bissexto e não bissexto, 31/04, mês 13, ano com 2 dígitos).
- Tela (RNTL + MSW): lista com as 3 situações, vazio, cadastro 201, reenvio, validade no passado bloqueada, 400 por campo, 409, 500, 401.
- E2E: cadastro só por teclado; axe com o formulário com erro.

## Checklist de acessibilidade e performance
- [ ] Grupo "Validade" com "Dia", "Mês", "Ano" rotulados e o erro ligado ao grupo; foco vai ao resumo de erros ao enviar com erro.
- [ ] "Reenviar" com nome único ("Reenviar MOPP - Classe 3 Inflamáveis").
- [ ] Situação em texto, não só cor.
- [ ] Nenhum seletor de data nativo (mesma decisão de D-PO-02).
