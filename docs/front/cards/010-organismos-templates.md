# 010 — Cabeçalho, barra de abas, templates de tela/lista e estados

| Campo | Valor |
|---|---|
| Itens MVP | base de todas as telas; MVP-01 (alternar tema visível), CT-01, CT-02, CT-03, CT-05, CT-06, CT-09 (parte visual) |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — landmarks, foco na troca de rota, título por rota, navegação responsiva sem JS e LCP estático são padrão novo |
| Branch | `feat/organismos-templates` |
| Estimativa | G (≈6 h) |
| Bloqueado por | 008 · DS (seções 5.2–5.4, 7) |
| Bloqueia | 009, 013, 014 e todas as telas |

## Objetivo
A casca de toda tela: cabeçalho e barra inferior, template com `h1` e descrição estáticos (LCP, ADR 0011), template de lista com carregando/vazio/erro/atualizar e a barra de novidades do polling.

## Rotas da API
Nenhuma (dados por props).

## Telas / componentes
- `organisms/Cabecalho` (AppHeader): fundo asfalto + `DivisorEstrada`; variante `completo` (logo, `nav` "Principal" com `AbaNavegacao`, nome do usuário + perfil, `AlternarTema`, "Sair") e `simples` (logo + `AlternarTema`); link "Pular para o conteúdo" como primeiro foco; foco `ringOnInverse`; ≤ 720 px a navegação some do cabeçalho (`dataSet`) e ficam logo + ícones com `aria-label`.
- `organisms/BarraAbas` (TabBar): barra inferior fixa ≤ 720 px (`dataSet`, sem JS), mesmos links do cabeçalho, 60 px, `nav` com `aria-label`; no iPhone por `useLargura()`. Nunca as duas navegações visíveis ao mesmo tempo.
- `molecules/AbaNavegacao` (NavTab, `aria-current="page"`), `molecules/AlternarTema` (ThemeToggle: cicla Sistema → Claro → Escuro; `aria-label` "Alternar tema. Atual: …").
- `molecules/Banner` (info, ok, aviso, erro; ícone + borda 2 px; `role` conforme DS seção 7), `molecules/EstadoVazio` (EmptyState: ícone, título `h2`, frase, ação obrigatória), `molecules/EstadoErro` (Banner erro + "Tentar de novo"), `molecules/Lista` (`role="list"` / `listitem`), `molecules/BotaoAtualizar` ("Atualizar"/"Atualizando…", anuncia "Lista atualizada"), `molecules/BarraNovidades` (LiveBar: sino, título da novidade, "Esta tela atualiza sozinha a cada 10 s. Última atualização às HH:MM:SS.", ponto pulsando só sem movimento reduzido; não move o foco).
- `templates/TemplateTela` (AppPageTemplate): props `titulo`, `descricao`, `cabecalho`, `acoes?`, `children`; `<Head>` com `<title>{titulo} · Backhaul</title>` + meta description; `role="main"` `id="conteudo"` ≤ 1120 px; `h1` + descrição **sempre no HTML estático**; foca o `h1` em navegação no cliente (não na carga inicial); `BarraAbas` quando logado.
- `templates/TemplateLista` (ListTemplate): sobre `TemplateTela`; `estado: 'carregando' | 'erro' | 'vazio' | 'pronto'`, `textoCarregando` (Spinner + texto + 3 `Esqueleto`, `role="status"`), `vazio`, `erro`, `aoAtualizar`, `atualizando`, `novidade?` (mostra `BarraNovidades`); altura mínima reservada (CLS 0).
- Aplicar `TemplateTela` com `Cabecalho` simples em `/` e `+not-found` (textos de `/` vêm do PROTO).

## Arquivos e pastas
Componentes acima + testes; `src/app/index.tsx`, `src/app/+not-found.tsx`.

## Critérios de aceite
- [ ] Toda tela: 1 `h1`, `banner`, `main` e, logado, 1 `navigation` visível por largura (CT-05).
- [ ] `<title>` e meta description únicos por rota no HTML exportado (MVP-01, SEO).
- [ ] Navegação no cliente leva o foco ao `h1`; recarregar não rouba o foco; "Pular para o conteúdo" leva ao `main`.
- [ ] `AlternarTema` cicla e persiste (MVP-01).
- [ ] Abaixo de 720 px: `BarraAbas` visível e navegação do cabeçalho oculta, sem JS e sem aviso de hidratação.
- [ ] `TemplateLista`: carregando com texto exposto (CT-01); vazio com mensagem + ação (CT-02); erro com "Tentar de novo" (CT-03).
- [ ] `BarraNovidades` em `role="status"` educado, sem mover o foco (CT-09).
- [ ] 320 px sem rolagem horizontal; zoom 200% sem perda; foco não escondido atrás da barra inferior.
- [ ] Lighthouse 100 (mobile e desktop) em `/` e `/nao-existe`.

## Testes exigidos
- RNTL: landmarks e `h1`; `aria-current`; `AlternarTema` cicla; estados do `TemplateLista`; `BotaoAtualizar` chama e anuncia; `BarraNovidades` com texto da hora.
- Playwright: Tab do topo chega a "Pular para o conteúdo"; em 320 px a barra inferior aparece; axe 0 nos dois temas.

## Checklist de acessibilidade e performance
- [ ] `h1` + descrição estáticos são o LCP (conferir no relatório do Lighthouse).
- [ ] CLS 0 de carregando para lista.
- [ ] VoiceOver: cabeçalho, navegação e título na ordem visual.
