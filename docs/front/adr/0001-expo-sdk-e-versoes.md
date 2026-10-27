# ADR 0001 — Expo SDK 57 e versões das bibliotecas

- **Data:** 2026-10-20 · **Status:** proposto (aguarda aprovação do Pedro) · **Autor:** tech-lead

## Contexto
- Decisão fechada: iPhone via **Expo Go da App Store** + navegador via react-native-web.
- O Expo SDK 58 saiu estável em 15/10/2026 (React Native 0.88), mas o changelog oficial diz que o Expo Go das lojas só passa para o SDK 58 "dentro de algumas semanas". Até lá, o `create-expo-app` cria projetos SDK 57, e o Expo Go da App Store roda **só SDK 57**. Quando a loja atualizar, o Expo Go novo roda **só SDK 58**.
- Desde 03/09/2026 o Expo Go no iPhone físico exige login na **mesma conta Expo** no CLI (`npx expo login`) e no app.
- Node exigido: 22.13+ na linha 22 (o Pedro tem 22.18).

Fontes: [Expo SDK 58](https://expo.dev/changelog/sdk-58), [SDK 58 beta](https://expo.dev/changelog/sdk-58-beta), [login no Expo Go](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/). Versões conferidas com `npm view` e com o `bundledNativeModules.json` do `expo@57.0.30` em 2026-10-20.

## Decisão
**Expo SDK 57.** Instalar sempre com `npx expo install <pacote>` (ele escolhe a versão compatível). Versões de referência:

| Pacote | Versão | Observação |
|---|---|---|
| `expo` | ~57.0.30 | |
| `react` / `react-dom` | 19.2.3 | |
| `react-native` | 0.86.3 | |
| `react-native-web` | ~0.21.0 | |
| `expo-router` | ~57.0.28 | ADR 0002 |
| `@expo/metro-runtime` | ~57.0.17 | |
| `expo-linking` / `expo-constants` / `expo-status-bar` / `expo-system-ui` | ~57.0.13 / ~57.0.22 / ~57.0.1 / ~57.0.4 | exigidos pelo router |
| `react-native-screens` / `react-native-safe-area-context` | ~4.26.0 / ~5.7.0 | exigidos pelo router |
| `expo-secure-store` | ~57.0.4 | token no iPhone (ADR 0006) |
| `expo-location` | ~57.0.21 | GPS do motorista (MVP-07) |
| `react-native-svg` | 15.15.4 | ícones (ADR 0011) |
| `expo-font` | ~57.0.4 | carregar Barlow no iPhone (ADR 0008) |
| `@expo-google-fonts/barlow` | ^0.4.1 | só em `src/theme/fontes.native.ts` |
| `@fontsource/barlow` (dev) | 5.3.0 | origem dos `woff2` latinos 500/700 copiados para `public/fontes/` |
| `@react-native-picker/picker` | 2.11.4 | `Select` nativo do DS (certificação); na web vira `<select>` |
| `@tanstack/react-query` | ^5.104.5 | ADR 0004 |
| `react-hook-form` | ^7.90.0 | ADR 0007 |
| `typescript` / `@types/react` | ~6.0.3 / ~19.2.2 | do template SDK 57 |
| `jest-expo` / `jest` / `@types/jest` | ~57.0.6 / ^29.7.0 / ^29.5 | Jest 30 só no SDK 58 |
| `@testing-library/react-native` + `test-renderer` | ^14.1.0 + ^1.3.1 | ADR 0012 |
| `msw` | ^2.15.0 | **não** a 3.x (lançada em 28/09, 3 semanas; ecossistema e exemplos em 2.x) |
| `@mswjs/http-middleware` | ^0.10.3 | servidor de mocks para Playwright e Lighthouse CI |
| `@playwright/test` / `@axe-core/playwright` | ^1.64.1 / ^4.14.0 | |
| `@lhci/cli` | 0.15.1 | roda Lighthouse 12.6.1 (4 categorias, sem PWA) |
| `serve` | ^14.2.6 | servir `dist/` no CI |
| `eslint-config-expo` / `prettier` | ~57.0.2 / ^3.9 | via `npx expo lint` |

**Proibidos** (peso no bundle web ou redundância): `react-native-reanimated`, `react-native-gesture-handler`, `@expo/vector-icons`, kits de UI (Paper, Tamagui, NativeBase, gluestack), `axios`, `moment`/`date-fns`/`dayjs`, `zod`/`yup`, `redux`/`zustand`/`jotai`, `lodash`, `react-native-maps` na web. Exceção só por novo ADR.

## Alternativas
- **SDK 58:** mais novo, com divisão de bundle por rota padrão na web. Rejeitado: **não abre no Expo Go da App Store hoje**; exigiria `eas go` + conta Apple paga.
- **SDK 56 ou anterior:** sem ganho e já fora da loja.

## Consequências
- Risco: a App Store pode trocar o Expo Go para SDK 58 antes de 29/10 ou 12/11 e o app para de abrir no iPhone. Mitigações: (1) Pedro instala o Expo Go **agora** e desativa a atualização automática de apps até 12/11 (decisão do Pedro); (2) a prova no iPhone também roda pelo PWA instalado; (3) migrar para SDK 58 é viável (`npx expo install expo@^58 --fix`, `web.output: "static"` explícito, metadados por `generateMetadata`, Jest 30), mas custa ~meio dia e só entra se a loja mudar.
- Cada membro precisa de conta Expo para abrir no iPhone.
