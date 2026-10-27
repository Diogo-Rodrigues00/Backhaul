# 018 — Seletor de local (cidades + GPS)

| Campo | Valor |
|---|---|
| Itens MVP | MVP-07, D-PO-16 |
| Prioridade | MVP |
| Agente / modelo | `dev-front` / **sonnet** — busca com resultados anunciados, permissão de GPS e acessibilidade de seleção não trivial |
| Branch | `feat/seletor-local` |
| Estimativa | M (≈4 h) |
| Bloqueado por | 007, 009 · PROTO |
| Bloqueia | 019, 023 |

## Objetivo
Organism reutilizável para escolher um local por cidade (empresa e motorista) ou por GPS (só motorista), sem digitar coordenadas.

## Rotas da API
Nenhuma (lista fixa do card 007).

## Telas / componentes
`organisms/SeletorLocal` — props: `rotulo` ("Origem", "Destino", "Onde você está"), `valor: Local | null`, `aoMudar(local)`, `permitirGps?: boolean`, `erro?: string`, `id`.
- `Local = { lat: number; lng: number; rotulo: string; origem: 'cidade' | 'gps' }`.
- **Web — CityCombobox do DS (ARIA 1.2):** `TextInput` com `role="combobox"`, `aria-expanded`, `aria-controls` (id da lista), `aria-activedescendant` (opção ativa), `aria-autocomplete="list"`; lista `role="listbox"` com até 8 `role="option"` (`aria-selected`), opção ativa em âmbar; setas ↑/↓ movem a ativa, Enter escolhe, Esc fecha; vazio "Nenhuma cidade encontrada. Tente outro nome."; contagem "N resultados" em `role="status"` com atraso de 300 ms após digitar. Implementar em `SeletorLocal.web.tsx` (teclas por `onKeyPress` do `TextInput`).
- **iPhone:** `SeletorLocal.native.tsx` com o mesmo campo e, abaixo, até 8 resultados como botões (`role="button"`, nome "Escolher Uberlândia - MG") — o VoiceOver não tem combobox; contagem anunciada por `anunciar`.
- Escolhido: texto "Selecionado: Uberlândia - MG" + botão "Trocar".
- `permitirGps` (GpsButton do DS): `Botao` secundário "Usar minha localização" (carregando: "Obtendo localização…"; sucesso: `Banner` ok; negado: `Banner` aviso) → `expo-location` (`requestForegroundPermissionsAsync`, `getCurrentPositionAsync` com timeout 10 s) → `{ origem: 'gps', rotulo: 'Minha localização atual (perto de ' + cidadeMaisProxima + ')' }`.
- GPS negado/erro/timeout: mensagem explicando ("Não foi possível usar sua localização. Escolha a cidade na lista.") e a busca continua disponível (D-PO-16).
- O módulo de cidades é importado aqui e nas telas que mostram nome de cidade, nunca no `_layout` (ADR 0011).

## Arquivos e pastas
`src/components/organisms/SeletorLocal.web.tsx`, `SeletorLocal.native.tsx`, lógica comum em `SeletorLocal.logica.ts` (busca, GPS) + testes; instalar `expo-location`; `app.json` com o texto de permissão de localização em pt-BR (`NSLocationWhenInUseUsageDescription` via plugin `expo-location`).

## Critérios de aceite
- [ ] Busca ignora acentos e maiúsculas ("uberlandia" encontra "Uberlândia") (MVP-07).
- [ ] Operável só por teclado; leitor de tela anuncia nome do campo, número de resultados e opção selecionada (MVP-07).
- [ ] Motorista: "Usar minha localização" com permissão → coordenadas do aparelho + "Minha localização atual" + cidade mais próxima (MVP-07).
- [ ] Permissão negada ou erro → mensagem e seletor de cidade disponível (MVP-07, D-PO-16).
- [ ] Empresa (`permitirGps` falso) não vê o botão de GPS (MVP-07).
- [ ] `erro` do formulário associado ao campo de busca.
- [ ] Atende CT-05, CT-08.

## Testes exigidos
- RNTL: busca sem acento, seleção por toque, setas/Enter/Esc na versão web (`aria-activedescendant` muda), anúncio de contagem, GPS concedido (mock de `expo-location`), negado, timeout, `permitirGps` falso.

## Checklist de acessibilidade e performance
- [ ] Opções ≥ 48 px; opção ativa e selecionada indicadas por texto/forma, não só cor.
- [ ] Playwright + axe com a lista aberta (padrão combobox sem violações).
- [ ] Anúncio de contagem não dispara a cada tecla (atraso).
- [ ] Chunk que contém as cidades ≤ 30 KB gzip somado à rota.
- [ ] iPhone: diálogo de permissão em pt-BR; VoiceOver lê "selecionado".
