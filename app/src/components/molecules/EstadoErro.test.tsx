import { fireEvent, screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { EstadoErro } from './EstadoErro';

describe('EstadoErro', () => {
  it('mostra a mensagem padrão em um alerta e o botão "Tentar de novo"', async () => {
    await renderizar(<EstadoErro aoTentarDeNovo={() => {}} />);
    expect(screen.container.queryAll((el) => el.props.role === 'alert')).toHaveLength(1);
    expect(screen.getByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  it('mostra a mensagem do servidor como veio', async () => {
    await renderizar(<EstadoErro mensagem="Carga não encontrada" aoTentarDeNovo={() => {}} />);
    expect(screen.getByText('Carga não encontrada')).toBeOnTheScreen();
  });

  it('ao tocar chama aoTentarDeNovo', async () => {
    const aoTentarDeNovo = jest.fn();
    await renderizar(<EstadoErro aoTentarDeNovo={aoTentarDeNovo} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(aoTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it('tentando: o botão vira "Tentando…" e ignora toques', async () => {
    const aoTentarDeNovo = jest.fn();
    await renderizar(<EstadoErro aoTentarDeNovo={aoTentarDeNovo} tentando />);
    const botao = screen.getByRole('button', { name: 'Tentando…' });
    expect(botao).toBeBusy();
    await fireEvent.press(botao);
    expect(aoTentarDeNovo).not.toHaveBeenCalled();
  });
});
