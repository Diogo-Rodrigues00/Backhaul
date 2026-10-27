// Verificações de regra de negócio e de segredos (ADR 0013). Roda em app/.
// Lê os arquivos que o Git conhece (versionados + novos não ignorados), então
// pega o problema antes mesmo do commit.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appDir = process.cwd();

function git(...args) {
  return execFileSync('git', args, { cwd: appDir, encoding: 'utf8' }).split('\n').filter(Boolean);
}

const raizRepo = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: appDir,
  encoding: 'utf8',
}).trim();

// Caminhos relativos a app/, com barras normais.
const visiveis = git('ls-files', '--cached', '--others', '--exclude-standard', '--', '.');

const ehTexto = (caminho) => !/\.(png|jpe?g|gif|webp|ico|woff2?|ttf|otf|zip|lock)$/i.test(caminho);
const ler = (caminho) => readFileSync(resolve(appDir, caminho), 'utf8');

const falhas = [];
const falhar = (regra, caminho, linha, trecho) => {
  falhas.push(
    `${regra}: ${caminho}${linha ? `:${linha}` : ''}${trecho ? `  ${trecho.trim()}` : ''}`,
  );
};

function procurar(regra, arquivos, padrao) {
  for (const caminho of arquivos) {
    ler(caminho)
      .split('\n')
      .forEach((texto, i) => {
        if (padrao.test(texto)) falhar(regra, caminho, i + 1, texto);
      });
  }
}

// Este arquivo cita os termos proibidos de propósito: monta as strings por partes.
const hostApiProducao = new RegExp(`onrender${'\\.'}com`, 'i');

// 1. URL da API de produção só no .env.example (a URL vem de EXPO_PUBLIC_API_URL).
procurar(
  'URL da API de produção no código (use EXPO_PUBLIC_API_URL)',
  visiveis.filter(
    (c) => ehTexto(c) && c !== '.env.example' && c !== 'scripts/verificar-proibidos.mjs',
  ),
  hostApiProducao,
);

// 2. .env real versionado (em qualquer lugar do repositório).
const todosVersionados = execFileSync('git', ['ls-files'], {
  cwd: raizRepo,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);
for (const caminho of todosVersionados) {
  const nome = caminho.split('/').pop() ?? '';
  if (/^\.env(\..+)?$/.test(nome) && nome !== '.env.example') {
    falhar('.env versionado', caminho);
  }
}

// 3. Comissão fixa em src/ (a comissão vem da API: percentual_comissao / valor_comissao).
const comissaoFixa = [
  /\b0\.05\b/,
  /\b5\s*%/,
  /\*\s*5\s*\/\s*100\b/,
  /percentual_comissao\s*=(?!=)/,
];
// Testes ficam de fora: eles usam valores literais (ex.: formatarPercentual(5) -> '5%') de propósito.
const ehTeste = (c) => /\.(test|spec)\.[jt]sx?$/.test(c) || c.includes('/__tests__/');
const src = visiveis.filter((c) => c.startsWith('src/') && ehTexto(c) && !ehTeste(c));
for (const padrao of comissaoFixa) {
  procurar('Comissão fixa no código (exiba o que a API devolve)', src, padrao);
}

// 4. E-mails de conta de demo (lista em DEMO_EMAILS, vinda de secret; nunca do código).
const demo = (process.env.DEMO_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
if (demo.length === 0) {
  console.log('aviso: DEMO_EMAILS vazio; verificação de e-mails de demo pulada.');
} else {
  for (const caminho of visiveis.filter(ehTexto)) {
    const texto = ler(caminho).toLowerCase();
    for (const email of demo) {
      if (texto.includes(email)) falhar('E-mail de conta de demo no código', caminho);
    }
  }
}

if (falhas.length > 0) {
  console.error('verificar:proibidos reprovou:\n' + falhas.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log('verificar:proibidos: nada proibido encontrado.');
