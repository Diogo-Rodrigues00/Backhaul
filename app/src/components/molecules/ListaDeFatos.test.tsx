import { screen } from '@testing-library/react-native';

import { Texto } from '@/components/atoms/Texto';
import { renderizar } from '@/test-utils/renderComTema';

import { ListaDeFatos } from './ListaDeFatos';

describe('ListaDeFatos (iPhone)', () => {
  it('lê rótulo e valor juntos ("Peso: 8.000 kg")', async () => {
    await renderizar(<ListaDeFatos itens={[{ rotulo: 'Peso', valor: '8.000 kg' }]} />);
    expect(screen.getByLabelText('Peso: 8.000 kg')).toBeOnTheScreen();
    expect(screen.getByText('Peso')).toBeOnTheScreen();
    expect(screen.getByText('8.000 kg')).toBeOnTheScreen();
  });

  it('valor que não é texto aparece como foi passado (ex.: uma etiqueta)', async () => {
    await renderizar(
      <ListaDeFatos
        itens={[{ rotulo: 'Pagamento', valor: <Texto>Liberado ao motorista</Texto> }]}
      />,
    );
    expect(screen.getByText('Pagamento')).toBeOnTheScreen();
    expect(screen.getByText('Liberado ao motorista')).toBeOnTheScreen();
  });

  it('lista vazia não quebra', async () => {
    await renderizar(<ListaDeFatos itens={[]} />);
    expect(screen.queryByText('Peso')).toBeNull();
  });
});
