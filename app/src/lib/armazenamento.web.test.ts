import { apagar, CHAVES, gravar, ler, memoriaReserva } from './armazenamento.web';

function criarLocalStorageFalso(): Storage {
  const dados = new Map<string, string>();
  return {
    getItem: (chave: string) => dados.get(chave) ?? null,
    setItem: (chave: string, valor: string) => {
      dados.set(chave, String(valor));
    },
    removeItem: (chave: string) => {
      dados.delete(chave);
    },
    clear: () => dados.clear(),
    key: () => null,
    get length() {
      return dados.size;
    },
  } as Storage;
}

describe('armazenamento web (localStorage)', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  beforeEach(() => {
    memoriaReserva.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      value: criarLocalStorageFalso(),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('grava, lê e apaga pela chave fixa do token', async () => {
    await gravar(CHAVES.token, 'mock-empresa');
    expect(localStorage.getItem('backhaul.token')).toBe('mock-empresa');
    await expect(ler(CHAVES.token)).resolves.toBe('mock-empresa');

    await apagar(CHAVES.token);
    await expect(ler(CHAVES.token)).resolves.toBeNull();
  });

  it('devolve null para chave inexistente', async () => {
    await expect(ler(CHAVES.tema)).resolves.toBeNull();
  });

  it('usa a reserva em memória quando o localStorage lança ao gravar', async () => {
    jest.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    await gravar(CHAVES.token, 'token-em-memoria');
    await expect(ler(CHAVES.token)).resolves.toBe('token-em-memoria');
  });

  it('usa a reserva quando o localStorage lança ao ler', async () => {
    memoriaReserva.set(CHAVES.token, 'vindo-da-reserva');
    jest.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    await expect(ler(CHAVES.token)).resolves.toBe('vindo-da-reserva');
  });

  it('apaga da reserva mesmo se o localStorage falhar ao remover', async () => {
    memoriaReserva.set(CHAVES.token, 'x');
    jest.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    await apagar(CHAVES.token);
    await expect(ler(CHAVES.token)).resolves.toBeNull();
  });

  it('sem localStorage (pré-render em Node) grava na reserva', async () => {
    Reflect.deleteProperty(globalThis, 'localStorage');

    await gravar(CHAVES.disponibilidadeAtiva, 'disp-1');
    await expect(ler(CHAVES.disponibilidadeAtiva)).resolves.toBe('disp-1');

    await apagar(CHAVES.disponibilidadeAtiva);
    await expect(ler(CHAVES.disponibilidadeAtiva)).resolves.toBeNull();
  });

  it('sem localStorage, lê a reserva e apaga sem erro', async () => {
    Reflect.deleteProperty(globalThis, 'localStorage');
    memoriaReserva.set(CHAVES.tema, 'escuro');

    await expect(ler(CHAVES.tema)).resolves.toBe('escuro');
    await expect(apagar(CHAVES.tema)).resolves.toBeUndefined();
  });

  it('trata o acesso que lança como ausência de localStorage', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      get() {
        throw new Error('SecurityError');
      },
      configurable: true,
    });

    await gravar(CHAVES.token, 'sem-acesso');
    await expect(ler(CHAVES.token)).resolves.toBe('sem-acesso');
  });
});
