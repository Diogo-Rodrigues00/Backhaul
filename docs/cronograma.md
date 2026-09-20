# Cronograma do Projeto — Backhaul

> Este cronograma é atualizado a cada checkpoint (CP). Os detalhes de CP-2 a CP-5 abaixo são um rascunho inicial baseado na evolução natural do projeto — ajustem as datas e entregas exatas assim que o professor detalhar cada checkpoint (do mesmo jeito que fez para o CP-1).

## Visão geral

| Checkpoint | Semana (aprox.) | Foco principal | Status |
|---|---|---|---|
| CP-1 | Semana 4 — 03/09/2026 | Banco de dados: modelo ER, script SQL, banco rodando | 🔄 Em andamento |
| CP-2 | A confirmar | Backend / API: autenticação, cadastro, chamados | ⏳ Não iniciado |
| CP-3 | A confirmar | Matching, propostas e fluxo de negociação (chat monitorado) | ⏳ Não iniciado |
| CP-4 | A confirmar | Pagamentos, certificações de carga perigosa, telas do app | ⏳ Não iniciado |
| CP-5 | A confirmar | Integração final, testes e Relatório Final | ⏳ Não iniciado |

## CP-1 — Banco de Dados (Semana 4 · 03/09/2026)

**Entregáveis técnicos**
- [x] Script SQL de criação (DDL)
- [ ] Script SQL de dados iniciais (INSERTs de exemplo)
- [x] Modelo ER documentado
- [ ] Modelo ER como diagrama visual salvo no repositório
- [x] Banco rodando localmente
- [ ] README explicando tabelas e relacionamentos

**Documentos de gestão**
- [ ] Termo de Abertura em `/docs`
- [ ] Cronograma em `/docs`
- [ ] Mínimo 2 atas de reunião (semanas S03 e S04)
- [ ] Board/Kanban configurado no GitHub

**GitHub**
- [x] Repositório criado e organizado
- [x] Commits descritivos (Diogo)
- [ ] Commits de todos os membros
- [ ] Todos os membros como colaboradores

## CP-2 — Backend / API (rascunho)

- Autenticação de usuários (motorista, empresa, admin)
- Endpoints de cadastro e validação (CNH, CNPJ, certificações)
- Endpoints para publicar chamados de disponibilidade e de carga
- Atualizar Termo de Abertura e Cronograma se o escopo mudar
- Continuar registrando atas semanalmente

## CP-3 — Matching e Negociação (rascunho)

- Lógica de matching automático (PostGIS: busca por proximidade)
- Fluxo de proposta: aceite / contraproposta única
- Chat de negociação monitorado (liberado após proposta aberta)

## CP-4 — Pagamentos e Telas (rascunho)

- Integração com gateway de pagamento (comissão retida)
- Validação de certificação para cargas perigosas no fluxo de matching
- Telas principais do aplicativo (React Native)

## CP-5 — Integração Final e Relatório (rascunho)

- Testes end-to-end do fluxo completo
- Ajustes finais de UI/UX e correções
- Relatório Final (1 página: planejado vs. entregue + lições aprendidas)

---

**Observação:** este arquivo deve ser reaberto e atualizado a cada checkpoint — marcar o que foi concluído, ajustar datas e adicionar o que for detalhado pelo professor para os próximos CPs.
