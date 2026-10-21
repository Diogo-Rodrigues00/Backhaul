import { screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { AndamentoFrete } from './AndamentoFrete';

// Texto oculto de cada etapa, na ordem Aceito → Em trânsito → Entregue.
function sufixosOcultos(): string[] {
  return screen
    .queryAllByText(/^\s*\((concluído|etapa atual|pendente)\)\s*$/)
    .map((el) => String(el.props.children).trim());
}

function etapaAtual(): number {
  return screen.getAllByRole('listitem').findIndex((li) => li.props['aria-current'] === 'step');
}

describe('AndamentoFrete', () => {
  it('mostra as três etapas com o rótulo do contrato', async () => {
    await renderizar(<AndamentoFrete statusEntrega="aceito" />);
    expect(screen.getByText('Aceito')).toBeOnTheScreen();
    expect(screen.getByText('Em trânsito')).toBeOnTheScreen();
    expect(screen.getByText('Entregue')).toBeOnTheScreen();
  });

  it.each([
    ['aceito', ['(etapa atual)', '(pendente)', '(pendente)'], 0],
    ['em_transito', ['(concluído)', '(etapa atual)', '(pendente)'], 1],
    ['entregue', ['(concluído)', '(concluído)', '(etapa atual)'], 2],
  ] as const)(
    'status %s: texto oculto %j e etapa atual no índice %i',
    async (status, sufixos, atual) => {
      await renderizar(<AndamentoFrete statusEntrega={status} />);
      expect(sufixosOcultos()).toEqual(sufixos);
      expect(etapaAtual()).toBe(atual);
    },
  );

  it('cancelado não tem etapa atual: todas pendentes', async () => {
    await renderizar(<AndamentoFrete statusEntrega="cancelado" />);
    expect(sufixosOcultos()).toEqual(['(pendente)', '(pendente)', '(pendente)']);
    expect(etapaAtual()).toBe(-1);
  });

  it('é uma lista com nome', async () => {
    await renderizar(<AndamentoFrete statusEntrega="em_transito" />);
    expect(screen.getByLabelText('Andamento do frete')).toBeOnTheScreen();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
