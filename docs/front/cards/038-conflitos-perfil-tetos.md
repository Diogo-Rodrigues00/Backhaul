# 038 — Conflito de disponibilidade, 404 de perfil, tetos numéricos, `Usuario.nome` nulo e Lighthouse desktop

| Campo | Valor |
|---|---|
| Itens | MVP-08, MVP-06, MVP-13; decisão do Pedro de 2026-11-04 (Performance desktop `warn`) |
| Tipo | fix |
| Agente / modelo | `dev-front` / **haiku** — ajustes pontuais em funções puras, validadores e uma linha de configuração, todos com padrão pronto |
| Branch | `fix/038-conflitos-perfil-tetos` |
| Estimativa | P (≈2 h) |
| Bloqueado por | 6.0 (PR #105) |
| Bloqueia | — |
| Onda | 0 (mergear depois do 036 e do 037: mexe em `lib/validacao.ts`, `api/tipos.ts` e `mocks/fixtures/usuarios.ts`) |

## Objetivo
Fechar quatro diferenças entre o app e o backend novo que a demo pode encontrar, e aplicar no CI a decisão de Performance desktop como aviso.

## Rotas da API
- `POST /propostas` ✅: `409 "disponibilidade não está mais aberta"` (disponibilidade usada num frete ou vencida) e `404 "perfil de motorista não encontrado"`.
- `POST /cargas` ✅, `POST /cadastro/motorista` ✅, `POST /propostas` (contraproposta): colunas `NUMERIC(10,2)` → acima de **99.999.999,99** o backend devolve `500` para `peso_kg`, `valor_oferecido` e `capacidade_kg` (só `valor_proposto` tem `400` próprio). `tipo_carga` é `VARCHAR(80)`.
- `GET /eu` ✅: para o admin, `nome` vem `null` (o backend faz `COALESCE` de motorista e empresa; o admin não tem nenhum).

## Arquivos prováveis
- `app/src/lib/fazerProposta.ts` (`lerErroDaProposta`) e `fazerProposta.test.ts`.
- `app/src/telas/usePropostasDoMotorista.ts` (~152–172, `falhou`) e `app/src/components/organisms/AcoesProposta.tsx` (aviso com link).
- `app/src/lib/validacao.ts`: constante `VALOR_MAXIMO = 99_999_999.99` e validador `ateValorMaximo` (mensagem com o número formatado em pt-BR).
- Uso: `app/src/telas/FormularioPublicarCarga.tsx` (~80–81: peso e valor), `app/src/app/cadastro/motorista.tsx` (~71: capacidade), `app/src/lib/valorProposto.ts` (~13: contraproposta).
- `app/src/api/tipos.ts` (~35): `nome: string | null`; conferir usos (`AreaProtegida.tsx:49` já usa `??`).
- `app/mocks/fixtures/usuarios.ts` (~54): admin com `nome: null`, como a API.
- `app/lighthouserc.desktop.cjs` (~22): `categories:performance` → `'warn'`; `app/CLAUDE.md` (linha do `lhci:desktop` e tabela "Lighthouse").

## Passos
1. `lerErroDaProposta`:
   - `409` cujo texto contém "disponibilidade" → desfecho `disponibilidade` (hoje cai em `carga-indisponivel` e recarrega a lista à toa).
   - `404` "perfil de motorista não encontrado" → desfecho novo `perfil` (aviso fixo no cartão, como `sem-certificacao`; tentar de novo não resolve). `404` com "disponibilidade" segue `disponibilidade`; os demais `404` seguem `carga-indisponivel`.
2. Aviso de `disponibilidade`: para o `409`, o link do aviso é **"Publicar nova disponibilidade"** (`/motorista/disponibilidades/nova`); para o `404`, continua "Minhas disponibilidades". Trocar o booleano `linkDisponibilidades` por um campo `link: 'disponibilidades' | 'publicar' | undefined`.
3. Teto: `ateValorMaximo` com a mensagem "Informe um valor até 99.999.999,99." (formatar com `Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 })` a partir da constante, nunca o número escrito duas vezes; `lib/formatacao.ts` não tem formatador de número puro, criar `formatarDecimal` se precisar). Encadear nos quatro campos. `tipo_carga` ≤ 80 já existe (`MAX.tipo_carga`): só conferir.
4. `Usuario.nome: string | null`; `npm run typecheck` aponta os usos; mostrar nada (ou "Administrador" pelo perfil, que já aparece) quando `null`.
5. Lighthouse desktop: `warn` em Performance; `lhci-resumo.mjs` já imprime a nota. Atualizar `app/CLAUDE.md`.

## Critérios de aceite
- [ ] `409 "disponibilidade não está mais aberta"`: o diálogo fecha, o cartão mostra a mensagem da API e o link "Publicar nova disponibilidade"; a lista **não** é recarregada.
- [ ] `404 "perfil de motorista não encontrado"`: aviso no cartão, sem recarregar a lista e sem "carga indisponível".
- [ ] Nenhum campo de peso, valor, capacidade ou contraproposta aceita mais que 99.999.999,99; o erro aparece no campo **antes** do POST.
- [ ] Admin com `nome: null` no `GET /eu` abre `/admin` sem erro; o cabeçalho mostra só o perfil.
- [ ] `lighthouserc.desktop.cjs` com Performance `warn`; Acessibilidade, Boas práticas e SEO seguem `error` com 100 nos dois arquivos.
- [ ] Portões do ADR 0013 verdes.

## Testes exigidos
- Unidade: `lerErroDaProposta` para os três casos (409 disponibilidade, 404 perfil, 404 disponibilidade) + os já existentes; `ateValorMaximo` (99.999.999,99 passa; 100.000.000 e 99.999.999,991 falham; "1.234,56" passa).
- Tela (RNTL + MSW): fazer proposta com 409 de disponibilidade mostra o link "Publicar nova disponibilidade"; publicar carga com valor acima do teto não chama a API.
- Sessão: `GET /eu` do admin com `nome: null` (fixture) renderiza `/admin`.

## Checklist de acessibilidade e performance
- [ ] O aviso no cartão recebe o foco ao fechar o diálogo (mesmo comportamento dos outros desfechos) e é anunciado.
- [ ] Link com nome que diz o destino ("Publicar nova disponibilidade").
- [ ] Mensagem do teto diz o valor máximo em formato brasileiro.
