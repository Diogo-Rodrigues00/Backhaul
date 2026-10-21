// URLs do Lighthouse CI geradas de e2e/rotas.ts (lista única de rotas, ADR 0012).
// Lê o arquivo como texto para não depender de TypeScript dentro do LHCI.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const BASE = process.env.LHCI_BASE_URL ?? 'http://localhost:4173';

const fonte = readFileSync(join(__dirname, '..', 'e2e', 'rotas.ts'), 'utf8');
const caminhos = [...fonte.matchAll(/caminho:\s*'([^']+)'/g)].map((m) => m[1]);

if (caminhos.length === 0) {
  throw new Error('Nenhuma rota encontrada em e2e/rotas.ts');
}

module.exports = { base: BASE, urls: caminhos.map((c) => `${BASE}${c}`) };
