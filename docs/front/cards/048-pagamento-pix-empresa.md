# 048 — Empresa: pagamento por Pix do frete

| Campo | Valor |
|---|---|
| Itens MVP | MVP-17, D-PO-06, D-PO-07, RNF-11, CT-09 |
| Prioridade | Extra (pedido do Diogo, backend) |
| Agente / modelo | `dev-front` / sonnet |
| Branch | `feat/048-pagamento-pix-empresa` |
| Prazo | testar ponta a ponta na sexta 13/11; congelamento no sábado 14/11 |
| Estende | 028 (meus fretes da empresa e pagamento simulado) |

## Objetivo
No modo de teste do servidor (`PAGAMENTOS_MODO=sandbox`), `POST /fretes/:id/pagamento` devolve `201` com a transação `pendente` e o objeto `pix` (`copia_e_cola`, `qr_code_base64`, `expira_em`). A empresa paga o Pix no banco; o webhook do gateway muda o frete para `retido`. No modo simulado (padrão) nada muda: sem `pix`, `retido` direto e "Pagamento registrado".

## O que foi feito
- **Contrato:** `RespostaPagamento` ganhou `pix?: PixPagamento`. `StatusPagamento` já aceitava `pendente`. `pagarFrete` lê o `pix` com `lerPix`: só vale com os três campos no formato esperado (texto não vazio, base64, data válida); qualquer falha vira "sem pix" (a tela segue como no modo simulado) e campos desconhecidos (ex.: um `cpf` que viesse por engano) são descartados.
- **Painel Pix** (`molecules/PainelPix`): QR como imagem `data:image/png;base64,...` com `role="img"` e rótulo "QR Code do Pix de R$ X" (sempre sobre fundo claro, com margem de silêncio, nos dois temas), código em texto selecionável com quebra em qualquer ponto (320 px), valor, percentual e valor da comissão (sempre da resposta), validade em pt-BR, "Copiar código Pix" e "Aguardando confirmação do pagamento…".
- **Copiar** (`lib/copiarTexto`): web com `navigator.clipboard.writeText` e, se falhar, `execCommand('copy')` num campo temporário (o foco volta a quem o tinha). Anuncia "Código Pix copiado" por `anunciar()` sem mover o foco; se nada funcionar, anuncia que é preciso selecionar o código. No iPhone **não há `expo-clipboard` no projeto**: o botão não aparece e a tela diz "Toque e segure o código para copiar" (o texto é selecionável).
- **Cartão** (`CartaoFreteEmpresa`): depois do 201 com `pix`, mostra o painel (o diálogo devolve o foco ao título do painel, como já fazia com o resumo). "Ocultar Pix" recolhe; "Ver Pix pendente" traz de volta (o foco acompanha o clique). Ao virar `retido`, o painel dá lugar a "Pagamento confirmado" (banner) + resumo do pagamento; o anúncio é por `anunciar()`, **sem mover o foco**.
- **Espera** (`CorpoFretesDaEmpresa` + `OpcoesLeitura.intervaloMs`): enquanto houver Pix pendente em memória, `GET /fretes/meus` a cada **5 s** (só com a aba visível, mesmo mecanismo do ADR 0010); confirmado, volta aos 10 s de sempre. Sair da tela para a consulta.
- **Erros:** 502 mantém o diálogo aberto com "Serviço de pagamento indisponível, tente novamente" e o botão vira "Tentar de novo". 409 (`frete já foi pago`, `frete cancelado não pode ser pago`, frete entregue no modo de teste) mostram a mensagem da API, fecham o diálogo e recarregam a lista (já era assim). 401, 403 e 404 como nos outros cards.
- **Lista:** `status_pagamento: pendente` mostra o rótulo **"Pagamento pendente"** (texto na etiqueta, sem depender de cor; o `rotuloPagamento('pendente')` mudou de "Pendente" para isso, o que vale também para o admin).
- **Mock com estado** (`mocks/estado.ts`, `mocks/handlers/comEstado.ts`): modo Pix imitando o sandbox: `POST /__mock/pix` (`{ leituras?, falharGateway?, tamanhoCodigo?, expiraEmSegundos? }`) liga o modo; o POST de pagamento passa a devolver `pendente` + `pix` (QR PNG 1x1 válido) e o `GET /fretes/meus` da empresa confirma (`retido`) depois de N leituras ou quando o teste chama `POST /__mock/pix/pagar`. `POST /__mock/fretes` cria um frete aceito para a empresa do fluxo. Sem ligar o modo, tudo segue como antes.

## Decisões
1. **Pix só em memória.** Código e QR são dados de cobrança: ficam no estado da tela, sem `console.*`, storage, URL nem cache persistente, e somem ao sair ou recarregar.
2. **Sem "Gerar novo Pix".** Repetir o POST devolve `409 "frete já foi pago"` mesmo com o pagamento `pendente`, e o contrato não traz rota para refazer a cobrança. Com o código expirado a tela mostra, em texto, que não é possível gerar outro por aqui e manda tentar mais tarde ou falar com o suporte. Só se o backend oferecer como refazer é que o botão entra.
3. **Recarregar com pagamento `pendente`.** O `GET /fretes/meus` não traz o `pix`, então a tela mostra "Pagamento pendente" e: "O código Pix desta cobrança não está mais disponível nesta tela. Aguarde a confirmação do pagamento ou fale com o suporte." Sem "Ver Pix pendente" (não há o que ver).
4. **E2E isolado.** O Pix só existe no modo de teste, e o mock com estado (porta 4010) é compartilhado e reiniciado por `fluxo-completo.spec.ts`. Por isso `e2e/pagamento-pix-empresa.spec.ts` intercepta `GET /fretes/meus` e `POST /fretes/:id/pagamento` no navegador (`page.route`) em vez de depender do estado do servidor. O modo Pix do mock com estado fica para os testes Jest e para quem quiser testar à mão.
5. A frase "Pagamento confirmado" e o anúncio "Pix gerado. Aguardando confirmação do pagamento" são do app; nenhum valor de negócio é fixo (percentual e comissão vêm da resposta).

## Testes
- Jest: `fretes.pix.test.ts` (parse tolerante), `copiarTexto.test.ts`, `PainelPix.test.tsx`, `fretes-empresa-pix.test.tsx` (painel, ocultar/ver, modo simulado, lista pendente sem Pix, 502 com nova tentativa, 409), `fretes-empresa-pix.polling.test.tsx` (tempo falso: 5 s, confirmação anunciada sem `moverFoco`, volta a 10 s, aba oculta, validade vencida), `comEstado.pix.test.ts` (mock).
- Playwright + axe (roda no CI): painel aberto, "Pagamento confirmado" e 502, tema claro e escuro, 1280 px e 320 px, com código de 500+ caracteres e verificação de rolagem horizontal.

## Dúvidas de contrato para o Diogo (o Pedro avisa)
1. **Como refazer o Pix** quando expira antes do pagamento? Hoje o POST repetido dá 409 `frete já foi pago` com a transação `pendente`. Precisa de rota/regra para gerar nova cobrança (ou reabrir a mesma)?
2. **`GET /fretes/meus` poderia trazer o `pix` (ou `pix_expira_em`) enquanto `pendente`?** Assim o Pix não se perderia ao recarregar a página.
3. **Corpo do 502:** o app usa texto próprio ("Serviço de pagamento indisponível, tente novamente") e ignora a mensagem da API. Está certo ignorar?
4. **Mensagem do 409 em frete entregue no modo de teste:** o texto exato não está em `docs/api.md`; o app mostra o que vier.
5. **Pix expirado no gateway:** o backend muda a transação para outro status (ex.: `estornado`/`cancelado`) ou ela fica `pendente` para sempre? O app só sabe pela validade (`expira_em`).
