import { fireEvent, screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import {
  BotaoConversa,
  ROTULO_ABRIR_CONVERSA,
  ROTULO_FECHAR_CONVERSA,
  type PropsBotaoConversa,
} from './BotaoConversa';

function props(extra: Partial<PropsBotaoConversa> = {}): PropsBotaoConversa {
  return {
    aberta: false,
    nome: 'João da Silva',
    idDoPainel: 'conversa-1',
    aoAlternar: jest.fn(),
    ...extra,
  };
}

describe('BotaoConversa', () => {
  it('fechada: "Abrir conversa" visível, nome acessível com a outra parte e aria-expanded falso', async () => {
    await renderizar(<BotaoConversa {...props()} />);
    expect(ROTULO_ABRIR_CONVERSA).toBe('Abrir conversa');
    expect(screen.getByText('Abrir conversa')).toBeOnTheScreen();
    const botao = screen.getByRole('button', { name: 'Abrir conversa com João da Silva' });
    expect(botao).toBeCollapsed();
    expect(botao.props['aria-controls']).toBe('conversa-1');
  });

  it('aberta: "Fechar conversa" e aria-expanded verdadeiro', async () => {
    await renderizar(<BotaoConversa {...props({ aberta: true })} />);
    expect(ROTULO_FECHAR_CONVERSA).toBe('Fechar conversa');
    expect(screen.getByText('Fechar conversa')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Fechar conversa com João da Silva' }),
    ).toBeExpanded();
  });

  it('o texto visível está contido no nome acessível (WCAG 2.5.3)', async () => {
    await renderizar(<BotaoConversa {...props()} />);
    const nome = screen.getByRole('button').props.accessibilityLabel as string;
    expect(nome.startsWith(ROTULO_ABRIR_CONVERSA)).toBe(true);
  });

  it('avisa a tela ao pressionar', async () => {
    const aoAlternar = jest.fn();
    await renderizar(<BotaoConversa {...props({ aoAlternar })} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(aoAlternar).toHaveBeenCalledTimes(1);
  });
});
