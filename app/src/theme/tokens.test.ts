import fs from 'node:fs';
import path from 'node:path';

import { colors } from './tokens';
import { achatar, coresWeb } from './variaveis';

const raizApp = path.resolve(__dirname, '../..');
const regraHex = /#[0-9a-fA-F]{3,8}\b/g;

function arquivosDeCodigo(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = path.join(dir, e.name);
    if (e.isDirectory()) return arquivosDeCodigo(caminho);
    return /\.(ts|tsx)$/.test(e.name) ? [caminho] : [];
  });
}

describe('tokens', () => {
  it('têm os mesmos valores do bloco da seção 3.5 do design-system.md', () => {
    const md = fs.readFileSync(path.join(raizApp, '../docs/front/design-system.md'), 'utf8');
    const bloco = md.slice(md.indexOf('// tokens.ts: gerado'), md.indexOf('export type Urgency'));
    const doDs = (bloco.match(regraHex) ?? []).map((h) => h.toUpperCase()).sort();
    const doCodigo = (
      fs.readFileSync(path.join(raizApp, 'src/theme/tokens.ts'), 'utf8').match(regraHex) ?? []
    )
      .map((h) => h.toUpperCase())
      .sort();
    expect(doCodigo).toEqual(doDs);
    expect(doCodigo.length).toBeGreaterThan(80);
  });

  it('dois temas têm exatamente os mesmos papéis', () => {
    const claro = achatar(colors.light).map(([nome]) => nome);
    const escuro = achatar(colors.dark).map(([nome]) => nome);
    expect(escuro).toEqual(claro);
  });

  it('coresWeb tem a forma de colors.light, com var(--papel) em cada folha', () => {
    expect(coresWeb.bg.page).toBe('var(--bg-page)');
    expect(coresWeb.text.onInverse).toBe('var(--text-on-inverse)');
    expect(coresWeb.urgency.critico.bg).toBe('var(--urgency-critico-bg)');
  });

  it('nenhuma cor literal fora de src/theme/tokens.ts', () => {
    const permitidos = new Set([path.join(raizApp, 'src/theme/tokens.ts')]);
    const infratores = arquivosDeCodigo(path.join(raizApp, 'src'))
      .filter((arq) => !permitidos.has(arq) && !/\.test\.tsx?$/.test(arq))
      .filter((arq) => {
        const texto = fs.readFileSync(arq, 'utf8');
        return /#[0-9a-fA-F]{3,8}\b/.test(texto) || /rgba?\(\s*\d/.test(texto);
      })
      .map((arq) => path.relative(raizApp, arq));
    expect(infratores).toEqual([]);
  });
});
