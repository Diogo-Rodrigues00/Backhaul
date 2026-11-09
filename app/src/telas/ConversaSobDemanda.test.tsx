import { fireEvent, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { ConversaSobDemanda, MENSAGEM_FALHA_AO_ABRIR_CONVERSA } from './ConversaSobDemanda';
import { carregarPainelDaConversa } from './PainelDaConversa.carregar';

jest.mock('./PainelDaConversa.carregar', () => ({ carregarPainelDaConversa: jest.fn() }));

const carregar = carregarPainelDaConversa as jest.MockedFunction<typeof carregarPainelDaConversa>;

function PainelFalso({ id }: { id: string }) {
  return <Text>{`Painel ${id}`}</Text>;
}

const entrada = {
  id: 'conversa-1',
  propostaId: 'p1',
  statusDaProposta: 'pendente',
  nomeDaOutraParte: 'João da Silva',
} as const;

describe('ConversaSobDemanda', () => {
  // A falha vem primeiro: o `lazy` do módulo guarda o painel depois de baixado (reabrir não pisca).
  it('chunk que não baixou: erro dentro da conversa e "Tentar de novo" baixa de novo', async () => {
    const erroDoConsole = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    carregar.mockRejectedValueOnce(new Error('chunk'));
    await renderizar(<ConversaSobDemanda {...entrada} />);
    expect(await screen.findByText(MENSAGEM_FALHA_AO_ABRIR_CONVERSA)).toBeOnTheScreen();

    carregar.mockResolvedValue({ default: PainelFalso } as never);
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText('Painel conversa-1')).toBeOnTheScreen();
    erroDoConsole.mockRestore();
  });
  it('baixa o painel e o mostra com as props da tela', async () => {
    carregar.mockResolvedValue({ default: PainelFalso } as never);
    await renderizar(<ConversaSobDemanda {...entrada} />);
    expect(await screen.findByText('Painel conversa-1')).toBeOnTheScreen();
  });
});
