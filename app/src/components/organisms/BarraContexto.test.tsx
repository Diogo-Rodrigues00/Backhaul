import { screen } from '@testing-library/react-native';

import { renderizarComRota } from '@/test-utils/renderComRota';

import { BarraContexto, descreverBusca, LOCAL_BUSCA_SEM_CIDADE } from './BarraContexto';

const uberlandia = { lat: -18.9186, lng: -48.2772 };
// 28/10/2026, 10:00 de Brasília.
const expiraEm = '2026-10-28T13:00:00Z';

describe('BarraContexto', () => {
  it('descreve local, raio e validade da disponibilidade em texto completo', () => {
    expect(descreverBusca({ local: uberlandia, raioKm: 80, expiraEm })).toBe(
      'Buscando perto de Uberlândia - MG, raio de 80 km, até 28/10/2026, 10:00',
    );
  });

  it('aceita o raio como texto numérico da API', () => {
    expect(descreverBusca({ local: uberlandia, raioKm: '80.00', expiraEm })).toContain(
      'raio de 80 km',
    );
  });

  it('ponto sem coordenadas válidas não quebra a frase', () => {
    expect(
      descreverBusca({ local: { lat: Number.NaN, lng: Number.NaN }, raioKm: 50, expiraEm }),
    ).toContain(`perto de ${LOCAL_BUSCA_SEM_CIDADE}`);
  });

  it('é uma região rotulada e leva a "Trocar disponibilidade"', async () => {
    await renderizarComRota(<BarraContexto local={uberlandia} raioKm={80} expiraEm={expiraEm} />);
    const [regiao] = screen.container.queryAll(
      (el) =>
        el.props.role === 'region' && el.props['aria-label'] === 'Disponibilidade usada na busca',
    );
    expect(regiao).toBeDefined();
    expect(screen.getByText(/Buscando perto de Uberlândia - MG, raio de 80 km/)).toBeOnTheScreen();
    const [link] = screen.getAllByRole('link', { name: 'Trocar disponibilidade' });
    expect(link?.props.href).toBe('/motorista/disponibilidades');
  });
});
