// Substituto do expo-router para os testes de tela que não precisam de rota de verdade:
// uso com `jest.mock('expo-router', () => require('@/test-utils/roteadorFalso'))`. A navegação vira
// um registro (`roteador.replace`). O `renderRouter` real liga timers falsos e guarda a rota entre
// testes, o que deixava o teste seguinte com a tela vazia (ver cadastro-motorista.test.tsx).
import type { ReactNode } from 'react';

export const roteador = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
};

export function useRouter() {
  return roteador;
}

export function usePathname(): string {
  return '/';
}

/** Só o conteúdo: o teste não navega de verdade, então o link vira o próprio filho. */
export function Link({ children }: { children?: ReactNode }): ReactNode {
  return children ?? null;
}
