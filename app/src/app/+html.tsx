import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Raiz do HTML estático (só web, roda em Node no build): sem window/document aqui.
export default function Raiz({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        {/* <title> e meta description entram pelo <Head> do _layout (SDK 57): um <title> aqui duplicaria a tag. */}
        {/* PWA (ADR 0014). theme-color: bg.inverse do design system (claro e escuro). */}
        <meta name="theme-color" content="#14181D" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0A0D10" media="(prefers-color-scheme: dark)" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icones/apple-touch-icon-180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Backhaul" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
