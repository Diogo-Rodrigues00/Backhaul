# Backhaul — App (front-end)

Plataforma que conecta caminhoneiros disponíveis a cargas urgentes próximas. Projeto acadêmico da Uniube, em grupo. Este diretório é o front: **Expo** (React Native + TypeScript), um código só para iPhone (Expo Go) e navegador (react-native-web).

## Regra de trabalho deste diretório
**Não há live code. Os agentes codam tudo.** A regra do `CLAUDE.md` da raiz ("deixar partes para o dono escrever") **não vale** para o front.

## Fluxo principal (sempre priorizar)
cadastro → login → empresa publica carga → motorista publica disponibilidade → cargas próximas → proposta → aceite → frete → pagamento simulado.

Ordem de entrega combinada com o responsável do backend (Diogo): (1) rodar no navegador e no iPhone, (2) login e cadastro, (3) telas da empresa e do motorista, (4) demais fluxos.

## Datas
- 24/10/2026: congelamento de funcionalidades
- 29/10/2026: apresentação ao professor
- 12/11/2026: Mostra Tech

## Decisões fechadas (não reabrir sem aprovação do Pedro)
| Tema | Decisão |
|---|---|
| Base | Expo (RN + TS): iPhone via Expo Go e navegador via react-native-web. A web é exportada como site estático e também é **PWA instalável** (manifesto, ícones, service worker) |
| Pasta | `app/` |
| API | URL via `EXPO_PUBLIC_API_URL` (`.env` local fora do Git, `.env.example` commitado, variável na Vercel). Nunca colar a URL no código |
| Hospedagem | Web na Vercel, preview por PR |
| Dados | App usa a API real. **MSW só em testes e no Lighthouse CI** |
| Comissão | Nunca fixa no código: exibir `percentual_comissao` / `valor_comissao` que a API devolver |
| Idioma | Interface em pt-BR |
| Stack técnica | Decidida pelo Tech Lead, registrada em ADR (`docs/front/adr/`) |
| Acessibilidade | WCAG 2.2 AA: axe com 0 violações + checklist manual (teclado, foco visível, leitor de tela, contraste, zoom 200%/reflow 320px, `prefers-reduced-motion`, erros associados aos campos) |
| Lighthouse | **100** em Performance, Acessibilidade, Boas práticas e SEO, mobile e desktop, em todas as rotas web. Portão obrigatório no PR (Lighthouse CI) |
| A11y no Expo | Semântica explícita: `role`/`aria-*` em todo elemento interativo e estrutural (landmarks, `heading` com `aria-level`, listas, formulários com rótulo e erro associados). Alvos de toque ≥ 24×24 px. Nativo: VoiceOver e Dynamic Type funcionando |
| Cards | GitHub Issues (labels + Projects) **e** spec em `docs/front/cards/NNN-slug.md` |
| Design | Só o `designer` decide estilo; os demais seguem `docs/front/design-system.md` |

## Git
- Branch de integração: **`front`**. Uma branch `feat/*` por card, criada a partir de `front`. O card da base usa **`feat/app-base`**.
- PR para `front`; merge (squash) quando todos os portões passam. **Nunca tocar na `main`**: o Pedro leva `front` → `main`.
- Commits em português: `feat:`, `fix:`, `docs:`, `test:`, `chore:`.
- **Push de toda branch em andamento pelo menos uma vez por dia**, mesmo incompleta. `git pull` antes de começar.
- Nunca commitar `.env` nem segredos.
- **Nunca editar `backend/` nem `database/`.** Rota faltando ou divergência: construir contra proposta de contrato, testar com MSW e avisar o orquestrador.

## Comandos do app
> Preencher quando o card `feat/app-base` for mergeado.

```bash
cd app
npm install
npx expo start          # Expo Go (iPhone) e web
npx expo start --web    # navegador
```

## Links
- Contrato da API (fonte da verdade): `../docs/api.md`
- Estado do trabalho: `../docs/front/STATUS.md`
- Decisões: `../docs/front/decisoes.md`
- ADRs: `../docs/front/adr/`
- Cards: `../docs/front/cards/`
- PRD / MVP: `../docs/front/prd.md`, `../docs/front/mvp.md` (após o grill)
- Design system: `../docs/front/design-system.md` (após a Fase 3)
- API em produção: https://backhaul-api.onrender.com (cold start de ~50 s no plano grátis)
