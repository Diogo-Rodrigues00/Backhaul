# Demo: passo do pagamento Pix (complemento do roteiro)

O `docs/front/roteiro-demo.md` foi escrito antes do gateway. Neste ponto ele está desatualizado: o passo 8 ("Pagar frete") agora gera um **Pix de verdade no sandbox do Asaas**. Este arquivo substitui só esse trecho.

## Antes de subir ao palco (10 min antes)
1. Abra `https://backhaul-api.onrender.com/saude` até responder `ok` (a API dorme e leva ~50 s para acordar).
2. Rode o `seed-demo.sql` de novo (volta o cenário ao início; ver cabeçalho do arquivo). Use a cópia local, fora do repositório, com e-mails e senhas.
3. Abra o painel do **sandbox do Asaas** (conta da plataforma) em outra aba, já logado, em *Cobranças*.
4. Um navegador (ou janela anônima) por papel: empresa, motorista e, se for mostrar, admin.
5. Use fretes de **até R$ 3.000** (o sandbox limita Pix à noite).

## O passo do pagamento (substitui o passo 8)
| # | Quem | Ação | O que aparece | O que falar |
|---|---|---|---|---|
| 8a | Empresa | **Meus fretes → Pagar frete** | QR Code e Pix copia e cola | "A API cria a cobrança no gateway; o dinheiro não passa pela nossa conta bancária." |
| 8b | Você | No painel do Asaas, abra a cobrança e **confirme o pagamento** | O Asaas avisa a API pelo webhook | "No sandbox ninguém paga de verdade; aqui simulamos o banco da empresa." |
| 8c | Empresa | Atualizar a lista (sem recarregar a página, se o front exigir) | Pagamento **retido** | "Retido: o dinheiro fica com a plataforma até a entrega." |
| 9 | Motorista | **Confirmar entrega** | Pagamento **liberado** | "A plataforma repassa ao motorista a parte dele (frete − 5%)." |

Regras que a API aplica e que vale mostrar: o frete só vai a `em_transito` com pagamento retido; só entrega com chave Pix cadastrada pelo motorista; o webhook repetido não duplica nada (idempotência).

## Se algo falhar
| Sintoma | Causa provável | O que fazer |
|---|---|---|
| "Serviço de pagamento indisponível" | Asaas fora ou chave errada no Render | Falar que é o sandbox; mostrar o vídeo de backup |
| Pagou no painel e continua "pendente" | Webhook não chegou (token ou fila pausada no Asaas) | Aguardar ~1 min; conferir *Webhooks* no Asaas |
| Entrega devolve 502 | Transferência real recusada pelo sandbox | O repasse simulado (`PAGAMENTOS_REPASSE=simulado`) evita isso; confirmar que está no Render |
| API lenta na primeira chamada | Render dormindo | Abrir `/saude` antes |

## Sobre o repasse
Em 14/11 o `POST /transfers` do sandbox respondia "erro desconhecido", mesmo com payload mínimo. Por isso a demo usa o repasse **simulado**: a cobrança e o webhook são reais, só o envio final do dinheiro ao motorista é simulado. Se o teste de 15/11 funcionar, a variável sai do Render e o repasse passa a ser real.
