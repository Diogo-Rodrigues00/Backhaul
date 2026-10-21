import * as SecureStore from 'expo-secure-store';

import { apagar, CHAVES, gravar, ler, memoriaReserva } from './armazenamento.native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const secureStore = jest.mocked(SecureStore);

describe('armazenamento nativo (expo-secure-store)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    memoriaReserva.clear();
  });

  it('lê o token do Keychain pela chave fixa', async () => {
    secureStore.getItemAsync.mockResolvedValue('mock-motorista');

    await expect(ler(CHAVES.token)).resolves.toBe('mock-motorista');
    expect(secureStore.getItemAsync).toHaveBeenCalledWith('backhaul.token');
  });

  it('grava e apaga no Keychain', async () => {
    secureStore.setItemAsync.mockResolvedValue();
    secureStore.deleteItemAsync.mockResolvedValue();

    await gravar(CHAVES.token, 'mock-admin');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('backhaul.token', 'mock-admin');

    await apagar(CHAVES.token);
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('backhaul.token');
  });

  it('usa a reserva em memória quando o Keychain falha ao gravar', async () => {
    secureStore.setItemAsync.mockRejectedValue(new Error('keychain indisponível'));
    secureStore.getItemAsync.mockRejectedValue(new Error('keychain indisponível'));

    await gravar(CHAVES.token, 'em-memoria');
    await expect(ler(CHAVES.token)).resolves.toBe('em-memoria');
  });

  it('usa a reserva quando a leitura falha e apaga mesmo se o Keychain falhar', async () => {
    memoriaReserva.set(CHAVES.tema, 'escuro');
    secureStore.getItemAsync.mockRejectedValue(new Error('falhou'));
    secureStore.deleteItemAsync.mockRejectedValue(new Error('falhou'));

    await expect(ler(CHAVES.tema)).resolves.toBe('escuro');
    await expect(apagar(CHAVES.tema)).resolves.toBeUndefined();
    await expect(ler(CHAVES.tema)).resolves.toBeNull();
  });

  it('devolve null quando o Keychain não tem a chave', async () => {
    secureStore.getItemAsync.mockResolvedValue(null);

    await expect(ler(CHAVES.disponibilidadeAtiva)).resolves.toBeNull();
  });
});
