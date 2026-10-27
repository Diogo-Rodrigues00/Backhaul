// Roda localmente todos os portões, na ordem do CI (ADR 0013): `npm run verificar`.
// Para na primeira falha. O export usa o mock da API (mesma URL do job `web`).
import { spawnSync } from 'node:child_process';

const passos = [
  ['lint', ['run', 'lint']],
  ['typecheck', ['run', 'typecheck']],
  ['format', ['run', 'format:check']],
  ['testes', ['test', '--', '--ci', '--coverage']],
  ['proibidos', ['run', 'verificar:proibidos']],
  [
    'export',
    ['run', 'export:ci', '--', '--clear'],
    { EXPO_PUBLIC_API_URL: 'http://localhost:4010' },
  ],
  ['orçamento', ['run', 'orcamento']],
  ['e2e + axe', ['run', 'e2e']],
  ['lighthouse mobile', ['run', 'lhci:mobile']],
  ['lighthouse desktop', ['run', 'lhci:desktop']],
];

for (const [nome, args, env] of passos) {
  console.log(`\n=== ${nome} ===`);
  const resultado = spawnSync('npm', args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  });
  if (resultado.status !== 0) {
    console.error(`\nPortão "${nome}" falhou.`);
    process.exit(resultado.status ?? 1);
  }
}
console.log('\nTodos os portões passaram.');
