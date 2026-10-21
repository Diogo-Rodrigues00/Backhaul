// Servidor estático mínimo do `dist/` (saída de `expo export -p web`) para os testes E2E.
// Rota sem arquivo vira `<rota>.html`; o que não existe cai em `+not-found.html` com status 404.
// Uso: node scripts/servir-dist.mjs [porta]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const porta = Number(process.argv[2] ?? process.env.PORT ?? 4173);

const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function arquivoDe(caminho) {
  const limpo = normalize(decodeURIComponent(caminho)).replace(/^([/\\])+/, '');
  const candidatos = [limpo, `${limpo}.html`, join(limpo, 'index.html')];
  for (const c of candidatos) {
    const completo = join(dist, c);
    if (completo.startsWith(dist) && existsSync(completo) && statSync(completo).isFile()) {
      return completo;
    }
  }
  return null;
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  const arquivo = pathname === '/' ? join(dist, 'index.html') : arquivoDe(pathname);
  const alvo = arquivo ?? join(dist, '+not-found.html');
  res.writeHead(arquivo ? 200 : 404, {
    'Content-Type': tipos[extname(alvo)] ?? 'application/octet-stream',
  });
  createReadStream(alvo).pipe(res);
}).listen(porta, () => console.log(`dist em http://localhost:${porta}`));
