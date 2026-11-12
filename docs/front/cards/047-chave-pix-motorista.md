# 047 — Motorista: chave Pix

| Campo | Valor |
|---|---|
| Agente / modelo | `dev-front` / sonnet |
| Branch | `feat/047-chave-pix-motorista` (a partir de `front`) |
| Prazo | testar ponta a ponta na sexta 13/11; congelamento no sábado 14/11 |
| Par | 048 (pagamento Pix da empresa), em paralelo; este card não toca nos tipos nem nos fetchers de pagamento |

## Objetivo
O motorista cadastra (e troca) a chave Pix para onde o frete é repassado na entrega. Sem chave, a API recusa concluir a entrega (409), e a tela de fretes leva o motorista até o cadastro.

## Rotas da API (contrato em `docs/api.md`, seção `/motorista/chave-pix`)
- `GET /motorista/chave-pix`: `{ chave_pix, tipo_chave_pix }`; sem chave, os dois campos vêm `null`. 401, 403, 404 (sem perfil).
- `PUT /motorista/chave-pix` com `{ tipo_chave_pix, chave_pix }`; tipos `cpf | cnpj | email | telefone | aleatoria`. Devolve a chave **normalizada** (CPF/CNPJ/telefone só dígitos, telefone com 11 dígitos aceitando +55, e-mail e aleatória em minúsculas). 400 com `erros: ["chave_pix inválida para o tipo cpf"]` (ou `tipo_chave_pix deve ser …`).
- `PATCH /fretes/:id/status` (entregue) responde 409 `"cadastre sua chave Pix antes de concluir a entrega"`; com o modo de teste, iniciar o transporte pode responder 409 `"aguardando a confirmação do pagamento da empresa"`.

## O que foi feito
- Rota `/motorista/chave-pix` (casca + `CorpoChavePixMotorista` por `React.lazy`, ADR 0011). Item "Chave Pix" (ícone `banknote`, `noMais: true`) no menu: o motorista passa a ter 6 destinos; a barra inferior continua com 3 itens e o "Mais" guarda Disponibilidade, Certificações e Chave Pix.
- Tela: "Sua chave Pix" (tipo em texto + chave, ou o aviso "Nenhuma chave cadastrada") depois do formulário (tipo + chave, `react-hook-form`; o formulário vem primeiro para o botão "Salvar" ficar acima da barra inferior no celular, que o Lighthouse exige no alvo de toque). O campo da chave ajusta `inputMode` e `autoComplete` ao tipo (CPF/CNPJ numérico, telefone `tel`, e-mail `email`, aleatória texto). Sucesso: "Chave Pix salva." anunciada por `anunciar()`, chave normalizada mostrada e posta no formulário. 400: a mensagem da API vai ao campo (`aplicarErroApi`) e ao resumo de erros. 401 encerra a sessão; 403 e 404 aparecem em `EstadoErro`; leitura com falha tem "Tentar de novo" e o foco vai ao título "Sua chave Pix" quando dá certo.
- Atalho em "Meus fretes" do motorista: no 409 do PATCH, se a mensagem contém "chave Pix", o aviso do cartão ganha o link "Cadastrar chave Pix" para `/motorista/chave-pix`. O texto da API não é trocado. O 409 "aguardando a confirmação do pagamento da empresa" aparece como a API mandou, e o botão do passo continua habilitado.
- API do app: `src/api/chavePix.ts` e `chavePix.hooks.ts` (arquivos novos), chave de cache `chaves.motorista.chavePix`, tipos `TipoChavePix`, `RespostaChavePix` e `CorpoChavePix` (acrescentados ao fim de `tipos.ts`), método `PUT` no cliente HTTP e no CORS do servidor de mock do CI.
- Mock (MSW): `mocks/handlers/chavePix.ts`, com estado em memória por usuário, validação e normalização iguais às do backend (`validarChavePix`) e `reiniciarChavePixMock()` para os testes.

## Decisão de privacidade
A chave de CPF é dado pessoal. O motorista é o dono do dado e precisa conferir o que cadastrou, então a chave aparece **inteira** (sem máscara e sem botão "Mostrar"), só para ele. Ela nunca vai a `console.*`, armazenamento (`AsyncStorage`/`localStorage`), URL ou analytics; fica só na memória do cache do TanStack Query, que é limpo ao sair (ADR 0004). O corpo do PUT leva só os dois campos do contrato.

## Testes
- Jest: `src/app/__tests__/chave-pix-motorista.test.tsx` (vazio, preenchido, carregando, 500 com "Tentar de novo", 404, 401, cadastro com normalização de CPF, e-mail e telefone, 400 no campo, formulário vazio, 500 e 401 no envio, teclado por tipo), `mocks/handlers/chavePix.test.ts`, e dois casos novos em `motorista-fretes.test.tsx` (409 de chave Pix com link; 409 de pagamento pendente legível e sem travar o botão). `itensDaArea.test.ts` e `sessao.test.tsx` na nova contagem (6 destinos).
- E2E (CI): `e2e/chave-pix-motorista.spec.ts` (teclado, teclado por tipo, 400 no campo, axe claro e escuro com a chave salva e com o formulário em erro, em 1280 e 320 px, e reflow em 320 px com chave longa sem espaços); `rotas.ts` com `/motorista/chave-pix` (axe e reflow gerais) e `sessao.spec.ts` na nova contagem. Os testes não assumem o estado inicial porque o mock é compartilhado entre os projetos em paralelo.

## Fora do escopo
Pagamento Pix da empresa (card 048) e as rotas de pagamento de `src/api/fretes.ts`.
