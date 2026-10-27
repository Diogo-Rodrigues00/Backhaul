// O projeto não instala @types/react-dom (não usa react-dom direto). Só os testes usam
// `renderToStaticMarkup` (HTML do react-native-web) e `createRoot` (testes em jsdom).
declare module 'react-dom/server' {
  import type { ReactElement } from 'react';

  export function renderToStaticMarkup(elemento: ReactElement): string;
}

declare module 'react-dom/client' {
  import type { ReactNode } from 'react';

  export function createRoot(contêiner: Element): {
    render(filhos: ReactNode): void;
    unmount(): void;
  };
}
