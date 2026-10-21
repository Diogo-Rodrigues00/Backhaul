// O projeto não instala @types/react-dom (não usa react-dom direto). Só os testes usam
// `renderToStaticMarkup` para conferir o HTML que o react-native-web gera.
declare module 'react-dom/server' {
  import type { ReactElement } from 'react';

  export function renderToStaticMarkup(elemento: ReactElement): string;
}
