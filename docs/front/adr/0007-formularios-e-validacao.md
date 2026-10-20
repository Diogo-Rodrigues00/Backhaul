# ADR 0007 — Formulários e validação

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
Sete formulários no MVP (login, 2 cadastros, carga, disponibilidade, contraproposta, confirmações). Validação local espelha só as regras do backend (D-PO-14). Erros 400 vão para o campo quando a mensagem começa com o nome do campo; os demais vão para um resumo com foco (CT-03). Um clique duplo gera uma única requisição (CT-01).

## Decisão
- **react-hook-form ^7.90.0** com `Controller` em cada campo (React Native não tem `ref` de input DOM). `mode: 'onSubmit'`, `reValidateMode: 'onChange'`.
- **Sem biblioteca de schema.** Validadores puros em `src/lib/validacao.ts`, usados em `rules.validate`: `obrigatorio`, `email`, `minimo(n)`, `maximo(n)`, `digitos(n)` (aceita pontuação), `numeroPositivo`, `numeroAte(n)`. Cada um devolve `true` ou a mensagem em pt-BR. Tamanhos máximos de D-PO-14 em constantes no mesmo arquivo.
- **Envio:** `handleSubmit(async dados => mutacao.mutateAsync(...))`; botão com `carregando={isSubmitting || mutacao.isPending}` e desabilitado; o `Botao` ignora toque enquanto `carregando` (garante 1 requisição).
- **Erros da API:** helper `aplicarErroApi(erro, { setError, campos, definirResumo })` em `src/components/molecules/formulario.ts`:
  - `validacao`: usa `separarMensagens` de `src/lib/erros.ts` (ADR 0005); por campo → `setError(campo, { message })`; restantes → resumo.
  - `mensagem` → resumo com o texto da API.
  - `falha` → resumo "Algo deu errado. Tente de novo." + botão "Tentar de novo" que reenvia.
  - Depois de aplicar: foco no `ResumoErros` se houver resumo; senão, no primeiro campo com erro.
- **Mapa campo da API → campo do formulário** declarado na tela (ex.: `{ cpf: 'cpf', email: 'email', nome_completo: 'nomeCompleto' }`).
- Componentes: molecules `CampoTexto`, `CampoSenha`, `CampoNumero`, `GrupoOpcoes` (radio), `ResumoErros` (card 009). Todos recebem `erro?: string` e fazem a associação acessível (ADR 0009).
- Dados digitados permanecem após erro, exceto senha nos cadastros com 409 (MVP-05/06 pedem manter os demais).
- Números: campos numéricos guardam texto; conversão com `paraNumero` só no envio.

## Alternativas
- **zod + resolver:** +13 KB (zod 4) para regras que cabem em 7 funções; e o `@hookform/resolvers` 6 saiu ontem.
- **Formulário à mão (`useState`):** sem dependência, mas cada agente reinventaria erro, foco e envio.

## Consequências
- Um padrão para todos os formulários; o card 015 (login) é a referência viva para os cards Haiku.
