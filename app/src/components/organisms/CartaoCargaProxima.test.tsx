import { screen, within } from '@testing-library/react-native';
import { Text } from 'react-native';

import { renderizarComRota } from '@/test-utils/renderComRota';

import {
  CartaoCargaProxima,
  idPropostaEnviada,
  type PropsCartaoCargaProxima,
} from './CartaoCargaProxima';

// Relógio fixo (21/10/2026, 12:00 de Brasília). Prazo de 28/10 às 10:00 de Brasília (13:00 UTC).
const agora = new Date('2026-10-21T12:00:00-03:00');

const uberlandia = { lat: -18.9186, lng: -48.2772 };
const uberaba = { lat: -19.7469, lng: -47.9319 };

const carga: PropsCartaoCargaProxima = {
  id: 'carga-1',
  tipoCarga: 'Produtos inflamáveis',
  empresa: 'Transportes Rápidos LTDA',
  origem: uberlandia,
  destino: uberaba,
  pesoKg: 8000,
  valorOferecido: 3500,
  urgencia: 'critico',
  certificacao: 'MOPP - Classe 3 Inflamáveis',
  expiraEm: '2026-10-28T13:00:00Z',
  distanciaKm: 12.4,
  agora,
};

async function renderizar(props: Partial<PropsCartaoCargaProxima> = {}) {
  await renderizarComRota(<CartaoCargaProxima {...carga} {...props} />);
}

// Faixas decorativas do topo (8 px âmbar ou 12 px de obra), à parte dos demais itens aria-hidden.
function faixas() {
  return screen.container.queryAll(
    (el) =>
      el.props['aria-hidden'] === true &&
      (el.props.style?.height === 8 ||
        el.props.height === 12 ||
        el.props.importantForAccessibility === 'no-hide-descendants'),
  );
}

function artigo() {
  const [elemento] = screen.container.queryAll((el) => el.props.role === 'article');
  if (!elemento) throw new Error('article não encontrado');
  return elemento;
}

describe('CartaoCargaProxima', () => {
  it('é um article rotulado (aria-labelledby) pelo h2 com o tipo da carga', async () => {
    await renderizar();
    const titulo = screen.getByRole('heading', { name: 'Produtos inflamáveis' });
    expect(titulo.props['aria-level']).toBe(2);
    expect(artigo().props['aria-labelledby']).toBe(titulo.props.nativeID);
  });

  it('mostra urgência, tipo, empresa, distância, rota, peso, valor, certificação e prazo (MVP-12)', async () => {
    await renderizar();
    expect(screen.getByText('Crítico')).toBeOnTheScreen();
    expect(screen.getByText('Produtos inflamáveis')).toBeOnTheScreen();
    expect(screen.getByText('Transportes Rápidos LTDA')).toBeOnTheScreen();
    expect(screen.getByText('12,4 km')).toBeOnTheScreen();
    expect(screen.getByText('até a coleta')).toBeOnTheScreen();
    expect(screen.getByText('Uberlândia - MG')).toBeOnTheScreen();
    expect(screen.getByText('Uberaba - MG')).toBeOnTheScreen();
    expect(screen.getByLabelText('Peso: 8.000 kg')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByText('Exige MOPP - Classe 3 Inflamáveis')).toBeOnTheScreen();
    expect(screen.getByText('28/10/2026, 10:00')).toBeOnTheScreen();
  });

  it('sem exigência de certificação mostra "Sem exigência"', async () => {
    await renderizar({ certificacao: null });
    expect(screen.getByText('Sem exigência')).toBeOnTheScreen();
  });

  it('o selo de urgência vem antes do tipo na ordem de leitura', async () => {
    await renderizar();
    const textos = JSON.stringify(screen.toJSON());
    expect(textos.indexOf('Urgência: ')).toBeGreaterThan(-1);
    expect(textos.indexOf('Urgência: ')).toBeLessThan(textos.indexOf('Produtos inflamáveis'));
  });

  it('coordenada inválida mostra "Local não identificado"', async () => {
    await renderizar({ origem: { lat: Number.NaN, lng: Number.NaN } });
    expect(screen.getByText('Local não identificado')).toBeOnTheScreen();
  });

  it('Urgente leva a faixa âmbar no topo', async () => {
    await renderizar({ urgencia: 'urgente' });
    expect(faixas()).toHaveLength(1);
  });

  it('mostra as ações recebidas (card 025) enquanto não há proposta', async () => {
    await renderizar({ acoes: <Text>Aceitar R$ 3.500,00</Text> });
    expect(screen.getByText('Aceitar R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.queryByText('Proposta enviada')).toBeNull();
  });

  it('D-PO-05: com proposta enviada mostra "Proposta enviada" e some com as ações', async () => {
    await renderizar({ propostaEnviada: true, acoes: <Text>Aceitar R$ 3.500,00</Text> });
    expect(screen.getByText('Proposta enviada')).toBeOnTheScreen();
    expect(
      screen.getByText('Aguardando a resposta de Transportes Rápidos LTDA.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Aceitar R$ 3.500,00')).toBeNull();
    const [marcador] = screen.container.queryAll(
      (el) => el.props.nativeID === idPropostaEnviada('carga-1'),
    );
    expect(within(marcador!).getByText('Proposta enviada')).toBeOnTheScreen();
  });

  it('CT-10: carga com o prazo vencido aparece como "Expirada", sem ações nem "Proposta enviada"', async () => {
    await renderizar({
      expiraEm: '2026-10-21T10:00:00-03:00',
      propostaEnviada: true,
      acoes: <Text>Aceitar R$ 3.500,00</Text>,
    });
    expect(screen.getByText('Expirada')).toBeOnTheScreen();
    expect(screen.getByText('Prazo vencido em')).toBeOnTheScreen();
    expect(screen.queryByText('Aceitar R$ 3.500,00')).toBeNull();
    expect(screen.queryByText('Proposta enviada')).toBeNull();
  });

  it('Expirada usa borda tracejada e não leva faixa de urgência', async () => {
    await renderizar({ expiraEm: '2026-10-21T10:00:00-03:00' });
    expect(artigo().props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ borderStyle: 'dashed' })]),
    );
    expect(faixas()).toHaveLength(0);
  });

  it('Normal usa a borda comum e não leva faixa', async () => {
    await renderizar({ urgencia: 'normal' });
    expect(faixas()).toHaveLength(0);
  });
});
