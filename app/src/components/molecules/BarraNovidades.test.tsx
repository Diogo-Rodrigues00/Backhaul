import { act, screen, within } from '@testing-library/react-native';

import { anunciar } from '@/lib/a11y';
import { comTema, renderizar } from '@/test-utils/renderComTema';

import { BarraNovidades } from './BarraNovidades';

jest.mock('@/hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: jest.fn(() => false) }));
jest.mock('@/hooks/useLoopAnimado', () => ({
  useLoopAnimado: jest.fn(() => ({ interpolate: () => 1 })),
}));

function regiao() {
  const [no] = screen.container.queryAll(
    (el) => el.props.role === 'status' && el.props['aria-live'] === 'polite',
  );
  if (!no) throw new Error('região de status não renderizada');
  return no;
}

// 17:32:08 UTC = 14:32:08 em Brasília
const ATUALIZADO = new Date('2027-05-01T17:32:08.000Z').getTime();

describe('BarraNovidades', () => {
  it('diz que a tela atualiza sozinha e a hora da última atualização', async () => {
    await renderizar(<BarraNovidades atualizadoEm={ATUALIZADO} />);
    expect(
      screen.getByText('Esta tela atualiza sozinha a cada 10 s. Última atualização às 14:32:08.'),
    ).toBeOnTheScreen();
  });

  it('sem hora (nada buscado ainda) mostra só o aviso fixo', async () => {
    await renderizar(<BarraNovidades atualizadoEm={0} />);
    expect(screen.getByText('Esta tela atualiza sozinha a cada 10 s.')).toBeOnTheScreen();
  });

  it('aceita outro intervalo', async () => {
    await renderizar(<BarraNovidades intervaloSegundos={30} />);
    expect(screen.getByText('Esta tela atualiza sozinha a cada 30 s.')).toBeOnTheScreen();
  });

  it('a novidade fica numa região de status educada (aria-live polite)', async () => {
    await renderizar(<BarraNovidades titulo="1 nova proposta" atualizadoEm={ATUALIZADO} />);
    expect(within(regiao()).getByText('1 nova proposta')).toBeOnTheScreen();
  });

  it('a hora fica fora da região, para não ser lida a cada ciclo', async () => {
    await renderizar(<BarraNovidades titulo="1 nova proposta" atualizadoEm={ATUALIZADO} />);
    expect(within(regiao()).queryByText(/Última atualização/)).toBeNull();
  });

  it('a região existe mesmo sem novidade (a mudança futura será anunciada)', async () => {
    await renderizar(<BarraNovidades atualizadoEm={ATUALIZADO} />);
    expect(regiao()).toBeTruthy();
  });

  it('não é focável e não toma o foco quando a novidade muda', async () => {
    const tela = await renderizar(<BarraNovidades atualizadoEm={ATUALIZADO} />);
    await tela.rerender(
      comTema(<BarraNovidades titulo="Proposta aceita" atualizadoEm={ATUALIZADO} />),
    );
    expect(regiao().props.tabIndex).toBeUndefined();
    expect(regiao().props.focusable).toBeUndefined();
    expect(screen.getByText('Proposta aceita')).toBeOnTheScreen();
  });

  it('o ponto que pulsa é decorativo', async () => {
    await renderizar(<BarraNovidades atualizadoEm={ATUALIZADO} />);
    const escondidos = screen.container.queryAll((el) => el.props['aria-hidden'] === true);
    expect(escondidos.length).toBeGreaterThan(0);
  });

  it('anunciar() não depende da barra (a região global cuida do resto)', async () => {
    await renderizar(<BarraNovidades atualizadoEm={ATUALIZADO} />);
    await act(async () => anunciar('Lista atualizada'));
    expect(screen.queryByText('Lista atualizada')).toBeNull();
  });
});
