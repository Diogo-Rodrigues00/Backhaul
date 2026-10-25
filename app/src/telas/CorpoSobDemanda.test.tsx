// Corpo sob demanda: enquanto o código chega aparece o `carregando`; se o chunk não baixa, aparece o
// erro com "Tentar de novo", e cada tentativa pede um carregamento novo (a falha não fica memorizada).
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { CorpoSobDemanda, MENSAGEM_FALHA_AO_CARREGAR_TELA } from './CorpoSobDemanda';

function Corpo() {
  return <Text>Corpo aberto</Text>;
}

beforeEach(() => {
  // O React registra no console o erro que o limite de erro segura.
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('CorpoSobDemanda', () => {
  it('mostra o carregando e depois o corpo', async () => {
    const carregar = jest.fn(() => Promise.resolve({ default: Corpo }));

    await renderizar(<CorpoSobDemanda carregar={carregar} carregando={<Text>Carregando…</Text>} />);

    expect(await screen.findByText('Corpo aberto')).toBeOnTheScreen();
    expect(carregar).toHaveBeenCalledTimes(1);
  });

  it('chunk que não baixa: avisa com role="alert" e "Tentar de novo" baixa de novo', async () => {
    const carregar = jest
      .fn<Promise<{ default: typeof Corpo }>, []>()
      .mockRejectedValueOnce(new Error('Loading chunk failed'))
      .mockResolvedValue({ default: Corpo });

    await renderizar(<CorpoSobDemanda carregar={carregar} carregando={<Text>Carregando…</Text>} />);

    const aviso = await screen.findByText(MENSAGEM_FALHA_AO_CARREGAR_TELA);
    expect(aviso).toBeOnTheScreen();
    expect(screen.queryByText('Corpo aberto')).toBeNull();
    expect(screen.container.queryAll((el) => el.props.role === 'alert')).toHaveLength(1);

    fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Corpo aberto')).toBeOnTheScreen();
    expect(screen.queryByText(MENSAGEM_FALHA_AO_CARREGAR_TELA)).toBeNull();
    expect(carregar).toHaveBeenCalledTimes(2);
  });

  it('continua falhando: mostra o erro de novo, sem derrubar a tela', async () => {
    const carregar = jest.fn(() => Promise.reject(new Error('sem conexão')));

    await renderizar(<CorpoSobDemanda carregar={carregar} carregando={<Text>Carregando…</Text>} />);
    await screen.findByText(MENSAGEM_FALHA_AO_CARREGAR_TELA);

    fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));

    await waitFor(() => expect(carregar).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(MENSAGEM_FALHA_AO_CARREGAR_TELA)).toBeOnTheScreen();
  });
});
