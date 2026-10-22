import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const pasta = join(process.cwd(), 'dist', '_expo', 'static', 'js', 'web');
for (const nome of readdirSync(pasta)) {
  if (!nome.startsWith('__common')) continue;
  const texto = readFileSync(join(pasta, nome), 'utf8');
  for (const m of texto.split(/\n(?=__d\()/)) {
    const cabeca = m.slice(60, 300).replace(/\d+/g, 'N').replace(/\s+/g, ' ');
    console.log(`DIAGMOD ${m.length} ${cabeca}`);
  }
}
