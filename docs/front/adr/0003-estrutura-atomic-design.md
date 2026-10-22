# ADR 0003 — Estrutura de pastas, atomic design e convenções

- **Data:** 2026-10-20 · **Status:** proposto · **Autor:** tech-lead

## Contexto
Decisão fechada: atomic design (atoms, molecules, organisms, templates; telas nas rotas). Vários agentes (inclusive Haiku) vão codar em paralelo e precisam de regras sem ambiguidade.

## Decisão
Árvore completa e comentada em `docs/front/arquitetura.md`. Regras:

**Camadas e direção de import** (só para baixo, nunca para cima):

| Camada | Pasta | Pode importar | Não pode |
|---|---|---|---|
| Tela (rota) | `src/app/**` | tudo abaixo, `src/api`, `src/state` | — |
| Template | `src/components/templates` | organisms, molecules, atoms, `src/theme`, `src/lib`, `src/hooks` | `src/api` |
| Organism | `src/components/organisms` | molecules, atoms, `src/theme`, `src/lib`, `src/hooks`, `src/state` | `src/api` (dados chegam por props) |
| Molecule | `src/components/molecules` | atoms, `src/theme`, `src/lib`, `src/hooks` | `src/api`, `src/state` |
| Atom | `src/components/atoms` | `src/theme`, `src/lib` | qualquer outro componente |

- `src/api`: cliente, tipos e hooks de dados (ADR 0004 e 0005). `src/state`: contextos de sessão, tema e disponibilidade ativa. `src/lib`: funções puras (formatação, validação, rótulos, a11y, armazenamento). `src/data`: dados estáticos (cidades). `src/theme`: tokens e tema (ADR 0008). `src/hooks`: hooks genéricos sem dados da API.
- Exceções nomeadas: o organism `SeletorLocal` usa `expo-location` diretamente (GPS); o organism `PortaoServidor` recebe o estado do portão por props (a lógica fica em `src/api/saude.ts`).

**Nomes**
- Pastas técnicas em inglês (`components`, `api`, `state`, `lib`, `theme`, `hooks`, `data`), casando com os níveis da decisão. Nomes de domínio em **pt-BR sem acento**: `Botao`, `CampoTexto`, `CartaoCargaProxima`, `useCargasProximas`, `formatarMoeda`.
- Componentes do design-system: nome em pt-BR conforme a tabela "Componentes do design-system → código" de `docs/front/arquitetura.md` (o DS usa nomes em inglês; estados e visual sempre os do DS).
- Componentes: `PascalCase`, um por arquivo, arquivo com o mesmo nome (`atoms/Botao.tsx`), teste ao lado (`atoms/Botao.test.tsx`). Export nomeado (`export function Botao`); `export default` só nas rotas (exigência do expo-router).
- Hooks `useAlgo`; funções com verbo no infinitivo (`formatarDistancia`); tipos em `PascalCase` (`Carga`, `ErroApi`); valores de enum iguais ao contrato (minúsculos, sem acento).
- Variação por plataforma: `Nome.web.tsx` / `Nome.native.tsx` (o Metro escolhe), sempre os dois com a mesma assinatura.
- Import com alias `@/` → `src/` (`tsconfig` `paths`). Nada de `../../..`.

**Estilo**
- `StyleSheet.create` no próprio componente, com valores só de tokens (`src/theme/tokens.ts`). Nenhuma cor, espaço, raio ou tamanho de fonte literal fora desse arquivo.
- Estilos que dependem do tema: `const estilos = useEstilos(criarEstilos)` (ADR 0008). Tipografia sempre por `fonte(nivel)` de `src/theme/tipografia.ts`.

**Textos:** pt-BR direto no componente ou tela; rótulos de domínio repetidos em `src/lib/rotulos.ts` (ADR 0015).

**TypeScript:** `strict: true`, `noUncheckedIndexedAccess: true`, sem `any` (regra de lint).

## Alternativas
- Pasta por funcionalidade (`features/cargas`): boa para times grandes, mas contraria a decisão de atomic design.
- Pastas em pt-BR (`componentes/atomos`): rejeitado para casar com a decisão literal "atoms, molecules…".

## Consequências
- Revisor reprova import que sobe de camada ou `src/api` dentro de componente.
- Componentes são testáveis só com props (sem MSW); telas são testadas com MSW.

**Adendo (card 008):** um atom pode importar outros atoms, `src/hooks` e `src/state/tema` (além de `src/theme` e `src/lib`); continua proibido importar `@/api`, molecules, organisms e templates.

**Adendo (fix nova-carga-peso):** `src/telas` guarda o corpo de uma tela que a rota carrega por `React.lazy` para sair do JS inicial (ADR 0011). Tem o mesmo nível de uma tela (`src/app`): pode usar `src/api` e `src/state`; só a rota (`src/app/**`) o importa, por um arquivo `*.carregar.ts` (o Jest não executa `import()` dinâmico). A rota mantém a casca (h1, cabeçalho, abas) e um esqueleto acessível.
