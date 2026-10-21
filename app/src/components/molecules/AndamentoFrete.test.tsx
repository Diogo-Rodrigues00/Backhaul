import { screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import { AndamentoFrete, iconeDaEtapa } from './AndamentoFrete';

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

  it('status de fora do contrato (vindo da API) não quebra: todas pendentes', async () => {
    // Um valor novo ou de outra entidade (ex.: `em_negociacao`) não tem etapa: sai como pendente.
    await renderizar(<AndamentoFrete statusEntrega={'em_negociacao' as never} />);
    expect(sufixosOcultos()).toEqual(['(pendente)', '(pendente)', '(pendente)']);
    expect(etapaAtual()).toBe(-1);
  });
});

describe('iconeDaEtapa (ícone por etapa, protótipo e DS 5.2)', () => {
  it('concluída é sempre check, qualquer que seja a etapa', () => {
    expect(iconeDaEtapa('aceito', 'concluida')).toBe('check');
    expect(iconeDaEtapa('em_transito', 'concluida')).toBe('check');
    expect(iconeDaEtapa('entregue', 'concluida')).toBe('check');
  });

  it('Em trânsito é truck e Entregue é package, na atual e na pendente', () => {
    expect(iconeDaEtapa('em_transito', 'atual')).toBe('truck');
    expect(iconeDaEtapa('em_transito', 'pendente')).toBe('truck');
    expect(iconeDaEtapa('entregue', 'atual')).toBe('package');
    expect(iconeDaEtapa('entregue', 'pendente')).toBe('package');
  });
});
