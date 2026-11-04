# Decisões do backend

Cada item registra **o que** foi decidido e **por quê**, para quem for defender o projeto. (As decisões do front estão em `docs/front/adr/`.)

## 1. Monólito modular em Node.js + TypeScript
Uma única API, organizada em arquivos por assunto (`rotas/cargas.ts`, `rotas/propostas.ts`, `rotas/fretes.ts`...), em vez de vários serviços. Para um projeto de faculdade com poucas pessoas, é mais simples de rodar, de hospedar e de depurar; dá para separar em serviços depois, se precisar. TypeScript (modo `strict`) pega erro de tipo antes de rodar.

## 2. PostgreSQL + PostGIS
O problema central é "qual carga está perto de mim?". O PostGIS responde isso no próprio banco (`ST_DWithin` com índice GiST) e calcula distância real sobre a esfera (`GEOGRAPHY`), sem trazer tudo para o Node e filtrar na mão. Também dá transações e `ENUM`s, que travam valores inválidos na origem.

## 3. Neon (banco) e Render (API), ambos no plano grátis
Gratuitos e com deploy simples (a API publica sozinha a cada push na `main`). Custo: o plano grátis do Render "dorme" e a primeira chamada leva ~50 s; o Neon também pausa quando ocioso. Antes de apresentar, vale "acordar" a API chamando `/saude`.

## 4. Autenticação com JWT (7 dias) e senhas com bcrypt
O token guarda só o id do usuário e o tipo, assinado com `JWT_SECRET`; a API não precisa guardar sessão. Senhas ficam como hash bcrypt (custo 10, ~100 ms: lento o bastante para atrapalhar força bruta). O segredo e a URL do banco ficam em variáveis de ambiente e nunca no repositório.

## 5. Permissão por tipo e "404 em vez de 403" para dados de outros
`exigirTipo("empresa")` etc. barram quem não tem o papel (403). Já quando um motorista tenta ver o frete **de outro motorista**, a resposta é 404, igual a "não existe": a API não confirma que aquele id existe.

## 6. Dinheiro em centavos inteiros, não em `float`
Em ponto flutuante, `0.1 + 0.2` não dá `0.3`. A comissão (5%) é calculada sobre centavos inteiros e arredondada para o centavo mais próximo (3500.10 → 175.01). No banco o valor é `NUMERIC`, e entre Node e banco ele trafega como texto. As regras estão em `backend/src/frete-regras.ts`, com testes.

## 7. Concorrência: travar a linha antes de decidir
Duas empresas aceitando propostas da mesma carga ao mesmo tempo não podem criar dois fretes. A rota abre uma transação e usa `SELECT ... FOR UPDATE` na carga (ou no frete): quem chega depois espera, e quando passa já enxerga o que o primeiro gravou. O mesmo vale para o pagamento e para a mudança de status do frete. A resposta HTTP só sai depois do `COMMIT`.

## 8. Pagamento retido até a entrega (simulado)
Não há gateway de pagamento. A transação nasce `retido` e vira `liberado` quando o motorista marca `entregue`, na mesma transação do banco que muda o status do frete (ou as duas coisas acontecem, ou nenhuma).
**Limite conhecido:** hoje só o motorista confirma a entrega. Um próximo passo seria um código de entrega que a empresa recebe e o motorista digita, para confirmar dos dois lados.

## 9. Validação na API com resultado tipado
Cada rota valida o corpo com funções puras (`Resultado<T>`), que devolvem os dados limpos ou a lista de erros (HTTP 400). Isso deixa as validações testáveis sem banco. Documentos são normalizados (só dígitos) e conferidos pelos dígitos verificadores de CPF/CNPJ. Detalhes do banco nunca vazam: erros inesperados viram 500 genérico e o detalhe fica só no log.

## 10. CORS por lista de origens
O navegador só deixa o site do app ler a API se a origem estiver em `CORS_ORIGIN`. Sem a variável, nenhuma origem é liberada (seguro por padrão). O app nativo não passa por essa regra.

## 11. CI no GitHub Actions
Todo PR do backend roda `tsc --noEmit` e os testes (`npm test`). Os testes cobrem funções puras (validações, comissão, transições); testes de rota com banco real ficaram como evolução.
