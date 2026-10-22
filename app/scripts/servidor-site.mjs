// Servidor estático do site exportado (dist/) para E2E e Lighthouse CI. Só CI, nunca produção.
// Imita a Vercel (`cleanUrls`, sem barra final) e acrescenta uma regra para o Lighthouse:
//  - /x serve x.html; /x serve x/index.html (rota de pasta com index.tsx: /admin, /empresa/cargas);
//  - caminho sem extensão que não existe devolve a página do app (+not-found.html) com status 200,
//    porque o Lighthouse aborta a auditoria de documento com status >= 400;
//  - arquivo que não existe (robots.txt, .js...) continua 404 de verdade.
// Por que não o `serve` puro com `rewrites`: o serve-handler aplica a reescrita ANTES de procurar o
// arquivo da rota, então toda rota sem extensão (menos "/") devolvia o HTML da página 404 e o app
// hidratava em cima do HTML errado (erro #418 de hidratação).
import { statSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { extname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const servir = require('serve-handler'); // vem junto do `serve` (dependência de desenvolvimento)

const porta = Number(process.env.SITE_PORT ?? 4173);
const raiz = resolve('dist');

const ehArquivo = (caminho) => {
  try {
    return statSync(caminho).isFile();
  } catch {
    return false;
  }
};

createServer((req, res) => {
  let caminho = '/';
  try {
    caminho = decodeURIComponent(new URL(req.url ?? '/', 'http://site').pathname);
  } catch {
    // Caminho inválido: o serve-handler responde 400.
  }
  const config = { public: raiz, cleanUrls: true, trailingSlash: false, directoryListing: false };
  if (caminho !== '/' && extname(caminho) === '') {
    const semBarra = caminho.replace(/\/+$/, '');
    if (!ehArquivo(join(raiz, `${semBarra}.html`))) {
      const destino = ehArquivo(join(raiz, semBarra, 'index.html'))
        ? `${semBarra}/index.html`
        : '/+not-found.html';
      config.rewrites = [{ source: caminho, destination: destino }];
    }
  }
  servir(req, res, config);
}).listen(porta, () => console.log(`site de dist/ em http://localhost:${porta}`));
