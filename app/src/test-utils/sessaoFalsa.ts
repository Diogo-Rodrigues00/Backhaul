// Substituto de `useSessao` para os testes de tela de formulário: uso com
// `jest.mock('@/state/sessao/useSessao', () => require('@/test-utils/sessaoFalsa'))`.
// `entrar` é um jest.fn; o SessaoProvider real é coberto por src/app/__tests__/sessao.test.tsx.
import type { ValorSessao } from '@/state/sessao/SessaoContext';

export const sessaoFalsa: ValorSessao = {
  estado: 'anonimo',
  usuario: null,
  aviso: null,
  entrar: jest.fn(async () => undefined),
  sair: jest.fn(async () => undefined),
};

export function useSessao(): ValorSessao {
  return sessaoFalsa;
}
