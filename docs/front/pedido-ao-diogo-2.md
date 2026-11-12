# Pedido ao Diogo 2 — Pix e rotas que ainda faltam

_2026-11-12, do Pedro (front). Complementa o [`pedido-ao-diogo.md`](pedido-ao-diogo.md) (não o substitui). Sem prazo além do congelamento de mudanças de 14/11: depois dele, o front não muda e o backend só muda com aviso. O front executa cada item assim que ele estiver na `main` com o contrato no `docs/api.md`._

Diogo, as duas telas do Pix estão prontas e publicadas em <https://backhaul-front.vercel.app>: a chave Pix do motorista (`/motorista/chave-pix`) e o pagamento por Pix da empresa (em "Meus fretes"). Hoje elas funcionam com o modo simulado do servidor. Para mostrar o QR de verdade, esperam o **modo de teste (sandbox) ligado no servidor**, que é o seu PR #137. O front mostra o texto de erro da API tal como ele vem, por isso as mensagens exatas importam.

Cada item abaixo diz o que o front faz hoje e o que muda com a sua resposta. Onde eu li o código na `main` ou o corpo do #137, está dito; o resto são perguntas, não contratos.

## P1. Pix: dúvidas de contrato (PR #137)

Contexto do que eu li no corpo do #137 (rascunho): com `PAGAMENTOS_MODO=sandbox`, `POST /fretes/:id/pagamento` cria a transação `pendente` e devolve `pix.copia_e_cola` e `qr_code_base64`; falha do gateway vira 502 e "a transação inteira volta atrás"; pagar frete já entregue não é permitido no modo gateway. Com o modo simulado (padrão) nada muda.

| | Dúvida | Por que importa para o front |
|---|---|---|
| a | **Como refazer o Pix se ele expirar antes do pagamento?** Hoje o `POST` repetido responde `409 "frete já foi pago"` (`backend/src/rotas/fretes.ts:177` na `main`) e a empresa fica sem saída. | A tela mostra o QR enquanto ele vale e esconde o painel quando expira. Depois disso, não há rota para gerar outro: precisamos de uma (por exemplo, o `POST` voltar a gerar a cobrança quando a transação `pendente` expirou) ou de outra rota, a sua escolha. |
| b | O `GET /fretes/meus` pode trazer o `pix` (ou ao menos `pix_expira_em`) enquanto `status_pagamento` for `pendente`? | Se a empresa recarregar a página, o QR se perde: o `POST` só devolve o Pix na resposta em que cria a cobrança. A tabela `transacoes` já tem `pix_copia_cola` e `expira_em` (`docs/pagamentos.md`). |
| c | O 502 do gateway chega **depois** de gravar a transação `pendente`? | Pelo corpo do #137, a transação volta atrás e o "Tentar de novo" funciona. Se ela ficar gravada, o "Tentar de novo" cai no 409 do item (a). Peço a confirmação, inclusive para o caso de o gateway aceitar e o `COMMIT` falhar (risco que o #137 já registra). |
| d | **Mensagens exatas** de dois 409: (1) pagar frete `entregue` no modo de teste; (2) "aguardando a confirmação do pagamento da empresa" (pelo #137, o transporte só inicia com o pagamento `retido`). | O front exibe o texto da API tal como vem. Se a frase mudar entre o #137 e a `main`, as telas e os testes mostram a frase errada. |
| e | Quando o Pix **expira no gateway**, a transação muda de status? Qual? | Hoje o front só enxerga `pendente` até o pagamento; sem esse status ele não sabe se deve oferecer "gerar outro" (item a). |
| f | O front reconhece o atalho **"Cadastrar chave Pix"** pelo trecho "chave Pix" no texto do 409 da entrega. | Se mudar a frase, o atalho some sem erro nenhum. Avise antes de mudar, **ou** devolva um campo estável no corpo do 409 (por exemplo, `codigo: "chave_pix_ausente"`); aí o front passa a usá-lo no lugar do texto. |
| g | **Como ligar `PAGAMENTOS_MODO=sandbox` no Render, e a partir de que dia ele estará ligado?** | O #137 cita `PAGAMENTOS_MODO=sandbox`, `ASAAS_API_KEY` (chave do sandbox) e `ASAAS_WEBHOOK_TOKEN`, a URL `/webhooks/asaas` cadastrada no painel do sandbox, e diz para não fazer deploy antes da Mostra Tech. Preciso saber se e quando vai ligar, para o roteiro da demo escolher entre QR de verdade e modo simulado. Os valores das chaves ficam só no Render, nunca neste repositório. |
| h | `GET` e `PUT /motorista/chave-pix`: o que o campo telefone aceita? | O `docs/api.md` (linha 371, na `main`) já diz: CPF, CNPJ e telefone saem só com dígitos, telefone com 11 dígitos, `+55` aceito. O front envia o que o usuário digita e mostra a chave **normalizada** que a API devolve. Peço só a confirmação de que isso vale, inclusive para `+55` com espaços ou parênteses. |

## P2. Rotas que ainda não existem na `main`

Verificado em 12/11 em `origin/main` (`git show origin/main:backend/src/rotas/...`). O front só usa cada uma quando houver rota **e** o contrato em `docs/api.md`. Contrato completo, erros e o que quebra sem cada item estão no [`pedido-ao-diogo.md`](pedido-ao-diogo.md), seções A e B; aqui só o resumo.

| Item | O que falta | O que destrava no front |
|---|---|---|
| A1 | `POST /cargas/:id/cancelar` | Card **033** (cancelar carga) |
| A2 | `POST /disponibilidades/:id/cancelar` | Card **034** (cancelar disponibilidade) |
| A3 | `GET /disponibilidades/minhas` | "Minhas disponibilidades" sobrevive a recarregar a página e a trocar de aparelho (hoje o app guarda a disponibilidade no aparelho) |
| A4 | Extensão de `GET /fretes/meus`: `proposta_id`, `origem`, `destino` e, só para a empresa, `comissao` | Card **044** e a comissão que hoje some ao recarregar a página |
| A5 | Extensão de `GET /propostas/minhas`: `origem`, `destino`, `urgencia`, `certificacao_exigida`, `carga_status`, `carga_expira_em` | "Minhas propostas" poder dizer que a carga não está mais disponível |
| B1 | Regras do aceite (ver nota abaixo) | Evita o mesmo motorista com dois fretes na mesma disponibilidade |
| B2 | Status `expirado` em `GET /cargas/minhas` | "Minhas cargas" deixa de depender do `expira_em` para mostrar "expirada" |

**Nota sobre o B1, conferida na `main`:** parte já existe. `POST /propostas` responde `409 "disponibilidade não está mais aberta"` quando a disponibilidade não está `aberto` ou venceu (`backend/src/rotas/propostas.ts`, por volta da linha 103), e `409 "você já fez a contraproposta única para esta carga"` para a segunda contraproposta. **O que continua faltando** é o que o pedido anterior descreve para o aceite (`POST /propostas/:id/responder`, `aceitar`): conferir que a disponibilidade da proposta ainda está `aberto`; recusar as propostas `pendente` do mesmo motorista (mesma disponibilidade) em **outras** cargas (hoje o aceite só recusa as outras propostas da **mesma carga**); e o 409 para proposta de aceite repetida na mesma carga (hoje só a contraproposta tem esse 409).

## P3. Robustez e privacidade (seções C e D do pedido anterior)

Conferido em `origin/main` em 12/11: **nenhum** destes itens foi feito.

| Item | Estado na `main` |
|---|---|
| Tetos de tamanho de texto (`nome_completo` 150, `cnh` 20, `veiculo_tipo` 50, `email` 150, `razao_social` 150, `tipo_carga` 80) | Não existem. Só há teto para `valor_proposto` (`validacao.ts:80,376`), para o texto da mensagem (1000) e para `numero_certificado` (60) |
| Teto numérico de `peso_kg`, `valor_oferecido` e `capacidade_kg` (99999999.99) | Não existe: `numeroPositivo` só exige maior que zero (`validacao.ts:193-197`). Valor acima do que a coluna aceita vira 500 |
| Rota inexistente em JSON (`404 {"erro":"rota não encontrada"}`) | Não existe: `server.ts` não tem um tratador de 404, e o Express responde HTML |
| `413 {"erro":"corpo muito grande"}` | Não existe: o tratador de erros só conhece `entity.parse.failed` (400); corpo grande vira 500 |
| `GET /certificacoes/pendentes` sem `cpf` e `cnh` | Ainda devolve os dois (`backend/src/rotas/certificacoes.ts:93-94`). O front já descarta e há teste que afirma que nenhum dos dois aparece na tela do admin, mas o dado não deveria sair do backend |

Prioridade: o último (privacidade) primeiro; os demais, se der tempo antes do congelamento.

## P4. Operação

1. **Seeds no Neon:** já rodou `database/seed-demo.sql` (empresa, motorista com MOPP, motorista sem MOPP, 4 cargas) e `database/seed-admin.sql`? Confirme, e me passe as credenciais **por mensagem direta**, nunca pelo repositório. As cargas do seed expiram 30 dias depois da execução.
2. **Ping em `/saude`** na manhã do dia da apresentação: o Render dorme e o primeiro acesso leva cerca de 50 s (cold start).
3. **Avise antes de qualquer mudança de contrato na `main` depois do congelamento de 14/11**, inclusive a troca de uma frase de erro (itens d e f do P1), para o front não ser pego de surpresa.

## Resumo para colar no grupo

> Diogo, as telas do Pix estão no ar (https://backhaul-front.vercel.app) e esperam o modo de teste no servidor. Por ordem de prioridade, preciso de você:
> 1) Pix (PR #137): como refazer o Pix se expirar (hoje dá 409 "frete já foi pago"), se o GET /fretes/meus pode trazer o Pix pendente e quando o PAGAMENTOS_MODO=sandbox vai estar ligado no Render.
> 2) Confirmar as frases exatas dos 409 do Pix e avisar antes de mudar; se puder, devolver um código estável (chave_pix_ausente) no 409 da entrega.
> 3) Seeds no Neon (seed-demo e seed-admin) e as contas por mensagem direta; ping em /saude na manhã da apresentação.
> 4) Rotas que faltam: cancelar carga, cancelar disponibilidade, GET /disponibilidades/minhas, campos extras em /fretes/meus e /propostas/minhas, regras do aceite (B1) e status expirado em /cargas/minhas.
> 5) Se der tempo: tirar cpf e cnh de GET /certificacoes/pendentes, 404 e 413 em JSON, tetos de tamanho.
> 6) Avisar antes de mudar contrato na main depois do congelamento de 14/11.
> Detalhes em docs/front/pedido-ao-diogo-2.md (e docs/front/pedido-ao-diogo.md para os contratos das rotas).
