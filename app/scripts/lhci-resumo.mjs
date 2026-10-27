// Resume as notas do Lighthouse CI (execução representativa = mediana de cada URL).
// Uso: node scripts/lhci-resumo.mjs mobile desktop
// Imprime no log e, no GitHub Actions, no resumo do job. É o registro da nota de
// Performance mobile, que não reprova o PR (adendo do ADR 0011).
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const categorias = [
  ['performance', 'Performance'],
  ['accessibility', 'Acessibilidade'],
  ['best-practices', 'Boas práticas'],
  ['seo', 'SEO'],
];

const linhas = ['## Lighthouse CI (mediana de 3 execuções)', ''];
for (const alvo of process.argv.slice(2)) {
  const manifesto = join('.lighthouseci', alvo, 'manifest.json');
  if (!existsSync(manifesto)) continue;
  const execucoes = JSON.parse(readFileSync(manifesto, 'utf8')).filter(
    (e) => e.isRepresentativeRun,
  );

  linhas.push(`### ${alvo}`, '', `| Rota | ${categorias.map(([, nome]) => nome).join(' | ')} |`);
  linhas.push(`|---|${categorias.map(() => '---').join('|')}|`);
  for (const { url, summary } of execucoes) {
    const notas = categorias.map(([chave]) => Math.round((summary[chave] ?? 0) * 100));
    linhas.push(`| ${new URL(url).pathname} | ${notas.join(' | ')} |`);
  }
  linhas.push('');
}

const texto = linhas.join('\n');
console.log(texto);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${texto}\n`);
