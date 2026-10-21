const env = process.env as Record<string, string | undefined>;
const original = { NODE_ENV: env.NODE_ENV, MOCK: env.EXPO_PUBLIC_API_MOCK };

type GlobalComNavegador = { window?: unknown; navigator?: unknown; document?: unknown };
const g = globalThis as unknown as GlobalComNavegador;
const originalGlobais = { window: g.window, navigator: g.navigator, document: g.document };

function carregarRegistro() {
  let registrar: () => void = () => undefined;
  jest.isolateModules(() => {
    registrar = require('../pwa.web').registrarServiceWorker; // eslint-disable-line @typescript-eslint/no-require-imports
  });
  return registrar;
}

describe('registrarServiceWorker (web)', () => {
  const register = jest.fn(() => Promise.resolve({}));

  beforeEach(() => {
    register.mockClear();
    g.window = { addEventListener: jest.fn() };
    g.navigator = { serviceWorker: { register } };
    g.document = { readyState: 'complete' };
    env.NODE_ENV = 'production';
    delete env.EXPO_PUBLIC_API_MOCK;
  });

  afterEach(() => {
    env.NODE_ENV = original.NODE_ENV;
    if (original.MOCK === undefined) delete env.EXPO_PUBLIC_API_MOCK;
    else env.EXPO_PUBLIC_API_MOCK = original.MOCK;
    g.window = originalGlobais.window;
    g.navigator = originalGlobais.navigator;
    g.document = originalGlobais.document;
  });

  it('registra /sw.js em produção sem mock', () => {
    carregarRegistro()();
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('espera o evento load quando a página ainda carrega', () => {
    g.document = { readyState: 'loading' };
    carregarRegistro()();
    expect(register).not.toHaveBeenCalled();
    const { addEventListener } = g.window as { addEventListener: jest.Mock };
    expect(addEventListener).toHaveBeenCalledWith('load', expect.any(Function), { once: true });
  });

  it('não registra com EXPO_PUBLIC_API_MOCK=msw', () => {
    env.EXPO_PUBLIC_API_MOCK = 'msw';
    carregarRegistro()();
    expect(register).not.toHaveBeenCalled();
  });

  it('não registra fora de produção', () => {
    env.NODE_ENV = 'development';
    carregarRegistro()();
    expect(register).not.toHaveBeenCalled();
  });

  it('não quebra sem suporte a service worker', () => {
    g.navigator = {};
    expect(() => carregarRegistro()()).not.toThrow();
  });
});
