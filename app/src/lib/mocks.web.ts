import { useEffect, useState } from 'react';

/**
 * `false` até o worker do MSW iniciar (só no modo mock, preview da Vercel). Assim nenhuma tela
 * dispara requisição antes da interceptação. Fora do modo mock é `true` desde a primeira
 * renderização, então o HTML estático e a hidratação não mudam.
 *
 * Os `process.env.EXPO_PUBLIC_API_MOCK === 'msw'` ficam escritos por extenso, sem variável
 * intermediária: é assim que o build de produção (variável vazia) apaga o ramo e o `import()`
 * do MSW não vira chunk (ADR 0011).
 */
export function useMocksProntos(): boolean {
  const [pronto, setPronto] = useState(process.env.EXPO_PUBLIC_API_MOCK !== 'msw');

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_API_MOCK === 'msw') {
      let ativo = true;
      import('../../mocks/browser')
        .then((m) => m.iniciarMocks())
        .catch((erro: unknown) => console.error('[mocks] MSW não iniciou', erro))
        .finally(() => {
          if (ativo) setPronto(true);
        });
      return () => {
        ativo = false;
      };
    }
  }, []);

  return pronto;
}
