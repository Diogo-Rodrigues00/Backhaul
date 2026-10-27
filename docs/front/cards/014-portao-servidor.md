# 014 — Tela "Conectando ao servidor" (cold start)

| Campo | Valor |
|---|---|
| Itens MVP | MVP-02 (D-PO-15) |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — estados temporizados, região viva e integração com o layout raiz |
| Branch | `feat/portao-servidor` |
| Estimativa | M (≈3 h) |
| Bloqueado por | 004, 008, 010 · PROTO |
| Bloqueia | — (paralelo às telas) |

## Objetivo
Enquanto o Render acorda, mostrar uma tela clara que se resolve sozinha (ADR 0005).

## Rotas da API
`GET /saude` (via `usePortaoServidor` do card 004).

## Telas / componentes
- `templates/TemplateCentralizado` (CenteredTemplate do DS): `Cabecalho` simples + coluna central ≤ 520 px, `h1` e descrição.
- `organisms/PortaoServidor` (props: `estado`, `tentativa`, `totalTentativas`, `aoTentarDeNovo`, `children`): `verificando` e `pronto` → renderiza `children`; `lento` → `TemplateCentralizado` com estrada animada com caminhão (parada com movimento reduzido), `Titulo` 1 "Conectando ao servidor", frase do DS ("O servidor pode levar até 1 minuto para acordar…") e `Banner` info "Tentativa 3 de 18" em `role="status"`; `falhou` → ícone sem-sinal, `Titulo` 1 "Não foi possível conectar ao servidor", frase em `role="alert"` e `Botao` "Tentar de novo" (DS seção 7).
- Integração em `src/app/_layout.tsx` envolvendo o `<Slot />`.
- Queries logadas esperam `servidorPronto` (expor via contexto simples no `_layout` ou flag do `usePortaoServidor`).

## Arquivos e pastas
`src/components/templates/TemplateCentralizado.tsx`, `src/components/organisms/PortaoServidor.tsx` + testes; `src/app/_layout.tsx`; `e2e/portao.spec.ts`.

## Critérios de aceite
- [ ] `/saude` sem resposta 200 por mais de 0,5 s → aparece "Conectando ao servidor" e o texto de até 1 minuto (MVP-02).
- [ ] Falha, demora ou 503 → nova tentativa a cada 5 s, até 90 s (MVP-02).
- [ ] 200 → segue sozinho para o login (sem sessão) ou para a área do perfil (com sessão), sem recarregar (MVP-02).
- [ ] 90 s sem 200 → "Não foi possível conectar ao servidor" + "Tentar de novo", que reinicia o ciclo (MVP-02).
- [ ] Verificação uma vez por abertura, não a cada navegação (MVP-02).
- [ ] Mudanças de estado anunciadas na região educada; indicador parado com movimento reduzido (MVP-02).
- [ ] Servidor rápido (mock) não mostra a tela nem altera o LCP das rotas.

## Testes exigidos
- RNTL + timers falsos + MSW: 200 imediato (não mostra), 503 por 6 s (mostra e depois libera), falha 90 s (erro), "Tentar de novo".
- Playwright: mock com atraso de 2 s em `/saude` mostra a tela e libera sozinha.

## Checklist de acessibilidade e performance
- [ ] A tela tem `h1` próprio e foco no título ao aparecer.
- [ ] Anúncios educados, sem `alert` agressivo.
- [ ] Lighthouse de `/` e `/entrar` inalterado (100).
