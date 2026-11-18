# 049 — Folga de rolagem sob a barra de abas inferior

| Campo | Valor |
|---|---|
| Agente / modelo | `dev-front` / sonnet |
| Branch | `fix/folga-rolagem-barra` (a partir de `front`) |
| Prazo | congelamento no sábado 14/11 |

## Problema
Em tela estreita a `BarraAbas` (sticky na base, `position: sticky; bottom: 0`) cobre o que está no fim da dobra e, depois de uma rolagem, qualquer campo que pare na faixa dela. O axe (`target-size`) mede o alvo menos a área coberta: com menos de 24 px livres, reprova. Dois contornos nasceram disso: `minHeight: 300` no bloco "Sua chave Pix" e `scrollTo(0, 0)` antes do axe nos testes de certificações.

## O que foi medido (320 px, motorista)
- **Fim da página:** a barra sticky fica no fluxo, depois do `<main>`. Rolado até o fim, o conteúdo termina onde ela começa: não há alvo sob a barra e **não precisa de padding inferior** (teste `e2e/barra-folga.spec.ts`).
- **O axe reprova alvo sob a barra:** confirmado. Sem `minHeight` e sem `scrollTo`, `#chave-pix-chave` (formulário em erro) e `#certificacao-numero`/`#certificacao-campo` (erro 409, modo reenvio) reprovam `target-size`, porque o clique rola a página e o campo para na faixa da barra. Isso é geometria de uma barra que sobrepõe a rolagem do documento, não defeito da tela: o usuário rola e o alvo sai de baixo dela.
- **A altura real da barra não é 60 px:** em 320 px os rótulos quebram e ela mede 90 px (mais com texto ampliado). O `scroll-padding-bottom` era `60 + 12 = 72 px`: o foco por teclado podia parar 18 px sob a barra.

## Solução
- `barraInferior` em `src/theme/tokens.ts` (altura 60, borda 3, folga de foco 12) é a fonte única de `BarraAbas`, `AbaNavegacao` e do CSS global. Sumiram os `60` soltos.
- `BarraAbas` mede a própria altura (`onLayout`) e a publica em `--altura-barra` no `<html>`; o CSS usa `scroll-padding-bottom: calc(var(--altura-barra, 63px) + 12px)` abaixo de 960 px. Antes da hidratação vale o mínimo do token (63 px). Ao desmontar, a variável sai.
- Teste novo `e2e/barra-folga.spec.ts` (só `estreito`): variável = altura renderizada; fim da página sem conteúdo sob a barra; foco por teclado em alvo abaixo da dobra para acima da barra.

## Decisão: não reestruturar o scroll
A solução que elimina o caso de vez é a barra fora da rolagem do documento: coluna `100dvh` com o conteúdo rolando num contêiner e a barra no fluxo. **Não foi feita**, porque é mais do que uma correção pequena e o risco é real:
- O scroll deixa de ser o do `window`: ~15 specs medem reflow por `document.documentElement.scrollWidth` e passariam a ser cegos a estouro horizontal dentro do contêiner; `tema.spec` usa `window.scrollTo`/`scrollY`.
- `scroll-padding` e `scrollIntoView` (pular para o conteúdo) passam para o contêiner; foco, restauração de rolagem do expo-router e busca na página mudam de comportamento.
- iOS Safari: com rolagem interna, a barra de endereço deixa de recolher ao rolar e `100dvh` varia durante a animação; PWA em tela cheia e safe area precisam ser revistos.
- Só poderia ser validado rodando a suíte inteira, fora do combinado deste card (apenas os specs tocados e `a11y.spec.ts`).

Se for feito depois, é um card próprio, com a suíte toda.

## O que foi removido / o que ficou
- Removido: os `60`/`72` duplicados (token único) e o `72` fixo do `scroll-padding`.
- **Mantido**, com motivo: `minHeight: 300` em `CorpoChavePixMotorista` e `scrollTo(0, 0)` nos testes de axe de certificações. Tirados os dois, 6 casos de axe em 320 px reprovam (acima). Mantê-los é o contorno aceito até o scroll ser reestruturado.
- **Adicionado** o mesmo `scrollTo(0, 0)` ao `violacoes` de `chave-pix-motorista.spec.ts`: em isolamento o teste "formulário em erro" já reprovava no `front` (o `minHeight` não segura quando a chave salva por outro teste muda a altura da página).
- `CartaoCertificacao`: o "Reenviar" fica onde está (logo abaixo da situação). Antes dos fatos ele já é o que o leitor de tela encontra primeiro depois do título e da situação; reordenar só para fugir da barra mudaria a leitura sem ganho, e a folga acima já cobre o caso do foco.

## Verificação
Playwright local, `--project=estreito --repeat-each=3`: `a11y.spec.ts` (21 rotas), `barra-folga`, `chave-pix-motorista`, `certificacoes-estados`, `certificacoes-motorista`: 276 passaram. `npm run orcamento` dentro do limite. Jest dos arquivos afetados, lint, tsc e prettier limpos. Lighthouse: só no CI. iPhone/Expo Go: não verificado (a mudança é só web; no iPhone a barra já fica fora do `ScrollView`).
