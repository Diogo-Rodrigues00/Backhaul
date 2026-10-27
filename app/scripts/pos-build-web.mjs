// Ajustes do `dist/` para a Vercel, depois do `expo export -p web` (ADR 0014).
//  1. A Vercel serve `404.html` (status 404) para rota inexistente; o Expo gera `+not-found.html`.
//  2. `/_sitemap` é uma página de depuração do Expo Router: não vai para produção.
//  3. `.gitkeep` das pastas vazias de `public/` não deve virar URL.
import { copyFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve(import.meta.dirname, '../dist');
const naoEncontrada = resolve(dist, '+not-found.html');
if (!existsSync(naoEncontrada)) {
  console.error(
    'dist/+not-found.html não existe: o export falhou ou a rota +not-found foi removida.',
  );
  process.exit(1);
}
copyFileSync(naoEncontrada, resolve(dist, '404.html'));
for (const sobra of ['_sitemap.html', '.gitkeep']) rmSync(resolve(dist, sobra), { force: true });
console.log('dist ajustado: 404.html criado; _sitemap e .gitkeep removidos');
