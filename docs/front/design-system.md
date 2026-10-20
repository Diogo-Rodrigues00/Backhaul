# Design system do Backhaul

_Versão 1.0 · 2026-10-20 · Autor: agente `designer` · Direção aprovada pelo Pedro: **"sinalização rodoviária"** · Protótipo navegável: `docs/front/prototipos/index.html` · Identidade em arquivos: `docs/front/identidade/`._

Este é o documento que os outros agentes seguem. **Só o designer decide estilo**: se faltar um valor aqui, peça ao designer em vez de inventar. Os contrastes foram **calculados** (fórmula WCAG 2.2) e o protótipo foi auditado com Lighthouse (acessibilidade 100 nas 19 telas, nos dois temas e em 390 px) e com testes de interação (diálogo, combobox, foco).

---

## 1. Princípios

1. **A estrada é a metáfora.** Placas com borda firme, faixa tracejada, âmbar de advertência, letras de leitura rápida. Nada de visual "SaaS genérico".
2. **A urgência salta da tela.** É o diferencial do produto (matching por urgência). Cada nível tem **texto + forma de placa + cor**, nesta ordem de importância. Nunca só cor.
3. **Âmbar é fundo, nunca texto.** Laranja/âmbar sobre claro reprova AA. Por isso o âmbar (`#FFB300`) só aparece como **fundo** com texto asfalto (`#14181D`, 9,9:1). Para texto laranja existe um tom escuro próprio (`text.accent`, 7,1:1 no claro).
4. **Desktop-first, reflow até 320 px.** A demo é projetada em notebook. Tudo se reorganiza por largura do contêiner, sem rolagem horizontal.
5. **Legível de longe e na estrada.** Corpo de 17 px, alvos de 48 px (botão principal do motorista com 56 px), peso 500/700, sem textos cinza claros.
6. **Estado sempre explicado em palavras.** Carregando, vazio, erro, expirado, novidade: cada um tem frase própria e uma próxima ação.
7. **Leve.** Uma família de fonte em dois pesos, ícones SVG, zero imagens raster, zero bibliotecas de UI. Lighthouse 100 depende disso.
8. **Dois temas completos.** Claro (concreto) e escuro (asfalto), seguindo o sistema, com alternância manual salva. AA nos dois.

---

## 2. Identidade (reaproveitável fora do app)

| Elemento | Especificação |
|---|---|
| Símbolo | Placa de advertência em losango âmbar `#FFB300` com borda asfalto `#14181D` e uma seta de retorno (backhaul = a viagem de volta que não pode ir vazia). Arquivo: `docs/front/identidade/simbolo.svg` |
| Nome | **BACKHAUL** em Barlow Bold, caixa alta, espaçamento de letras 0,09 em, sempre em uma linha |
| Logotipo horizontal | Símbolo + nome. Arquivos: `logotipo-sobre-claro.svg` (nome asfalto) e `logotipo-sobre-escuro.svg` (nome claro `#F4F6F8`) |
| Versão em âmbar | Só o nome, em asfalto, sobre fundo âmbar (sem o símbolo, que sumiria) |
| Ícone do app / PWA | Símbolo centralizado em quadrado asfalto `#14181D` com cantos arredondados e borda âmbar de 3 px; versão `maskable` com o símbolo a 60% da área |
| Área livre | Metade da altura do símbolo em todos os lados |
| Tamanho mínimo | Símbolo 24 px; logotipo horizontal 120 px de largura |
| Não fazer | Trocar o âmbar, esticar, girar, colocar o símbolo âmbar sobre fundo âmbar, texto do nome em outra fonte |
| Slogan sugerido | "A urgência decide quem sai na frente." (usado na tela de login) |

**Para pôster e apresentação:** use as cores da seção 3 (asfalto `#14181D`, âmbar `#FFB300`, vermelho sinal `#C42B1C`, concreto `#EDEFF2`), a fonte Barlow 500/700 (Google Fonts, licença OFL) e a faixa tracejada âmbar (`repeating-linear-gradient` de 28 px de traço e 16 px de vão) como divisor. Os selos de urgência (círculo, triângulo, octógono) funcionam como ilustração. **Antes de imprimir**, abra `logotipo-*.svg` num editor e converta o texto em curvas, para não depender da fonte instalada.

Símbolo (SVG puro, sem fonte):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Backhaul">
  <rect x="8.5" y="8.5" width="31" height="31" rx="5" transform="rotate(45 24 24)" fill="#FFB300" stroke="#14181D" stroke-width="3"/>
  <path d="M17 32V21a7 7 0 0 1 14 0v8" fill="none" stroke="#14181D" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M26.5 24.5 31 29l4.5-4.5" fill="none" stroke="#14181D" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

---

## 3. Tokens

### 3.1 Cor por papel semântico (dois temas)

Os componentes **nunca** usam hex: usam o papel. O tema escuro não é a inversão do claro: é asfalto (`#0E1216`) com superfícies um degrau mais claras, e o âmbar continua sendo fundo com texto asfalto.

| Papel (token) | Variável CSS | Uso | Claro | Escuro |
|---|---|---|---|---|
| `bg.page` | `--bg-page` | Fundo da página | `#EDEFF2` | `#0E1216` |
| `bg.surface` | `--bg-surface` | Cartões, campos, diálogos | `#FFFFFF` | `#171C22` |
| `bg.sunken` | `--bg-sunken` | Áreas rebaixadas, rótulos neutros | `#E1E5EA` | `#0A0D10` |
| `bg.inverse` | `--bg-inverse` | Cabeçalho e barra inferior ("asfalto") | `#14181D` | `#0A0D10` |
| `bg.highlight` | `--bg-highlight` | Item novo, opção escolhida, aviso | `#FFF0C2` | `#3A2C06` |
| `text.primary` | `--text-primary` | Texto principal | `#14181D` | `#F1F3F5` |
| `text.secondary` | `--text-secondary` | Texto de apoio | `#3D4651` | `#C3CAD2` |
| `text.muted` | `--text-muted` | Metadados | `#566070` | `#9CA6B2` |
| `text.accent` | `--text-accent` | Ênfase laranja (valores em R$) | `#9A3A00` | `#FFC247` |
| `text.link` | `--text-link` | Links | `#0F4C9A` | `#8FBFFF` |
| `text.onInverse` | `--text-on-inverse` | Texto sobre o asfalto | `#F4F6F8` | `#F4F6F8` |
| `text.onInverseMuted` | `--text-on-inverse-muted` | Texto de apoio sobre o asfalto | `#B9C1CB` | `#B9C1CB` |
| `border.subtle` | `--border-subtle` | Borda decorativa de cartão (não conta como UI) | `#C5CBD3` | `#2F3842` |
| `border.control` | `--border-control` | Borda de campos e escolhas (UI 3:1) | `#66707C` | `#7C8794` |
| `border.strong` | `--border-strong` | Borda forte (diálogos, destaque) | `#14181D` | `#F1F3F5` |
| `action.fill` | `--action-fill` | Botão primário (âmbar) | `#FFB300` | `#FFB300` |
| `action.fillHover` | `--action-fill-hover` | Botão primário em hover | `#FFC233` | `#FFC233` |
| `action.fillPressed` | `--action-fill-pressed` | Botão primário pressionado | `#E69F00` | `#E69F00` |
| `action.onFill` | `--action-on-fill` | Texto sobre o âmbar | `#14181D` | `#14181D` |
| `action.border` | `--action-border` | Borda do botão primário | `#14181D` | `#FFB300` |
| `focus.ring` | `--focus-ring` | Anel de foco | `#14181D` | `#FFD54A` |
| `focus.ringOnInverse` | `--focus-ring-on-inverse` | Anel de foco sobre o asfalto | `#FFD54A` | `#FFD54A` |
| `success.text` | `--success-text` | Sucesso (texto) | `#0F6B3A` | `#5FD08A` |
| `success.bg` | `--success-bg` | Sucesso (fundo suave) | `#DDF3E4` | `#12301F` |
| `success.fill` | `--success-fill` | Sucesso (selo sólido) | `#0F6B3A` | `#5FD08A` |
| `success.onFill` | `--success-on-fill` | Texto sobre selo de sucesso | `#FFFFFF` | `#06210F` |
| `error.text` | `--error-text` | Erro (texto) | `#B3261E` | `#FF8E85` |
| `error.bg` | `--error-bg` | Erro (fundo suave) | `#FCE4E1` | `#3A1512` |
| `error.border` | `--error-border` | Erro (borda de campo) | `#B3261E` | `#FF8E85` |
| `info.text` | `--info-text` | Informação (texto) | `#1B5BA8` | `#8FBFFF` |
| `info.bg` | `--info-bg` | Informação (fundo suave) | `#E1ECF9` | `#10233B` |
| `urgency.normal.bg` | `--urgency-normal-bg` | Selo Normal: fundo | `#E7EAEE` | `#252C35` |
| `urgency.normal.text` | `--urgency-normal-text` | Selo Normal: texto | `#14181D` | `#F1F3F5` |
| `urgency.normal.border` | `--urgency-normal-border` | Selo Normal: borda | `#566070` | `#9CA6B2` |
| `urgency.urgente.bg` | `--urgency-urgente-bg` | Selo Urgente: fundo | `#FFB300` | `#FFB300` |
| `urgency.urgente.text` | `--urgency-urgente-text` | Selo Urgente: texto | `#14181D` | `#14181D` |
| `urgency.urgente.border` | `--urgency-urgente-border` | Selo Urgente: borda | `#14181D` | `#FFB300` |
| `urgency.critico.bg` | `--urgency-critico-bg` | Selo Crítico: fundo | `#C42B1C` | `#F0584A` |
| `urgency.critico.text` | `--urgency-critico-text` | Selo Crítico: texto | `#FFFFFF` | `#14181D` |
| `urgency.critico.border` | `--urgency-critico-border` | Selo Crítico: borda | `#14181D` | `#F0584A` |
| `disabled.bg` | `--disabled-bg` | Desabilitado: fundo | `#DADFE5` | `#232A32` |
| `disabled.text` | `--disabled-text` | Desabilitado: texto | `#5E6773` | `#8E98A4` |

Cores que não trocam com o tema: âmbar `#FFB300`, asfalto `#14181D`, faixa de obra (listras âmbar e asfalto de 12 px, só decorativa e `aria-hidden`).

### 3.2 Contraste calculado (WCAG 2.2 AA)

Regra aplicada: texto 4,5:1; texto grande (≥ 24 px, ou ≥ 19 px em negrito), bordas de componentes de UI e foco 3:1. Estado desabilitado é isento pela norma; foi mantido acima de 3:1. **Todos os pares abaixo passam.** Menor razão de texto comum: 5,03:1 no claro e 5,26:1 no escuro.

| Par (papel) | Mínimo | Claro: texto / fundo | Claro | Escuro: texto / fundo | Escuro |
|---|---|---|---|---|---|
| Texto principal: texto sobre card/superfície | 4.5:1 | `#14181D` / `#FFFFFF` | **17,82:1** ok | `#F1F3F5` / `#171C22` | **15,40:1** ok |
| Texto principal: texto sobre a página | 4.5:1 | `#14181D` / `#EDEFF2` | **15,47:1** ok | `#F1F3F5` / `#0E1216` | **16,90:1** ok |
| Texto secundário: rótulos e apoio | 4.5:1 | `#3D4651` / `#FFFFFF` | **9,57:1** ok | `#C3CAD2` / `#171C22` | **10,36:1** ok |
| Texto secundário: rótulos e apoio sobre a página | 4.5:1 | `#3D4651` / `#EDEFF2` | **8,31:1** ok | `#C3CAD2` / `#0E1216` | **11,37:1** ok |
| Texto discreto: metadados | 4.5:1 | `#566070` / `#FFFFFF` | **6,36:1** ok | `#9CA6B2` / `#171C22` | **6,94:1** ok |
| Texto discreto: metadados sobre a página | 4.5:1 | `#566070` / `#EDEFF2` | **5,52:1** ok | `#9CA6B2` / `#0E1216` | **7,62:1** ok |
| Texto discreto: metadados sobre área rebaixada | 4.5:1 | `#566070` / `#E1E5EA` | **5,03:1** ok | `#9CA6B2` / `#0A0D10` | **7,90:1** ok |
| Texto de destaque: valores/ênfase laranja escuro (nunca âmbar puro) | 4.5:1 | `#9A3A00` / `#FFFFFF` | **7,05:1** ok | `#FFC247` / `#171C22` | **10,66:1** ok |
| Texto de destaque: ênfase sobre a página | 4.5:1 | `#9A3A00` / `#EDEFF2` | **6,12:1** ok | `#FFC247` / `#0E1216` | **11,69:1** ok |
| Texto de destaque: ênfase sobre destaque | 4.5:1 | `#9A3A00` / `#FFF0C2` | **6,21:1** ok | `#FFC247` / `#3A2C06` | **8,46:1** ok |
| Link: links | 4.5:1 | `#0F4C9A` / `#FFFFFF` | **8,33:1** ok | `#8FBFFF` / `#171C22` | **9,03:1** ok |
| Link: links sobre a página | 4.5:1 | `#0F4C9A` / `#EDEFF2` | **7,23:1** ok | `#8FBFFF` / `#0E1216` | **9,91:1** ok |
| Texto no destaque: item novo anunciado | 4.5:1 | `#14181D` / `#FFF0C2` | **15,70:1** ok | `#F1F3F5` / `#3A2C06` | **12,24:1** ok |
| Cabeçalho: texto do cabeçalho | 4.5:1 | `#F4F6F8` / `#14181D` | **16,45:1** ok | `#F4F6F8` / `#0A0D10` | **17,98:1** ok |
| Navegação ativa: texto do item atual na barra inferior (âmbar sobre asfalto) | 4.5:1 | `#FFB300` / `#14181D` | **9,93:1** ok | `#FFB300` / `#0A0D10` | **10,85:1** ok |
| Cabeçalho: texto secundário do cabeçalho | 4.5:1 | `#B9C1CB` / `#14181D` | **9,81:1** ok | `#B9C1CB` / `#0A0D10` | **10,72:1** ok |
| Botão primário: rótulo no botão âmbar | 4.5:1 | `#14181D` / `#FFB300` | **9,93:1** ok | `#14181D` / `#FFB300` | **9,93:1** ok |
| Botão primário (hover): rótulo em hover | 4.5:1 | `#14181D` / `#FFC233` | **11,05:1** ok | `#14181D` / `#FFC233` | **11,05:1** ok |
| Botão primário (pressionado): rótulo pressionado | 4.5:1 | `#14181D` / `#E69F00` | **7,91:1** ok | `#14181D` / `#E69F00` | **7,91:1** ok |
| Botão primário: limite: borda do botão (claro) ou o próprio âmbar (escuro) vs página, UI 3:1 | 3:1 | `#14181D` / `#EDEFF2` | **15,47:1** ok | `#FFB300` / `#0E1216` | **10,48:1** ok |
| Botão primário: limite: idem sobre superfície | 3:1 | `#14181D` / `#FFFFFF` | **17,82:1** ok | `#FFB300` / `#171C22` | **9,55:1** ok |
| Campo: borda: borda de campos e controles (UI 3:1) | 3:1 | `#66707C` / `#FFFFFF` | **5,03:1** ok | `#7C8794` / `#171C22` | **4,69:1** ok |
| Campo: borda: borda de campos sobre a página | 3:1 | `#66707C` / `#EDEFF2` | **4,37:1** ok | `#7C8794` / `#0E1216` | **5,15:1** ok |
| Foco: anel de foco sobre superfície | 3:1 | `#14181D` / `#FFFFFF` | **17,82:1** ok | `#FFD54A` / `#171C22` | **12,13:1** ok |
| Foco: anel de foco sobre a página | 3:1 | `#14181D` / `#EDEFF2` | **15,47:1** ok | `#FFD54A` / `#0E1216` | **13,31:1** ok |
| Foco no cabeçalho: anel de foco no cabeçalho | 3:1 | `#FFD54A` / `#14181D` | **12,62:1** ok | `#FFD54A` / `#0A0D10` | **13,79:1** ok |
| Foco: anel sobre item destacado | 3:1 | `#14181D` / `#FFF0C2` | **15,70:1** ok | `#FFD54A` / `#3A2C06` | **9,64:1** ok |
| Foco: anel sobre área rebaixada | 3:1 | `#14181D` / `#E1E5EA` | **14,09:1** ok | `#FFD54A` / `#0A0D10` | **13,79:1** ok |
| Sucesso: texto de sucesso | 4.5:1 | `#0F6B3A` / `#FFFFFF` | **6,59:1** ok | `#5FD08A` / `#171C22` | **8,87:1** ok |
| Sucesso: texto sobre fundo de sucesso | 4.5:1 | `#0F6B3A` / `#DDF3E4` | **5,66:1** ok | `#5FD08A` / `#12301F` | **7,41:1** ok |
| Sucesso (selo): selo "Entregue/Aceita" | 4.5:1 | `#FFFFFF` / `#0F6B3A` | **6,59:1** ok | `#06210F` / `#5FD08A` | **8,83:1** ok |
| Erro: texto de erro | 4.5:1 | `#B3261E` / `#FFFFFF` | **6,54:1** ok | `#FF8E85` / `#171C22` | **7,72:1** ok |
| Erro: texto sobre fundo de erro | 4.5:1 | `#B3261E` / `#FCE4E1` | **5,39:1** ok | `#FF8E85` / `#3A1512` | **7,30:1** ok |
| Erro: borda: borda de campo inválido | 3:1 | `#B3261E` / `#FFFFFF` | **6,54:1** ok | `#FF8E85` / `#171C22` | **7,72:1** ok |
| Informação: texto informativo | 4.5:1 | `#1B5BA8` / `#FFFFFF` | **6,76:1** ok | `#8FBFFF` / `#171C22` | **9,03:1** ok |
| Informação: texto sobre fundo informativo | 4.5:1 | `#1B5BA8` / `#E1ECF9` | **5,65:1** ok | `#8FBFFF` / `#10233B` | **8,35:1** ok |
| Selo Normal: texto do selo | 4.5:1 | `#14181D` / `#E7EAEE` | **14,77:1** ok | `#F1F3F5` / `#252C35` | **12,67:1** ok |
| Selo Normal: borda: limite do selo | 3:1 | `#566070` / `#FFFFFF` | **6,36:1** ok | `#9CA6B2` / `#171C22` | **6,94:1** ok |
| Selo Urgente: texto do selo | 4.5:1 | `#14181D` / `#FFB300` | **9,93:1** ok | `#14181D` / `#FFB300` | **9,93:1** ok |
| Selo Urgente: limite: limite do selo (borda) | 3:1 | `#14181D` / `#FFFFFF` | **17,82:1** ok | `#FFB300` / `#171C22` | **9,55:1** ok |
| Selo Crítico: texto do selo | 4.5:1 | `#FFFFFF` / `#C42B1C` | **5,66:1** ok | `#14181D` / `#F0584A` | **5,26:1** ok |
| Selo Crítico: limite: limite do selo (borda) | 3:1 | `#14181D` / `#FFFFFF` | **17,82:1** ok | `#F0584A` / `#171C22` | **5,06:1** ok |
| Desabilitado: exceção WCAG para componente inativo; mantido ≥3:1 mesmo assim | 3:1 | `#5E6773` / `#DADFE5` | **4,28:1** ok | `#8E98A4` / `#232A32` | **4,95:1** ok |

Notas de método:
- O anel de foco (`focus.ring`) é desenhado com **2 a 3 px de afastamento** (`outline-offset`), então o fundo adjacente é o da superfície, e é esse par que se mede. No tema escuro o anel é âmbar claro `#FFD54A`; no claro, asfalto.
- No tema escuro a borda do botão primário é o próprio âmbar: o limite do botão é medido contra a página (≥ 10:1).
- O selo Crítico no escuro usa texto asfalto sobre vermelho claro (`#F0584A`), porque texto branco ali ficaria abaixo de 4,5:1.
- Os valores da tabela são regenerados por script a partir dos tokens; se mudar um hex, rode o cálculo de novo.

### 3.3 Tipografia

- **Família única: Barlow** (Google Fonts, OFL), **dois pesos: 500 (corpo) e 700 (títulos, rótulos, botões)**. Desenhada a partir da sinalização rodoviária da Califórnia: arredondada, firme e legível de longe.
- Fallback: `"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`.
- Performance: subconjunto latino, 2 arquivos `woff2` (estimativa: 25 a 35 KB no total), `font-display: swap`, pré-carregar o peso 500. No Expo: `@expo-google-fonts/barlow` (`Barlow_500Medium`, `Barlow_700Bold`); na web preferir **hospedar a fonte** no próprio domínio (evita a ida ao Google e ajuda o Lighthouse). Decisão final de hospedagem: tech-lead.
- Valores (R$, km, kg) usam algarismos tabulares: `font-variant-numeric: tabular-nums`.
- Tipografia escalável: tamanhos em `rem` na web (o zoom de 200% não quebra) e Dynamic Type no iPhone (`maxFontSizeMultiplier` 2). Nunca fixar altura de linha de texto em px sem permitir crescer.
- Nunca usar texto abaixo de 13 px. Caixa alta só nos selos de urgência e no nome da marca.

| Nível | Tamanho / linha | Peso | Uso |
|---|---|---|---|
| display | 52 / 56 | 700 | Chamada do login e do guia |
| 3xl (h1) | 38 / 44 (30 / 36 abaixo de 720 px) | 700 | Título de tela (1 por tela) |
| 2xl | 30 / 36 | 700 | Valores em destaque (R$) |
| xl (h2) | 24 / 30 | 700 | Título de cartão e seção |
| lg (h3) | 19 / 24 | 700 | Subtítulos, resumos |
| base | 17 / 26 | 500 | Corpo, campos, botões (700) |
| sm | 15 / 22 | 500 | Apoio, ajuda, rótulos de dados |
| caption | 13 / 18 | 500/700 | Rótulos da barra inferior, metadados |

### 3.4 Espaçamento, raio, borda, sombra, movimento

| Token | Valores |
|---|---|
| Espaço (base 4) | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 |
| Raio | sm 6 (selos) · md 10 (botões, campos) · lg 14 (cartões, diálogos) · pílula 999 (tags) |
| Borda | 2 px padrão; 3 px em campo inválido e diálogo; 3 px tracejada = "faixa" (divisor e estado vazio) |
| Alvo de toque | mínimo absoluto 24 px (WCAG 2.2) · **controle 48 px** · botão principal do motorista 56 px · cabeçalho 44 px |
| Elevação | Claro: cartão `0 1px 0 rgba(20,24,29,.08), 0 2px 6px rgba(20,24,29,.10)`; diálogo `0 14px 36px rgba(20,24,29,.30)`. Escuro: sem sombra no cartão (borda `#2F3842`), diálogo `0 18px 40px rgba(0,0,0,.65)` |
| Movimento | 120 ms (hover, pressionado) · 200 ms (troca de estado) · 360 ms (mudança de largura/layout). Curva `cubic-bezier(.2,.8,.2,1)`. Só anima `opacity`, `transform` e cores |
| Polling | 10 s (só tela aberta e aba visível) |

**Movimento com significado**: a estrada que anda enquanto conecta; o destaque da proposta nova que se acalma em 2,4 s; o pulso de 1,6 s no ponto verde "atualiza sozinha". Nada mais anima.

**`prefers-reduced-motion: reduce`** (web) e `AccessibilityInfo.isReduceMotionEnabled` (iPhone): todas as animações e transições viram instantâneas; spinner, estrada e esqueleto ficam estáticos, e o texto ("Conectando…", "Carregando…") continua dizendo o que acontece.

**Pontos de quebra** (medidos na largura do contêiner da app, não da janela, para o protótipo funcionar em qualquer largura): ≤ 420 compacto (sem setas de rota, passos sem data) · ≤ 720 celular (formulários em 1 coluna, margens menores) · ≤ 900 cartões e formulários empilham · ≤ 960 barra inferior no lugar da navegação do cabeçalho · ≤ 1240 cabeçalho sem nome do usuário e sem ícones na navegação · > 1240 desktop largo (conteúdo máx. 1120 px). Verificado por script: nenhuma tela das 19 tem rolagem horizontal em 320, 390, 768 e desktop.

### 3.5 Bloco `tokens.ts` (pronto para colar)

```ts
// tokens.ts: gerado a partir de docs/front/design-system.md (fonte da verdade)
// Não use valores soltos nos componentes: sempre leia daqui.

export const colors = {
  light: {
    bg: {
      page: '#EDEFF2',
      surface: '#FFFFFF',
      sunken: '#E1E5EA',
      inverse: '#14181D',
      highlight: '#FFF0C2'
    },
    text: {
      primary: '#14181D',
      secondary: '#3D4651',
      muted: '#566070',
      onInverse: '#F4F6F8',
      onInverseMuted: '#B9C1CB',
      accent: '#9A3A00',
      link: '#0F4C9A'
    },
    border: {
      subtle: '#C5CBD3',
      control: '#66707C',
      strong: '#14181D'
    },
    action: {
      fill: '#FFB300',
      fillHover: '#FFC233',
      fillPressed: '#E69F00',
      onFill: '#14181D',
      border: '#14181D'
    },
    focus: {
      ring: '#14181D',
      ringOnInverse: '#FFD54A'
    },
    success: {
      text: '#0F6B3A',
      bg: '#DDF3E4',
      fill: '#0F6B3A',
      onFill: '#FFFFFF'
    },
    error: {
      text: '#B3261E',
      bg: '#FCE4E1',
      border: '#B3261E'
    },
    info: {
      text: '#1B5BA8',
      bg: '#E1ECF9'
    },
    urgency: {
      normal: {
        bg: '#E7EAEE',
        text: '#14181D',
        border: '#566070'
      },
      urgente: {
        bg: '#FFB300',
        text: '#14181D',
        border: '#14181D'
      },
      critico: {
        bg: '#C42B1C',
        text: '#FFFFFF',
        border: '#14181D'
      }
    },
    disabled: {
      bg: '#DADFE5',
      text: '#5E6773'
    }
  },
  dark: {
    bg: {
      page: '#0E1216',
      surface: '#171C22',
      sunken: '#0A0D10',
      inverse: '#0A0D10',
      highlight: '#3A2C06'
    },
    text: {
      primary: '#F1F3F5',
      secondary: '#C3CAD2',
      muted: '#9CA6B2',
      onInverse: '#F4F6F8',
      onInverseMuted: '#B9C1CB',
      accent: '#FFC247',
      link: '#8FBFFF'
    },
    border: {
      subtle: '#2F3842',
      control: '#7C8794',
      strong: '#F1F3F5'
    },
    action: {
      fill: '#FFB300',
      fillHover: '#FFC233',
      fillPressed: '#E69F00',
      onFill: '#14181D',
      border: '#FFB300'
    },
    focus: {
      ring: '#FFD54A',
      ringOnInverse: '#FFD54A'
    },
    success: {
      text: '#5FD08A',
      bg: '#12301F',
      fill: '#5FD08A',
      onFill: '#06210F'
    },
    error: {
      text: '#FF8E85',
      bg: '#3A1512',
      border: '#FF8E85'
    },
    info: {
      text: '#8FBFFF',
      bg: '#10233B'
    },
    urgency: {
      normal: {
        bg: '#252C35',
        text: '#F1F3F5',
        border: '#9CA6B2'
      },
      urgente: {
        bg: '#FFB300',
        text: '#14181D',
        border: '#FFB300'
      },
      critico: {
        bg: '#F0584A',
        text: '#14181D',
        border: '#F0584A'
      }
    },
    disabled: {
      bg: '#232A32',
      text: '#8E98A4'
    }
  },
} as const;

/** Cores que não mudam de tema (marca e faixas decorativas). */
export const brand = {
  amber: '#FFB300',
  asphalt: '#14181D',
  hazardStripe: 'repeating-linear-gradient(135deg, #14181D 0 12px, #FFB300 12px 24px)', // só web; no iPhone use imagem/SVG repetido
} as const;

export const fonts = {
  // pacote: @expo-google-fonts/barlow (Barlow_500Medium, Barlow_700Bold)
  regular: 'Barlow_500Medium',
  bold: 'Barlow_700Bold',
  fallbackWeb: '"Barlow", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
} as const;

/** Tamanhos em px. No iPhone, respeitar Dynamic Type (allowFontScaling padrão) e maxFontSizeMultiplier 2. */
export const type = {
  caption: { size: 13, line: 18, weight: 'regular' },
  sm:      { size: 15, line: 22, weight: 'regular' },
  base:    { size: 17, line: 26, weight: 'regular' },
  lg:      { size: 19, line: 24, weight: 'bold' },
  xl:      { size: 24, line: 30, weight: 'bold' },
  '2xl':   { size: 30, line: 36, weight: 'bold' },
  '3xl':   { size: 38, line: 44, weight: 'bold' },
  display: { size: 52, line: 56, weight: 'bold' },
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;
export const border = { width: 2, widthStrong: 3, widthInvalid: 3 } as const;
export const touch = { min: 44, control: 48, primary: 56, absoluteMin: 24 } as const;
export const breakpoints = { compact: 420, phone: 720, tabbar: 960, wide: 1240 } as const; // largura máxima do contêiner da app para cada regra

export const shadow = {
  light: {
    card: { shadowColor: '#14181D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6, elevation: 2 },
    dialog: { shadowColor: '#14181D', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.30, shadowRadius: 36, elevation: 12 },
  },
  // no escuro a hierarquia vem da borda e do tom da superfície
  dark: {
    card: { shadowColor: '#000000', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    dialog: { shadowColor: '#000000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.65, shadowRadius: 40, elevation: 12 },
  },
} as const;

export const motion = {
  duration: { fast: 120, base: 200, slow: 360 },
  easing: [0.2, 0.8, 0.2, 1] as const, // cubic-bezier de desaceleração
  pollingMs: 10000,
  /** Com prefers-reduced-motion (web) ou isReduceMotionEnabled (iOS): duração 0 e sem loops. */
} as const;

export const urgencyLabel = { normal: 'Normal', urgente: 'Urgente', critico: 'Crítico' } as const;
export const urgencyIcon = { normal: 'circle', urgente: 'triangle-alert', critico: 'octagon-alert' } as const;
export type ThemeName = keyof typeof colors;
export type Urgency = keyof typeof urgencyLabel;
```

CSS equivalente (web): variáveis `--bg-page`, `--text-primary`, etc., exatamente como na coluna "Variável CSS" da tabela 3.1. O tema é aplicado em `<html data-theme="light|dark">` (sem atributo = segue o sistema por `prefers-color-scheme`). O protótipo `index.html` é a implementação de referência.

---

## 4. Ícones e imagens

- **Ícones**: SVG de traço 2 px, grade 24, `currentColor`, no estilo Lucide (ISC). Sempre **decorativos** (`aria-hidden="true"`) quando há texto ao lado. Ícone sozinho (ex.: tema e sair no celular) leva `aria-label` e alvo de 44 px. Tamanho padrão 1,25 em (≈ 21 px); em destaque 1,75 em.
- Conjunto usado hoje (paths no protótipo, `<symbol>` em `index.html`): `triangle-alert`, `octagon-alert`, `circle`, `map-pin`, `locate`, `truck`, `package`, `clock`, `shield-check`, `check`, `x`, `plus`, `refresh`, `sun`, `moon`, `log-out`, `arrow-right`, `arrow-left`, `building`, `info`, `loader`, `bell`, `banknote`, `search`, `server`, `user`, `file`, `flask`, `inbox`, `lock`, `send`, `wifi-off`. Qualquer ícone novo precisa da aprovação do designer.
- **Forma das urgências**: Normal = círculo (`circle`), Urgente = triângulo de advertência (`triangle-alert`), Crítico = octógono (`octagon-alert`).
- **Imagens**: nenhuma imagem raster no MVP. Ilustrações são SVG simples (as três placas do login). Foto de carga/motorista fica fora. Mapa só sob demanda (card "se der").
- **PWA**: ícones 192/512 PNG + `maskable` gerados do símbolo (seção 2); cor de tema `#14181D` (barra do navegador) e `background_color` `#EDEFF2`.
- Na web use um **sprite SVG inline** (um só bloco `<svg><symbol>`); no iPhone, `react-native-svg` com os mesmos paths. A escolha da lib é do tech-lead.

---

## 5. Componentes (atomic design)

Legenda dos estados: **P** padrão · **H** hover (só web/ponteiro) · **F** foco do teclado · **Pr** pressionado · **D** desabilitado · **E** erro · **C** carregando · **V** vazio. "n/a" = não se aplica. No iPhone não existe hover; o pressionado usa `Pressable` com o mesmo visual. O foco no iPhone é o do VoiceOver (o sistema desenha); o anel desta tabela vale para a web.

**Foco visível (regra única):** `outline: 3px solid focus.ring; outline-offset: 3px` em tudo que é interativo (2 px nos campos). Dentro do cabeçalho asfalto, `focus.ringOnInverse`. Nunca remover o anel.

### 5.1 Átomos

| Componente | Variantes | Estados (visual) | Acessibilidade |
|---|---|---|---|
| **Button** | primário (âmbar, borda asfalto, texto asfalto); secundário (superfície, borda `border.control`); perigo (texto/borda `error.*`, ex.: Recusar); texto (ghost, sublinhado); tamanhos md 48 · lg 56 · bloco | **P** como descrito · **H** `action.fillHover` (secundário: fundo `bg.sunken`, borda escura) · **F** anel · **Pr** `action.fillPressed` + desce 1 px · **D** fundo `disabled.bg`, texto `disabled.text`, sem sombra, `disabled` real · **C** ícone girando + rótulo de progresso ("Publicando…"), `aria-disabled="true"` e `aria-busy="true"` (**1 clique = 1 requisição**) · **E** n/a · **V** n/a | `<button>`/`role="button"`; rótulo sempre texto (ícone decorativo); mínimo 48 px; ação destrutiva sempre pede confirmação (ConfirmDialog) |
| **TextInput** | texto, número (`inputmode`), senha, e-mail | **P** borda 2 px `border.control`, fundo `bg.surface` · **H** borda `text.primary` · **F** anel + borda `text.primary` · **D** `disabled.*` · **E** borda 3 px `error.border` + ícone + texto do erro abaixo · **C** n/a · **V** placeholder `text.muted` (nunca como rótulo) | `<label for>` visível; `aria-invalid`; `aria-describedby` liga ajuda e erro; `autocomplete` correto (`email`, `current-password`, `new-password`, `name`); altura 48 px; teclado numérico/decimal no iPhone |
| **Select** | nativo | Igual ao TextInput, com seta | `<select>` nativo na web; no iPhone, seletor nativo |
| **ChoiceChip** (rádio visual) | texto simples; com selo de urgência dentro | **P** borda `border.control` · **H** borda escura · **F** anel · selecionado: fundo `bg.highlight`, borda escura 2 px **e ícone de check** · **D** `disabled.*` | `<input type="radio">` real dentro de `<fieldset><legend>`; alvo 48 px; seleção nunca só por cor |
| **UrgencyBadge** (selo) | normal · urgente · crítico; tamanho md (32 px) e lg (40 px) | Ver seção 6 | Texto sempre presente + prefixo oculto "Urgência: " para leitor de tela |
| **StatusTag** (pílula) | neutro (Fechada, Pendente) · ok (Aberta, Aceita, Aprovada, Pago) · erro (Recusada) · info (Exige MOPP) · novo (âmbar) · tracejada (Expirada) | estático; sempre ícone + texto | Contraste de texto do par do papel; texto nunca cortado (quebra de linha permitida) |
| **KmMarker** | — | Caixa com borda asfalto 2 px: "12,4 km até a coleta" | Texto completo, não só o número |
| **Price** | R$ em destaque (`text.accent`, 30 px, tabular) | expirado: `text.secondary` | Formato `R$ 3.500,00` (D-PO-12) |
| **Icon** | tamanhos 1,25 em / 1,75 em | herda a cor do texto | `aria-hidden` quando decorativo |
| **Spinner** | pequeno (no botão) e grande | girando; **reduced-motion**: parado | Nunca sozinho: sempre com texto ("Carregando cargas…") |
| **Skeleton** | linhas e blocos | brilho andando 1,4 s; **reduced-motion**: estático | `aria-hidden`; a região tem `role="status"` com texto |
| **Link** | texto em `text.link`, sublinhado 2 px | **H** sublinhado 3 px · **F** anel | Sublinhado sempre (não só cor); alvo ≥ 24 px; para ação grande use Button |
| **RoadDivider** | tracejado âmbar (cabeçalho) ou cinza (separador, 3 px) | decorativo | `aria-hidden`/`<hr>` sem significado |
| **Logo** | símbolo, horizontal | — | Link para a tela inicial com `aria-label="Backhaul, início"` |

### 5.2 Moléculas

| Componente | Composição | Estados | Acessibilidade |
|---|---|---|---|
| **FormField** | Label + TextInput/Select + ajuda + erro | P · F · E (ícone + texto + borda 3 px) · D | Rótulo visível acima; erro com `aria-describedby`; opcional marcado "(opcional)" no rótulo |
| **PasswordField** | FormField + botão "Mostrar/Ocultar" | P · F; botão com `aria-pressed` | Botão alcançável por teclado, alvo 44 px, `autocomplete` |
| **AffixField** | FormField com prefixo "R$" ou sufixo "kg" | igual ao FormField | Prefixo/sufixo `aria-hidden` (a unidade está no rótulo/ajuda) |
| **CityCombobox** | Input + lista | P (fechado) · aberto (lista com a opção ativa em âmbar) · vazio ("Nenhuma cidade encontrada. Tente outro nome.") · F | Padrão ARIA 1.2: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, lista `role="listbox"`/`option`; setas, Enter, Esc; filtro sem acento nem caixa; anúncio "N resultados" em `role="status"` |
| **GpsButton** | Button secundário "Usar minha localização" + resultado | P · C ("Obtendo localização…") · sucesso (Banner ok "Minha localização atual · cidade mais próxima") · negado (Banner aviso, volta à lista) | Resultado em região `status`; negado não bloqueia o formulário (D-PO-16) |
| **UrgencyPicker** | Fieldset com 3 ChoiceChips + selos | P (padrão Normal) · F · selecionado | `<fieldset>` + `<legend>Urgência</legend>` |
| **DeadlinePicker** | Fieldset com chips 2 h · 6 h · 12 h · 24 h · 48 h | igual | Opções relativas a "agora" (D-PO-02) |
| **Banner** | ícone + título + texto (+ ação) | variantes info · ok · aviso (fundo `bg.highlight`) · erro; sempre borda 2 px + ícone | erro e sessão: `role="alert"`/`status`; ícone decorativo |
| **ErrorSummary** | Banner erro + lista de links | foco vai para o resumo ao enviar; cada item leva ao campo | `role="alert"`, `tabindex="-1"`; os links focam o campo |
| **LiveBar** (anúncio de novidade) | sino + título + "atualiza sozinha a cada 10 s" + ponto pulsando + (ação) | fundo `bg.highlight`, borda `text.primary` | `role="status" aria-live="polite"`; **não move o foco** nem apaga o que se digitava; o ponto pulsa só sem reduced-motion |
| **RouteLine** | Coleta em A — — → Entrega em B | em tela ≤ 420 px some a seta e os pontos empilham | Texto "Coleta em / Entrega em" sempre presente |
| **FactList** | `<dl>` rótulo (15 px, apoio) + valor (700) em grade | — | `<dl>`, `<dt>`, `<dd>` |
| **Stepper** (andamento do frete) | 3 paradas: Aceito · Em trânsito · Entregue | concluída (check, verde), atual (âmbar, `aria-current="step"`), pendente (cinza); linha sólida até a atual | `<ol>` com texto oculto "(concluído)/(etapa atual)/(pendente)"; nunca só cor |
| **PaymentSummary** | cabeçalho asfalto + `<dl>`: Valor do frete, Percentual de comissão, Comissão da plataforma, Situação | aparece só após o 201; valores **exatamente** os da API | Foco vai ao resumo e o anúncio "Pagamento registrado" sai em `status`; nenhuma constante de comissão no código |
| **EmptyState** | ícone em círculo + título + frase + ação | V | Título é `<h2>`; ação obrigatória |
| **NavTab** | ícone + rótulo | atual: âmbar + barra superior (barra inferior) ou sublinhado âmbar (cabeçalho) | `aria-current="page"`; rótulo sempre visível; 60 px |
| **ThemeToggle** | botão com ícone (+ "Tema claro/escuro/auto") | cicla Sistema → Claro → Escuro | `aria-label` "Alternar tema. Atual: …"; escolha salva |

### 5.3 Organismos

| Componente | Descrição | Estados | Acessibilidade |
|---|---|---|---|
| **AppHeader** | Asfalto, faixa tracejada âmbar na base; logo, navegação, usuário (nome + perfil), tema, Sair | desktop: navegação horizontal · ≤ 960: some a navegação (vai para a TabBar), ficam logo + ícones | `<header>`; `<nav aria-label="Principal">`; foco `ringOnInverse` |
| **TabBar** | Barra inferior fixa (≤ 960 px), 3 a 4 itens com ícone e rótulo | atual em âmbar | `<nav aria-label>`; 60 px de altura |
| **CargaCard** (motorista) | Faixa de urgência no topo; selo lg, certificação, prazo; título e empresa; rota; peso e certificação; lateral com preço, KmMarker e ações (Aceitar R$ X, Contraproposta) | variantes por urgência (seção 6) · "Proposta enviada" (sem botões, D-PO-05) · carregando (Skeleton) | `<article aria-labelledby>` em `<li>`; título `<h2>`; botões com valor no rótulo |
| **CargaCard** (empresa) | Mesma base: selo, status, certificação; fatos; contador de propostas e "Ver propostas" | aberta · fechada · **expirada** (borda tracejada, fundo rebaixado, sem destaque de urgência, sem ações de negociação) | idem |
| **PropostaCard** (empresa) | Nome do motorista, "Nova", Pendente, tipo; veículo/placa/capacidade/quando; certificações (nome, validade, Aprovada/Não aprovada); preço; Aceitar e Recusar | nova (destaque que se acalma) · pendente · aceita/recusada (sem botões) | `<h3>`; certificações em lista; botões abrem ConfirmDialog |
| **PropostaCard** (motorista) | Carga resumida, tipo, status, valor próprio e oferecido, "Ver frete" se aceita | pendente · aceita · recusada · carga indisponível (aviso) | status em texto + ícone |
| **FreteCard** | Tipo e parte contrária, valor final, Stepper, pagamento (tag), ação do próximo passo ou "Pagar frete", PaymentSummary | aceito · em trânsito · entregue; pagamento aguardando/retido/liberado | Botão único com próximo passo (D-PO-09) com confirmação |
| **ConfirmDialog** | Diálogo modal: título, frase, Cancelar + confirmar | aberto | `<dialog>`/`role="dialog" aria-modal`, `aria-labelledby/describedby`; foco inicial em **Cancelar**; Esc fecha; foco volta ao botão de origem (ou ao resultado) |
| **ContextBar** | Disponibilidade ativa: local, raio, validade + "Trocar disponibilidade" | com/sem | Texto completo, não só ícone |
| **FormCard** | Cartão de formulário com grade de 2 colunas (1 coluna ≤ 720) e rodapé de ações à direita | P · enviando · com erros | `<form novalidate>`, ErrorSummary no topo |
| **AuthHero** | Painel asfalto com marca, chamada, três placas e estrada | decorativo | Texto da chamada em `<p>` (o `<h1>` é o "Entrar") |

### 5.4 Templates

| Template | Estrutura | Telas |
|---|---|---|
| **AuthTemplate** | AuthHero (esquerda) + cartão de formulário (direita); ≤ 900 px empilha | Login, Login com sessão expirada |
| **CenteredTemplate** | Cabeçalho simples + coluna central (≤ 520 px) | Conectando, Falha de conexão |
| **FormPageTemplate** | Cabeçalho simples + página estreita (≤ 760 px) + voltar + FormCard | Escolha de cadastro, Cadastro motorista/empresa |
| **AppPageTemplate** | AppHeader + `<main>` (≤ 1120 px) com título (`<h1>`) e ações à direita + TabBar | Todas as telas autenticadas |
| **FormWithPreviewTemplate** | AppPageTemplate com grade form + lateral (340 px, some ≤ 900) | Publicar carga, Publicar disponibilidade |
| **ListTemplate** | AppPageTemplate com lista vertical de cartões e LiveBar opcional | Minhas cargas, Cargas próximas, Propostas, Fretes |

Landmarks por tela: cabeçalho, navegação, **um** `<main>`, **um** `<h1>`. A barra inferior e a navegação do cabeçalho são o mesmo conjunto (uma delas fica oculta por largura, nunca as duas).

---

## 6. Selo de urgência

O diferencial do produto. Sinais, em ordem: **texto → forma → cor**.

| Nível | Texto | Forma | Selo (claro) | Selo (escuro) | Cartão |
|---|---|---|---|---|---|
| Normal | NORMAL | Círculo | fundo `#E7EAEE`, texto asfalto, borda `#566070` | fundo `#252C35`, texto claro, borda `#9CA6B2` | Borda normal, sem faixa |
| Urgente | URGENTE | Triângulo de advertência | fundo âmbar `#FFB300`, texto asfalto, borda asfalto | igual, borda âmbar | Faixa âmbar de 8 px no topo + borda asfalto (claro) ou âmbar (escuro) |
| Crítico | CRÍTICO | Octógono (como placa de PARE) | fundo `#C42B1C`, texto branco (5,7:1), borda asfalto | fundo `#F0584A`, texto asfalto, borda igual | **Faixa de obra** (listras âmbar e asfalto) de 12 px + borda asfalto (claro) ou vermelha (escuro) |

- Texto do selo em caixa alta, peso 700, espaçamento de letras 0,07 em, 15 px (lg: 17 px). O nome lido pelo leitor de tela é "Urgência: Crítico".
- Em escala de cinza os três continuam distintos (forma + texto + tom).
- O selo vai **no topo-esquerda** do cartão, antes do título. Em listas, a ordem da API é preservada (urgência, depois distância): o front não reordena.
- Crítico usa vermelho, não âmbar, de propósito: assim "Urgente" (âmbar, o laranja da marca) e "Crítico" (vermelho sinal) não competem.

---

## 7. Padrões de estados de tela

Todo estado tem **texto próprio** e uma **próxima ação**. Mensagens do servidor (`erro`/`erros`) são mostradas como vêm quando 400/403/404/409; 500, rede e corpo não-JSON viram "Algo deu errado. Tente de novo." Nunca HTML, stack ou JSON cru.

| Estado | Visual | Texto-modelo | Semântica |
|---|---|---|---|
| **Carregando** | Cartão com Spinner + frase + 3 linhas de Skeleton; botões de envio desabilitados com rótulo de progresso | "Carregando cargas…" | `role="status" aria-live="polite"`; esqueleto `aria-hidden` |
| **Vazio** | Caixa com borda tracejada 3 px, ícone em círculo âmbar claro, título, frase, botão | "Você ainda não publicou uma disponibilidade" + "Publicar disponibilidade" | Título `<h2>`; sempre com ação (CT-02) |
| **Erro de carregamento** | Banner erro com botão secundário | "Algo deu errado. Tente de novo." + "Tentar de novo" | `role="alert"` |
| **Erro de formulário** | ErrorSummary no topo + erro junto de cada campo (borda 3 px, ícone, texto) | "Corrija 3 campos para continuar." | `role="alert"`; foco vai ao resumo; links focam os campos |
| **Sessão expirada (401)** | Banner aviso no topo do login | "Sua sessão expirou. Entre de novo." | `role="status"` |
| **Credencial errada (401 no login)** | Erro do formulário (não é sessão expirada) | "E-mail ou senha inválidos" | foco na mensagem |
| **"Conectando ao servidor"** | Cabeçalho simples, estrada animada com caminhão, título, frase, Banner info com tentativa | "Conectando ao servidor" · "O servidor pode levar até 1 minuto para acordar…" · "Tentativa 3 de 18" | `role="status"`; estrada parada em reduced-motion |
| **Falha de conexão** | Ícone sem-sinal, título, frase, botão | "Não foi possível conectar ao servidor" + "Tentar de novo" | frase em `role="alert"` |
| **GPS negado** | Banner aviso; o seletor de cidade continua | "Não conseguimos pegar sua localização. Você pode escolher a cidade na lista." | `role="status"` |
| **Expirada (CT-10)** | Cartão com borda tracejada, fundo rebaixado, sem faixa de urgência, selo "Expirada" com relógio | "Prazo vencido em 28/10, 10:00" | Sem botões de negociação |
| **Novidade do polling** | LiveBar (fundo `bg.highlight`) com sino, título, ponto pulsando e hora da última atualização; o item novo ganha a etiqueta "Nova" e um destaque de 2,4 s | "1 nova proposta" · "Esta tela atualiza sozinha a cada 10 s. Última atualização às 14:32:08." | `role="status" aria-live="polite"`; **sem mover o foco**; botão "Atualizar" sempre presente |
| **Confirmação** | ConfirmDialog | "Aceitar a proposta de João da Silva?" | foco em Cancelar; foco volta ao disparador |
| **Sucesso de ação** | Banner ok com foco programático | "Frete criado." / "Proposta enviada." | `status`; foco move-se ao banner |
| **Botão enviando** | Spinner + rótulo "Publicando…", `aria-disabled` | — | `aria-busy`; 1 clique = 1 requisição |

---

## 8. Acessibilidade transversal

- **Contraste**: seção 3.2 (calculada). Texto 4,5:1; UI e foco 3:1.
- **Foco**: sempre visível, 3 px, afastado 2–3 px; não pode ficar escondido atrás de barra fixa (a barra inferior é 60 px; use `scroll-padding-bottom`).
- **Alvos de toque**: ≥ 48 px nos controles; nenhum alvo abaixo de 24 px. Links inline são exceção da WCAG, mas ações importantes são botões.
- **Cor nunca é o único sinal**: urgência (texto + forma), status (ícone + texto), erro (ícone + texto + borda mais grossa), passo atual (`aria-current` + ícone + preenchimento), opção escolhida (check).
- **Teclado**: ordem visual = ordem do DOM; diálogo prende o foco; combobox por setas; botão "Mostrar" da senha alcançável.
- **Leitor de tela**: landmarks; um `<h1>`; ordem de títulos sem saltos (h1 → h2 → h3); `<dl>` para dados; listas reais; regiões vivas educadas para novidades; status em texto oculto ("(etapa atual)").
- **Movimento**: `prefers-reduced-motion` zera animações e transições (inclusive o "salto" do caminhão e o pulso).
- **Escala de texto**: `rem` na web; Dynamic Type no iPhone; testar 200% e 320 px.
- **Idioma**: `lang="pt-BR"`. Moeda `R$ 3.500,00`, distância `12,4 km`, peso `8.000 kg`, datas no fuso `America/Sao_Paulo` (D-PO-12).

---

## 9. Mapa do protótipo

`docs/front/prototipos/index.html` (autocontido; só a fonte vem do Google Fonts; sem scripts externos). Abra no navegador: barra superior troca **perfil**, **largura** (Desktop, Tablet 768, Celular 390, Mínimo 320) e **tema** (Sistema, Claro, Escuro); a lista à esquerda navega entre as 19 telas; cada tela tem "Notas de design e acessibilidade"; a aba "Guia visual" mostra identidade, cores, selos, tipografia, estados e a tabela de contraste. URL com estado: `#tela=m-cargas&tema=escuro&w=phone&perfil=motorista`.

| Tela do protótipo | Item do MVP |
|---|---|
| Conectando ao servidor · Servidor não respondeu | MVP-02 |
| Login · Login com sessão expirada | MVP-03, MVP-04 |
| Criar conta · Cadastro de motorista · Cadastro com erros · Cadastro de empresa | MVP-05, MVP-06 |
| Minhas cargas (empresa) | MVP-09 |
| Publicar carga | MVP-08, MVP-07 |
| Propostas da carga (com proposta nova anunciada e diálogo de aceite) | MVP-14 |
| Meus fretes (empresa, com Pagar frete e resumo da comissão) | MVP-17 |
| Publicar disponibilidade (cidade + GPS) e Minhas disponibilidades | MVP-10, MVP-11 |
| Cargas próximas (selos, distância, MOPP) | MVP-12 |
| Fazer proposta / contraproposta | MVP-13 |
| Minhas propostas | MVP-15 |
| Meus fretes (motorista, botão do próximo passo) | MVP-16 |
| Cargas próximas vazio (sem disponibilidade) | MVP-12, CT-02 |
| Galeria de estados | CT-01 a CT-10 |

Dados do protótipo são fictícios e realistas (região de Uberlândia, MG). Os números de comissão (5%) são exemplo: no app vêm **sempre** da resposta de `POST /fretes/:id/pagamento`.

---

## 10. Regras para quem implementa

1. Importe cores, espaços, raios e tipos de `tokens.ts`. Hex solto num componente reprova no PR.
2. Cada componente da seção 5 vira um componente com os estados da tabela; props de estado (`loading`, `invalid`, `disabled`) em vez de estilos soltos.
3. Todo botão de ação irreversível passa pelo ConfirmDialog (aceitar, recusar, pagar, avançar frete, enviar contraproposta).
4. Texto de interface em pt-BR, frases curtas, verbo no infinitivo nos botões ("Publicar carga", "Aceitar proposta").
5. Dúvida de estilo? Pergunte ao designer. Não invente variante nova.
6. Se mudar um token de cor, refaça a tabela de contraste (3.2) antes de abrir o PR.

---

## 11. Decisões em aberto (para o Pedro)

1. **Hospedagem da fonte Barlow**: Google Fonts (como no protótipo) ou arquivo próprio no `app/`. Recomendação do designer: arquivo próprio (mais rápido e sem dependência externa). Decisão técnica do tech-lead, mas muda o Lighthouse.
2. **Crítico em vermelho** (e não mais um âmbar): é uma escolha do designer para separar Urgente de Crítico. Se o Pedro preferir tudo na família laranja, o selo Crítico passa a laranja-escuro com texto branco e perde distinção.
3. **Carga MOPP no protótipo é "Crítico"** (para aparecer no topo da lista e mostrar os três selos). O roteiro da demo (PRD 4.3) fala em "carga urgente com MOPP": combinar qual urgência o apresentador vai escolher.
4. **Tela de administrador (D-PO-10)** e a lista completa "Minhas disponibilidades" (MVP-11) só estão representadas de forma resumida (a segunda como seção da tela de disponibilidade; a primeira, não prototipada por ser só um texto e um botão Sair).
5. **Base de 17 px** no corpo (maior que o comum) por causa da projeção e da estrada. Se o Pedro achar grande, reduzir para 16 px é só mudar `type.base` e `sm`.
6. **Wordmark em caixa alta** com símbolo losango. Se quiser um logotipo mais "empresa", trocar a caixa alta por "Backhaul" em 700 (o símbolo fica).
