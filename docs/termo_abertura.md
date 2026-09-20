# Termo de Abertura do Projeto

**Projeto:** Backhaul
**Subtítulo:** Plataforma de Conexão de Fretes por Urgência
**Data:** 03/09/2026
**Versão:** 1.0 — Checkpoint 1
**Status:** Em desenvolvimento

---

## 1. Justificativa do Projeto

Cerca de 40% dos caminhões no Brasil retornam vazios após a entrega de uma carga, segundo dados da ANTT. Esse retorno sem frete representa prejuízo direto para o caminhoneiro e uma ineficiência para o setor de logística como um todo.

Do outro lado, empresas com necessidade de despachar carga com pouco prazo frequentemente não conseguem encontrar rapidamente um caminhoneiro disponível e compatível, recorrendo a intermediários que cobram comissões elevadas ou perdendo prazos de entrega por falta de transporte na hora certa.

O projeto Backhaul nasce para resolver esse descompasso, conectando caminhoneiros disponíveis a fretes urgentes de forma rápida e direta, no momento em que a necessidade surge dos dois lados.

## 2. Objetivo do Projeto

Conectar caminhoneiros disponíveis a fretes urgentes próximos, de forma rápida, reduzindo o percentual de retorno vazio e ajudando empresas a encontrar transporte para cargas com urgência de coleta.

**Diferencial:** o foco não é apenas "conectar carga com caminhão" — funcionalidade já oferecida por plataformas consolidadas do mercado (Fretebras, CargoX, TruckPad). O diferencial é o **matching por urgência**, priorizando o momento exato em que motorista e embarcador precisam um do outro.

## 3. Escopo Macro

### Dentro do escopo (checkpoints iniciais)
- Modelagem do banco de dados (modelo ER e script SQL)
- Cadastro e validação de motoristas e empresas
- Validação de certificações de motorista para cargas perigosas (ex: MOPP)
- Publicação de chamados de disponibilidade e de carga
- Matching automático entre chamados compatíveis
- Fluxo de aceite/contraproposta e fechamento de frete
- Canal de mensagens monitorado entre as partes, liberado após proposta aberta

### Fora do escopo por enquanto
- Aplicativos móveis completos (os checkpoints iniciais focam em banco de dados e backend)
- Avaliações, histórico completo e integrações com sistemas externos (TMS)
- Escolha final de gateway de pagamento e região piloto — itens ainda em aberto

## 4. Partes Interessadas (Stakeholders)

| Parte interessada | Papel no projeto |
|---|---|
| Motorista (caminhoneiro) | Usuário final que abre chamados de disponibilidade e aceita fretes |
| Empresa / Embarcador | Usuário final que publica cargas e contrata fretes |
| Administrador da plataforma | Modera cadastros, disputas e acompanha métricas |
| Equipe do projeto | Responsável pelo desenvolvimento e entrega das etapas |
| Professor / Avaliador | Avalia os checkpoints e a defesa técnica (Live Code) |

## 5. Premissas e Restrições

- O banco de dados é implementado em **PostgreSQL** com a extensão **PostGIS**, para suportar buscas geográficas de proximidade.
- O backend será construído em **Node.js com TypeScript**; os aplicativos, em **React Native**.
- A região piloto e o percentual de comissão ainda não foram definidos e serão formalizados em checkpoint futuro.
- Pagamento e validação documental dependem de integração com serviços terceirizados (gateway de pagamento e validador de CNH/CNPJ/certificações).

## 6. Riscos Iniciais

| Risco | Mitigação |
|---|---|
| Baixa densidade de usuários na região piloto, reduzindo o valor do matching | Concentrar o lançamento em 1-2 corredores logísticos de alto tráfego |
| Partes negociarem fora da plataforma para evitar a comissão | Oferta com contraproposta única + chat monitorado com bloqueio de contatos |
| Equipe com pouca experiência prévia em parte da stack técnica | Curva de aprendizado guiada, começando pelo banco de dados e por fatias pequenas e funcionais |
| Atraso na integração com gateway de pagamento externo | Definir esse fornecedor com antecedência, antes do checkpoint que depende de pagamento |

## 7. Critérios de Sucesso

- Modelo de dados aprovado, cobrindo todas as entidades do fluxo essencial
- Script SQL executa sem erros e reflete fielmente o modelo ER apresentado
- Capacidade de explicar e modificar o banco de dados ao vivo, durante a defesa técnica
- Histórico de commits no GitHub demonstrando evolução incremental e autoria de todos os membros

## 8. Equipe e Responsabilidades

| Nome / Usuário GitHub | Responsabilidade |
|---|---|
| Diogo ([Diogo-Rodrigues00](https://github.com/Diogo-Rodrigues00)) | _[preencher]_ |
| [PedroAugusto2208](https://github.com/PedroAugusto2208) | _[preencher]_ |
| [MateuHuTv](https://github.com/MateuHuTv) | _[preencher]_ |
| [GustavoF](https://github.com/GustavoF) | _[preencher]_ |
| [guilherme508](https://github.com/guilherme508) | _[preencher]_ |

## 9. Aprovação

Este Termo de Abertura foi revisado e aprovado pela equipe do projeto para dar início às atividades de desenvolvimento.

---
