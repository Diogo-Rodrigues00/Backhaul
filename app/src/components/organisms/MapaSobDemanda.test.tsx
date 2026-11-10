import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { renderizarComRota } from '@/test-utils/renderComRota';

import { BarraContexto } from './BarraContexto';
import { CartaoCargaEmpresa } from './CartaoCargaEmpresa';
import { CartaoCargaProxima } from './CartaoCargaProxima';
import { MapaRota } from './MapaRota';
import { BotaoMapa, idDoMapa } from './MapaSobDemanda';

const agora = new Date('2026-10-21T12:00:00-03:00');
const uberlandia = { lat: -18.9186, lng: -48.2772 };
const uberaba = { lat: -19.7469, lng: -47.9319 };
const base = {
  id: 'carga-1',
  tipoCarga: 'Soja',
  origem: uberlandia,
  destino: uberaba,
  pesoKg: 8000,
  valorOferecido: 3500,
  urgencia: 'normal' as const,
  certificacao: null,
  expiraEm: '2026-10-28T13:00:00Z',
  agora,
};

function ComEstado({ tipo }: { tipo: 'proxima' | 'empresa' }) {
  const [aberto, setAberto] = useState(false);
  const alternar = () => setAberto((v) => !v);
  return tipo === 'proxima' ? (
    <CartaoCargaProxima
      {...base}
      empresa="Transportes Rápidos"
      distanciaKm={12.4}
      mapaAberto={aberto}
      aoAlternarMapa={alternar}
    />
  ) : (
    <CartaoCargaEmpresa
      {...base}
      status="aberto"
      totalPropostas={2}
      mapaAberto={aberto}
      aoAlternarMapa={alternar}
    />
  );
}

describe('Ver no mapa', () => {
  it.each(['proxima', 'empresa'] as const)(
    'cartão %s: abre sob demanda, aria-expanded muda e o botão continua o mesmo ao fechar',
    async (tipo) => {
      await renderizarComRota(<ComEstado tipo={tipo} />);

      const botao = screen.getByRole('button', { name: /^Ver no mapa da rota de Soja/ });
      expect(botao).toBeCollapsed();
      expect(screen.queryByText(/MAPA:/)).toBeNull();

      await fireEvent.press(botao);
      expect(
        await screen.findByText('MAPA: Mapa da rota de Uberlândia - MG a Uberaba - MG'),
      ).toBeOnTheScreen();
      const aberto = screen.getByRole('button', { name: /^Fechar mapa da rota de Soja/ });
      expect(aberto).toBeExpanded();
      expect(aberto.props['aria-controls']).toBe(idDoMapa('carga-1'));
      // O texto equivalente (origem e destino) fica no cartão com o mapa aberto.
      expect(screen.getAllByText(/Uberlândia - MG/).length).toBeGreaterThan(0);

      await fireEvent.press(aberto);
      expect(screen.queryByText(/MAPA:/)).toBeNull();
      expect(
        screen.getByRole('button', { name: /^Ver no mapa da rota de Soja/ }),
      ).toBeOnTheScreen();
    },
  );

  it('sem aoAlternarMapa os cartões não mostram o botão', async () => {
    await renderizarComRota(
      <View>
        <CartaoCargaProxima {...base} empresa="X" distanciaKm={1} />
        <CartaoCargaEmpresa {...base} status="aberto" totalPropostas={0} />
      </View>,
    );
    expect(screen.queryByText('Ver no mapa')).toBeNull();
  });

  it('BarraContexto: "Ver cargas no mapa" só com o mapa habilitado', async () => {
    const aoAlternar = jest.fn();
    await renderizarComRota(
      <BarraContexto
        local={uberlandia}
        raioKm={80}
        expiraEm="2026-10-28T13:00:00Z"
        mapa={{ aberto: false, aoAlternar, idPainel: idDoMapa('geral') }}
      />,
    );
    const botao = screen.getByRole('button', { name: 'Ver cargas no mapa' });
    expect(botao).toBeCollapsed();
    await fireEvent.press(botao);
    expect(aoAlternar).toHaveBeenCalledTimes(1);
  });

  it('BotaoMapa aberto troca o rótulo e o estado', async () => {
    await renderizarComRota(<BotaoMapa aberto aoAlternar={jest.fn()} idPainel="mapa-x" />);
    expect(screen.getByRole('button', { name: 'Fechar mapa' })).toBeExpanded();
  });
});

describe('MapaRota (iPhone)', () => {
  it('é um bloco rotulado, sem filhos para o leitor, com legenda e atribuição em texto', async () => {
    await renderizarComRota(
      <MapaRota
        descricao="Mapa da rota de A a B"
        pontos={[
          { ...uberlandia, tipo: 'origem' },
          { ...uberaba, tipo: 'destino' },
        ]}
        linha={[uberlandia, uberaba]}
      />,
    );
    const [bloco] = screen.container.queryAll(
      (el) => el.props.accessibilityLabel === 'Mapa da rota de A a B',
    );
    expect(bloco?.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.getByText('Legenda: A: coleta · B: entrega')).toBeOnTheScreen();
    expect(screen.getByText('© OpenStreetMap contributors')).toBeOnTheScreen();
  });
});
