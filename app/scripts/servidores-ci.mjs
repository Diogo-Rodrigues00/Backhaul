// Sobe, para E2E (Playwright) e Lighthouse CI, os dois servidores do ADR 0013:
//   - mock da API em http://localhost:4010 (mocks/servidor-http.ts)
//   - site estático de dist/ em http://localhost:4173 (serve, com cleanUrls)
// Imprime `pronto` quando os dois respondem; encerra os dois quando for terminado.
//
// Por que não um `serve dist` puro: o serve responde 404 para rota inexistente e o
// Lighthouse aborta a auditoria de documento com status >= 400. Aqui (e só aqui,
// nunca na Vercel) o serve usa scripts/serve-ci.json, que devolve a página do app
// (+not-found.html) com status 200 para caminhos sem extensão que não existem em dist/.
// Arquivos inexistentes (robots.txt, .js...) continuam 404 de verdade.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { request } from 'node:http';
import { join, resolve } from 'node:path';

const PORTA_MOCK = 4010;
const PORTA_SITE = 4173;

if (!existsSync('dist')) {
  console.error('dist/ não existe. Rode `npm run export:ci` antes.');
  process.exit(1);
}

const filhos = [
  spawn(
    process.execPath,
    ['--experimental-strip-types', '--no-warnings', 'mocks/servidor-http.ts'],
    { stdio: 'inherit', env: { ...process.env, MOCK_PORT: String(PORTA_MOCK) } },
  ),
  spawn(
    process.execPath,
    [
      join('node_modules', 'serve', 'build', 'main.js'),
      'dist',
      '-l',
      String(PORTA_SITE),
      '--no-clipboard',
      '--config',
      resolve('scripts', 'serve-ci.json'),
    ],
    { stdio: 'inherit' },
  ),
];

let encerrando = false;
function encerrar(codigo) {
  if (encerrando) return;
  encerrando = true;
  for (const filho of filhos) filho.kill();
  process.exit(codigo);
}
for (const filho of filhos) filho.on('exit', (codigo) => encerrar(codigo ?? 1));
for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, () => encerrar(0));

function responde(porta, caminho) {
  return new Promise((resolvido) => {
    const req = request({ host: '127.0.0.1', port: porta, path: caminho, timeout: 1000 }, (res) => {
      res.resume();
      resolvido(res.statusCode !== undefined && res.statusCode < 500);
    });
    req.on('error', () => resolvido(false));
    req.on('timeout', () => req.destroy());
    req.end();
  });
}

const limite = Date.now() + 60_000;
let pronto = false;
while (!pronto && Date.now() < limite) {
  pronto = (await responde(PORTA_MOCK, '/saude')) && (await responde(PORTA_SITE, '/'));
  if (!pronto) await new Promise((r) => setTimeout(r, 250));
}
if (pronto) {
  console.log('pronto');
} else {
  console.error('Servidores não ficaram prontos em 60 s.');
  encerrar(1);
}
