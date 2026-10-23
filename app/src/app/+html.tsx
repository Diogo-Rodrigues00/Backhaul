import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import { CSS_SESSAO_INICIAL, SCRIPT_SESSAO_INICIAL } from '@/lib/sessaoNaInicial';
import { gerarCssGlobal } from '@/theme/css';
import { colors } from '@/theme/tokens';

// Gerado uma vez no build: variáveis dos dois temas, @font-face, pontos de quebra (ADR 0008).
const cssGlobal = gerarCssGlobal();

// Roda antes da primeira pintura: aplica o tema salvo em <html data-theme> (sem valor = sistema).
// Mantém a chave igual à de CHAVES.tema em src/lib/armazenamentoComum.ts.
const scriptDoTema =
  "try{var t=localStorage.getItem('backhaul.tema');" +
  "if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}";

const FONTES_PRELOAD = ['/fontes/barlow-latin-500.woff2', '/fontes/barlow-latin-700.woff2'];

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
        <meta
          name="theme-color"
          content={colors.light.bg.inverse}
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content={colors.dark.bg.inverse}
          media="(prefers-color-scheme: dark)"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/icones/apple-touch-icon-180.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Backhaul" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script dangerouslySetInnerHTML={{ __html: scriptDoTema }} />
        {/* Só em `/` e só com token: esconde a apresentação até a sessão ser conferida (sem piscar). */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_SESSAO_INICIAL }} />
        {FONTES_PRELOAD.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
        <ScrollViewStyleReset />
        {/* Depois do ScrollViewStyleReset: o body volta a rolar (telas altas, zoom 200%). */}
        <style id="tema-global" dangerouslySetInnerHTML={{ __html: cssGlobal }} />
        <style id="sessao-inicial" dangerouslySetInnerHTML={{ __html: CSS_SESSAO_INICIAL }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
