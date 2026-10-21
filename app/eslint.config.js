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

module.exports = defineConfig([
  expoConfig,
  globalIgnores(['dist/*', '.expo/*', 'coverage/*', 'node_modules/*']),
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': ['error', { paths: proibidas }],
    },
  },
  {
    // ADR 0003: componentes recebem dados por props; só as telas usam src/api.
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: proibidas,
          patterns: [
            {
              group: ['@/api', '@/api/*'],
              message: 'Componentes não importam src/api (ADR 0003): os dados chegam por props.',
            },
          ],
        },
      ],
    },
  },
]);
