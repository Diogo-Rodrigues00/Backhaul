## Card
Closes #<número da issue> · spec: `docs/front/cards/NNN-slug.md`

## Resumo
<!-- O que mudou e por quê, em poucas linhas. -->

## Como testar
<!-- Passos para rodar e ver funcionando (comandos em app/). -->

## Critérios de aceite do card
<!-- Copie os critérios da spec e marque. -->
- [ ]

## Portões automáticos (CI)
- [ ] `qualidade` verde (lint, typecheck, format, testes, proibidos)
- [ ] `web` verde (export, orçamento, E2E + axe, Lighthouse mobile e desktop)
- [ ] Rotas novas entraram em `app/e2e/rotas.ts`
- [ ] JS inicial não aumentou em relação à base (ADR 0011, adendo)

## Checklist manual de acessibilidade (WCAG 2.2 AA)
- [ ] Teclado: Tab chega a toda ação, ordem lógica, sem armadilha
- [ ] Foco visível em todo elemento interativo
- [ ] Leitor de tela no navegador: rótulos, papéis e erros anunciados
- [ ] Contraste verificado nos temas claro e escuro
- [ ] Zoom 200% e reflow em 320 px sem rolagem horizontal
- [ ] `prefers-reduced-motion` respeitado
- [ ] Erros de formulário associados aos campos

## Checklist iPhone (Expo Go)
- [ ] VoiceOver: rótulos, ordem, estados e anúncios
- [ ] Dynamic Type no maior tamanho, sem corte
- [ ] Fluxo do card testado no aparelho

## O que não foi verificado
<!-- Seja explícito: o que ficou sem teste e por quê. -->
