// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// ADR 0001: bibliotecas proibidas (peso no bundle web ou redundância).
// Exceção só por novo ADR.
const proibidas = [
  'react-native-reanimated',
  'react-native-gesture-handler',
  '@expo/vector-icons',
  'lucide-react-native',
  'react-native-paper',
  'tamagui',
  '@tamagui/*',
  'native-base',
  '@gluestack-ui/*',
  'axios',
  'moment',
  'moment-timezone',
  'date-fns',
  'dayjs',
  'zod',
  'yup',
  'redux',
  'react-redux',
  '@reduxjs/toolkit',
  'zustand',
  'jotai',
  'lodash',
  'lodash-es',
  'lodash/*',
].map((name) => ({
  name,
  message: 'Biblioteca proibida pelo ADR 0001. Exceção só por novo ADR.',
}));

// ADR 0004, adendo: o TanStack Query só entra no JS das áreas logadas, num chunk sob demanda. Os hooks
// importam de `src/api/tanstack.ts`; só os arquivos listados abaixo importam o pacote (valor).
const tanstack = {
  name: '@tanstack/react-query',
  message:
    'Importe de @/api/tanstack (ponte): o pacote só carrega em state/consultas/consultas.tsx (ADR 0004, adendo).',
  allowTypeImports: true,
};
const podemImportarTanstack = [
  'src/state/consultas/consultas.tsx',
  'src/api/consulta.ts',
  'src/api/foco.native.ts',
  '**/*.test.{ts,tsx}',
  'src/test-utils/**',
  'mocks/**',
  'jest.setup.ts',
];

// ADR 0003: componentes recebem dados por props; só as telas usam src/api.
const patternsDeComponentes = [
  {
    group: ['@/api', '@/api/*'],
    message: 'Componentes não importam src/api (ADR 0003): os dados chegam por props.',
  },
];

module.exports = defineConfig([
  expoConfig,
  globalIgnores([
    'dist/*',
    '.expo/*',
    'coverage/*',
    'node_modules/*',
    'playwright-report/*',
    '.lighthouseci/*',
    'test-results/*',
  ]),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': ['error', { paths: [...proibidas, tanstack] }],
    },
  },
  {
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [...proibidas, tanstack], patterns: patternsDeComponentes },
      ],
    },
  },
  {
    files: podemImportarTanstack,
    rules: { 'no-restricted-imports': ['error', { paths: proibidas }] },
  },
  {
    // Os testes de componentes podem importar o TanStack, mas continuam sem src/api (ADR 0003).
    files: ['src/components/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: proibidas, patterns: patternsDeComponentes }],
    },
  },
]);
