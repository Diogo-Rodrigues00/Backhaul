/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/dist/'],
  collectCoverageFrom: ['src/lib/**/*.{ts,tsx}', 'src/api/**/*.{ts,tsx}'],
  // ADR 0012: 80% de linhas. `src/api/` entra aqui quando o card 004 criar código nela
  // (com a pasta vazia o Jest reprova por falta de dados de cobertura).
  coverageThreshold: {
    './src/lib/': { lines: 80 },
  },
};
