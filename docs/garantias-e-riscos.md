# Garantias, riscos e perguntas prováveis da banca

Este documento separa com honestidade **o que o Backhaul já faz** do que é **evolução planejada**.

## O que já existe (implementado)

| Garantia | Como funciona |
|---|---|
| **Pagamento antes do transporte** | O frete só vai a `em_transito` se o pagamento estiver `retido` (Pix confirmado pelo gateway). |
| **Dinheiro retido até a entrega** | O valor fica com a plataforma e só é liberado quando o motorista marca `entregue`. O repasse é frete − 5% de comissão. |
| **Gateway regulado** | O Pix passa pelo Asaas, que emite comprovante. A plataforma não toca em dados de cartão nem de conta. |
| **Sem pagamento duplicado** | O webhook é idempotente (`eventos_pagamento`, UNIQUE por gateway e evento) e a cobrança é única por frete. |
| **Dinheiro sem erro de arredondamento** | Cálculos em centavos inteiros. |
| **Motorista habilitado** | Cargas perigosas exigem certificação (ex.: MOPP) aprovada pelo admin e dentro da validade, conferida na busca e no aceite. |
| **Contas controladas** | Admin desativa usuário (sem apagar o histórico). A conta desativada perde o acesso na hora. Ação registrada em `logs_auditoria`. |
| **Segurança básica** | Senhas com bcrypt, JWT com validade, perfis separados (motorista, empresa, admin), webhook protegido por token. |

## O que ainda NÃO existe (roadmap)

1. **Prova de entrega pelo recebedor.** Hoje o motorista marca "entregue" sozinho. Proposta: **código de entrega (PIN) de 6 dígitos** gerado ao sair para a rota, visível só para a empresa. O recebedor o informa ao motorista, que só consegue concluir digitando o código. Depois: foto do canhoto e assinatura digital.
2. **Documento fiscal.** Emissão ou anexo de CT-e / NF-e, que é a prova legal do transporte.
3. **Disputa.** Fluxo de "não recebi / avaria", com o dinheiro retido enquanto o admin decide. Hoje a retenção existe, mas a mediação é manual.
4. **Verificação de identidade** (CNH, antecedentes) e avaliação entre as partes.
5. **Seguro de carga** e rastreamento em tempo real.
6. **Conciliação automática** de pagamentos com o gateway e validação de saque por webhook.

## Respostas prontas

- **"E se a empresa não pagar?"** O frete não sai de `aceito` sem o pagamento retido. O motorista só roda com o dinheiro garantido.
- **"E se o motorista sumir com a carga?"** Hoje: o dinheiro não é liberado sem a entrega, o que protege a empresa financeiramente. A carga em si depende de seguro e de checagem de identidade (roadmap).
- **"E se disserem que não receberam?"** O dinheiro fica retido; o admin vê o frete e o pagamento no painel. A prova forte (PIN, foto, assinatura) é a próxima evolução.
- **"Como sabem que o recebedor recebeu?"** Hoje só pela confirmação do motorista. Por isso o PIN de entrega é a primeira melhoria.
- **"Dá para excluir um usuário? E a LGPD?"** Desativamos a conta e cancelamos o que está aberto. Não apagamos fretes e transações porque o histórico financeiro precisa ser guardado para obrigações legais. Pedido de exclusão de dados pessoais seria tratado com anonimização dos campos pessoais, mantendo os registros financeiros.
- **"O sistema ganha dinheiro como?"** Comissão de 5% sobre cada frete entregue. No sandbox o Asaas cobra cerca de R$ 0,99 por Pix recebido, o que entra na conta de viabilidade.
- **"Por que o repasse é simulado na demo?"** O sandbox do Asaas recusou transferências em 14/11 ("erro desconhecido") mesmo com payload mínimo. Cobrança e webhook são reais; só o envio final está simulado. Ver `docs/pagamentos.md`.
- **"Funciona em produção?"** Precisa de CNPJ da plataforma para abrir a conta de produção no gateway. É um passo de negócio, não de código.
