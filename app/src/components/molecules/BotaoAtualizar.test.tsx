import { fireEvent, screen } from '@testing-library/react-native';

import { anunciar } from '@/lib/a11y';
import { comTema, renderizar } from '@/test-utils/renderComTema';

import { BotaoAtualizar } from './BotaoAtualizar';

jest.mock('@/lib/a11y', () => ({ anunciar: jest.fn() }));

beforeEach(() => jest.mocked(anunciar).mockClear());

describe('BotaoAtualizar', () => {
  it('mostra "Atualizar" e chama aoAtualizar ao tocar', async () => {
    const aoAtualizar = jest.fn();
    await renderizar(<BotaoAtualizar aoAtualizar={aoAtualizar} atualizando={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));
    expect(aoAtualizar).toHaveBeenCalledTimes(1);
  });

  it('atualizando: vira "Atualizando…", ocupado, e ignora toques', async () => {
    const aoAtualizar = jest.fn();
    await renderizar(<BotaoAtualizar aoAtualizar={aoAtualizar} atualizando />);
    const botao = screen.getByRole('button', { name: 'Atualizando…' });
    expect(botao).toBeBusy();
    await fireEvent.press(botao);
    expect(aoAtualizar).not.toHaveBeenCalled();
  });

  it('não anuncia na montagem', async () => {
    await renderizar(<BotaoAtualizar aoAtualizar={() => {}} atualizando={false} />);
    expect(anunciar).not.toHaveBeenCalled();
  });

  it('anuncia "Lista atualizada" quando a busca termina', async () => {
    const tela = await renderizar(<BotaoAtualizar aoAtualizar={() => {}} atualizando />);
    expect(anunciar).not.toHaveBeenCalled();
    await tela.rerender(comTema(<BotaoAtualizar aoAtualizar={() => {}} atualizando={false} />));
    expect(anunciar).toHaveBeenCalledTimes(1);
    expect(anunciar).toHaveBeenCalledWith('Lista atualizada');
  });
});
