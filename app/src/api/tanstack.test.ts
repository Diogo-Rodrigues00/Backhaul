// Ponte do TanStack Query (ADR 0004, adendo): sem o pacote carregado os hooks avisam com clareza;
// com ele, repassam a chamada.
describe('ponte tanstack', () => {
  it('avisa quando o TanStack ainda não foi carregado', () => {
    jest.isolateModules(() => {
      const ponte = jest.requireActual<typeof import('./tanstack')>('./tanstack');
      expect(() => ponte.useQueryClient()).toThrow(/ainda não foi carregado/);
      expect(() => ponte.useQuery({ queryKey: ['x'], queryFn: () => 1 })).toThrow(
        /ainda não foi carregado/,
      );
      expect(() => ponte.useMutation({ mutationFn: () => Promise.resolve() })).toThrow(
        /ainda não foi carregado/,
      );
    });
  });

  it('repassa a chamada ao que foi registrado com definirTanstack', () => {
    jest.isolateModules(() => {
      const ponte = jest.requireActual<typeof import('./tanstack')>('./tanstack');
      const useQueryClient = jest.fn(() => 'cliente');
      ponte.definirTanstack({
        useQueryClient,
        useQuery: jest.fn(),
        useMutation: jest.fn(),
      } as unknown as Parameters<typeof ponte.definirTanstack>[0]);

      expect(ponte.useQueryClient()).toBe('cliente');
      expect(useQueryClient).toHaveBeenCalledTimes(1);
    });
  });
});
