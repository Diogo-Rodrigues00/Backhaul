const preset = require('jest-expo/jest-preset');

// Pacotes do MSW publicados só como ESM (ex.: rettime): precisam passar pelo Babel do Jest.
const esmDoMsw = ['msw', 'rettime', 'until-async', '@mswjs', '@open-draft', 'strict-event-emitter'];
const [padraoNodeModules, ...demaisPadroes] = preset.transformIgnorePatterns;

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // O ambiente react-native do Jest não tem a condição "node" e o msw marca
    // "react-native": null em msw/node; apontamos direto para a versão CommonJS.
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
  },
  // O transformador do preset só pega .js/.ts; os pacotes ESM do MSW usam .mjs.
  transform: { '\\.mjs$': preset.transform['\\.[jt]sx?$'] },
  transformIgnorePatterns: [
    padraoNodeModules.replace('(?!(', `(?!(${esmDoMsw.join('|')}|`),
    ...demaisPadroes,
  ],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/dist/'],
  collectCoverageFrom: ['src/lib/**/*.{ts,tsx}', 'src/api/**/*.{ts,tsx}', '!**/__tests__/**'],
};
