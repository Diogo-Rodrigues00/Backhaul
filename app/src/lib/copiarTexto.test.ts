// `copiarTexto` na web (Platform simulada) e no iPhone (sem `expo-clipboard`: não copia).
describe('copiarTexto', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('react-native');
    delete (globalThis as { navigator?: unknown }).navigator;
    delete (globalThis as { document?: unknown }).document;
  });

  function carregar(os: 'web' | 'ios') {
    jest.resetModules();
    jest.doMock('react-native', () => ({ Platform: { OS: os } }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- precisa recarregar o módulo com outro Platform
    return require('./copiarTexto') as typeof import('./copiarTexto');
  }

  it('iPhone: não há botão e a cópia por código devolve false', async () => {
    const { COPIA_POR_CODIGO, copiarTexto } = carregar('ios');
    expect(COPIA_POR_CODIGO).toBe(false);
    await expect(copiarTexto('x')).resolves.toBe(false);
  });

  it('web: usa navigator.clipboard.writeText', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      configurable: true,
    });
    const { COPIA_POR_CODIGO, copiarTexto } = carregar('web');
    expect(COPIA_POR_CODIGO).toBe(true);
    await expect(copiarTexto('codigo')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('codigo');
  });

  it('web: permissão negada cai no campo temporário e devolve o foco', async () => {
    const writeText = jest.fn().mockRejectedValue(new Error('negado'));
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      configurable: true,
    });
    const campo = {
      value: '',
      style: {} as Record<string, string>,
      setAttribute: jest.fn(),
      select: jest.fn(),
    };
    const anterior = { focus: jest.fn() };
    const document = {
      createElement: jest.fn(() => campo),
      activeElement: anterior,
      body: { appendChild: jest.fn(), removeChild: jest.fn() },
      execCommand: jest.fn(() => true),
    };
    Object.defineProperty(globalThis, 'document', { value: document, configurable: true });
    const { copiarTexto } = carregar('web');
    await expect(copiarTexto('codigo')).resolves.toBe(true);
    expect(campo.value).toBe('codigo');
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.body.removeChild).toHaveBeenCalledWith(campo);
    expect(anterior.focus).toHaveBeenCalled();
  });

  it('web: sem clipboard e sem execCommand, devolve false', async () => {
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true });
    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: () => ({ style: {}, setAttribute: jest.fn(), select: jest.fn() }),
        activeElement: null,
        body: { appendChild: jest.fn(), removeChild: jest.fn() },
        execCommand: () => {
          throw new Error('indisponível');
        },
      },
      configurable: true,
    });
    const { copiarTexto } = carregar('web');
    await expect(copiarTexto('codigo')).resolves.toBe(false);
  });
});
