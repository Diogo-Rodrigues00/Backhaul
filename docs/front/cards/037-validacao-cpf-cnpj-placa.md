# 037 — Validação de CPF, CNPJ e placa (+ fixtures, MSW e E2E válidos)

| Campo | Valor |
|---|---|
| Itens | MVP-05, MVP-06, D-PO-14; risco R3 (cadastro ao vivo com 400 no palco) |
| Tipo | fix |
| Agente / modelo | `dev-front` / **sonnet** — algoritmo de dígito verificador espelhado do backend, muitos arquivos de teste e o mock com estado do E2E |
| Branch | `fix/037-validacao-documentos` |
| Estimativa | M (≈4 h) |
| Bloqueado por | 6.0 (PR #105) |
| Bloqueia | 045 (roteiro com documentos válidos), 046 |
| Onda | 0 (mergear **depois** do 036: os dois mexem em `mocks/handlers/comEstado.ts`) |

## Objetivo
O backend novo recusa CPF/CNPJ com dígito verificador errado e placa fora de `ABC1234`/`ABC1D23`. O app hoje só conta dígitos: o usuário só descobre o erro depois do POST, e vários testes e o E2E usam números que a API real recusa. Validar antes do envio, com a **mesma regra** do backend, e trocar todos os números inválidos.

## Rotas da API
`POST /cadastro/motorista` ✅ e `POST /cadastro/empresa` ✅. Regras em `backend/src/validacao.ts` (`validarDocumento`, `cpfValido`, `cnpjValido`, `validarPlaca`):
- CPF: só dígitos e `. - / espaço`; 11 dígitos senão `400 "cpf deve ter 11 dígitos"`; dígito verificador (módulo 11) errado **ou** sequência repetida (`111.111.111-11`) → `400 "cpf inválido"`.
- CNPJ: idem com 14 dígitos → `"cnpj deve ter 14 dígitos"` / `"cnpj inválido"`.
- Placa: remove hífen/espaço, maiúsculas; `^[A-Z]{3}\d[A-Z\d]\d{2}$` senão `400 "veiculo_placa inválida (use ABC1234 ou ABC1D23)"`.

## Arquivos prováveis
- `app/src/lib/validacao.ts`: novos `cpf`, `cnpj`, `placa` (validadores `Validador`) + funções puras `cpfValido`, `cnpjValido`, `placaValida` (comentário citando `backend/src/validacao.ts`).
- `app/src/app/cadastro/motorista.tsx` (~67–70): `cpf: { obrigatorio, cpf }`, `veiculoPlaca: { obrigatorio, placa }`.
- `app/src/app/cadastro/empresa.tsx` (~51): `cnpj: { obrigatorio, cnpj }`.
- MSW: `app/mocks/handlers/sessao.ts` (~45–110, `validarCadastroMotorista` e o handler de empresa) e `app/mocks/handlers/comEstado.ts` (~157): mesmas regras e **mesmas mensagens da API**.
- Fixtures/testes com número inválido → válido: `src/app/__tests__/cadastro-motorista.test.tsx` (83, 121), `src/test-utils/telaCadastroMotorista.tsx` (17), `src/api/hooks.test.tsx` (137, 179), `src/app/cadastro/__tests__/empresa.test.tsx` (49, 150), `src/lib/cadastroMotorista.test.ts` (11, 24), `src/components/molecules/formulario.test.tsx` (269, 339, 379), `src/lib/validacao.test.ts` (65–70), `e2e/cadastro-empresa.spec.ts` (26, 38), `mocks/estado.ts` (162), `mocks/fixtures/usuarios.ts` (~84).
- E2E com documento aleatório: `e2e/cadastro-motorista.spec.ts` e `e2e/fluxo-completo.spec.ts` (~190) → helper novo `app/e2e/documentos.ts` (`gerarCpf()`, `gerarCnpj()` pelo algoritmo, aleatórios e válidos).

## Passos
1. Escrever `cpfValido`/`cnpjValido`/`placaValida` com testes (casos abaixo) **antes** de ligar no formulário.
2. Validadores de tela com mensagem pt-BR para pessoa, sem jargão: "Informe 11 dígitos." (já existe) quando a contagem falha; "CPF inválido. Confira os números." / "CNPJ inválido. Confira os números." quando a conta não fecha; "Use o formato ABC1234 ou ABC1D23." para a placa. A mensagem da API continua como fallback por prefixo (`aplicarErroApi`, ADR 0007).
3. Ligar os validadores nas duas telas de cadastro.
4. MSW sem estado e com estado: recusar os mesmos casos com o **texto exato** da API (lista `erros`).
5. Trocar todos os números inválidos. CPFs válidos de referência: `529.982.247-25`, `987.654.321-00`, `123.456.789-09`, `111.444.777-35`. CNPJs: `11.222.333/0001-81`, `12.345.678/0001-95`. Para testes de "CPF repetido (409)", usar dois cadastros com o mesmo CPF válido.
6. Helper `e2e/documentos.ts` e uso nos dois specs aleatórios.

## Critérios de aceite
- [ ] Formulário bloqueia CPF, CNPJ e placa inválidos **antes do POST** (nenhuma requisição sai), com erro associado ao campo e listado no resumo de erros.
- [ ] Aceita pontuação (`529.982.247-25` e `52998224725`), placa com hífen/minúscula (`abc-1d23`).
- [ ] Recusa sequência repetida (`111.111.111-11`, `00.000.000/0000-00`).
- [ ] MSW (Jest e servidor de mocks do E2E) devolve `400` com as mesmas mensagens da API para os mesmos casos.
- [ ] `grep` no `app/` pelos números antigos (`123.456.789-01`, `12.345.678/0001-99`, `11122233344` como CPF) não acha nada.
- [ ] E2E de cadastro (motorista, empresa, fluxo completo) passa com documentos gerados pelo algoritmo.
- [ ] Portões do ADR 0013 verdes; JS inicial de `/cadastro/motorista` e `/cadastro/empresa` ≤ 360 KiB (a validação é pequena; se crescer, conferir que entrou só no chunk do cadastro).

## Testes exigidos
- Unidade (`validacao.test.ts`): CPFs válidos da lista; um dígito trocado em cada um; sequências repetidas; 10 e 12 dígitos; letras. Idem CNPJ. Placa: `ABC1234`, `ABC1D23`, `abc-1d23`, `AB12345`, `ABCD123`, `ABC12D3`.
- Tela (RNTL + MSW): CPF inválido não chama a API; CNPJ inválido idem; placa inválida idem; 400 da API mapeado ao campo (fallback).
- MSW: teste do handler com CPF inválido → 400 `"cpf inválido"`.
- E2E: cadastro de motorista e empresa com `gerarCpf()`/`gerarCnpj()`.

## Checklist de acessibilidade e performance
- [ ] Mensagem de erro ligada ao campo (`aria-describedby`/`aria-invalid`) e foco no resumo ao enviar com erro (ADR 0007).
- [ ] Mensagens dizem como corrigir ("Confira os números", formato da placa), não só "inválido".
- [ ] Nenhum `inputMode` novo que atrapalhe a placa (placa tem letras: teclado de texto).
