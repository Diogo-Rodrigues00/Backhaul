import { screen, within } from '@testing-library/react-native';

import { renderizarComRota } from '@/test-utils/renderComRota';

import {
  CartaoCargaEmpresa,
  rotuloPropostas,
  type PropsCartaoCargaEmpresa,
} from './CartaoCargaEmpresa';

// Relógio fixo (21/10/2026, 12:00 de Brasília). Prazo de 28/10 às 10:00 de Brasília (13:00 UTC).
const agora = new Date('2026-10-21T12:00:00-03:00');

// Coordenadas do centro de Uberlândia e de Uberaba (cidades da lista de src/data/cidades.ts).
const uberlandia = { lat: -18.9186, lng: -48.2772 };
const uberaba = { lat: -19.7469, lng: -47.9319 };

const carga: PropsCartaoCargaEmpresa = {
  id: 'carga-1',
  tipoCarga: 'Produtos inflamáveis',
  origem: uberlandia,
  destino: uberaba,
  pesoKg: 8000,
  valorOferecido: 3500,
  urgencia: 'urgente',
  certificacao: 'MOPP - Classe 3 Inflamáveis',
  expiraEm: '2026-10-28T13:00:00Z',
  status: 'aberto',
  totalPropostas: 2,
  agora,
};

async function renderizar(props: Partial<PropsCartaoCargaEmpresa> = {}) {
  await renderizarComRota(<CartaoCargaEmpresa {...carga} {...props} />);
}

// `article` não é elemento acessível por padrão (sem `accessible`): consulta pelo `role` do host.
function artigo() {
  const [elemento] = screen.container.queryAll((el) => el.props.role === 'article');
  if (!elemento) throw new Error('article não encontrado');
  return elemento;
}

describe('CartaoCargaEmpresa', () => {
  it('é um article rotulado (aria-labelledby) pelo h2 com o tipo da carga', async () => {
    await renderizar();
    const titulo = screen.getByRole('heading', { name: 'Produtos inflamáveis' });
    expect(titulo).toBeOnTheScreen();
    expect(artigo().props['aria-labelledby']).toBe(titulo.props.nativeID);
  });

  it('mostra urgência, status, rota por cidade, peso, valor, certificação, prazo e propostas', async () => {
    await renderizar();
    expect(screen.getByText('Urgente')).toBeOnTheScreen();
    expect(screen.getByText('Aberta')).toBeOnTheScreen();
    expect(screen.getByText('Uberlândia - MG')).toBeOnTheScreen();
    expect(screen.getByText('Uberaba - MG')).toBeOnTheScreen();
    expect(screen.getByLabelText('Peso: 8.000 kg')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByText('Exige MOPP - Classe 3 Inflamáveis')).toBeOnTheScreen();
    expect(screen.getByText('28/10/2026, 10:00')).toBeOnTheScreen();
    expect(screen.getByText('2 propostas')).toBeOnTheScreen();
  });

  it('certificação null mostra "Sem exigência"', async () => {
    await renderizar({ certificacao: null });
    expect(screen.getByText('Sem exigência')).toBeOnTheScreen();
  });

  it('ponto sem cidade válida mostra "Local não identificado"', async () => {
    await renderizar({ origem: { lat: 999, lng: 0 } });
    expect(screen.getByText('Local não identificado')).toBeOnTheScreen();
  });

  it('o link "Ver propostas" tem nome único por carga e leva a detalhe com ?id=', async () => {
    await renderizar();
    const link = screen.getByRole('link', { name: 'Ver propostas de Produtos inflamáveis' });
    expect(link.props.href).toBe('/empresa/cargas/detalhe?id=carga-1');
  });

  it('aberta vencida (CT-10) aparece como "Expirada", com prazo "vencido em", sem perder o link', async () => {
    await renderizar({ agora: new Date('2026-10-29T12:00:00-03:00') });
    expect(screen.getByText('Expirada')).toBeOnTheScreen();
    expect(screen.getByText('Prazo vencido em')).toBeOnTheScreen();
    expect(screen.queryByText('Aberta')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Ver propostas de Produtos inflamáveis' }),
    ).toBeOnTheScreen();
  });

  it('fechada e cancelada mostram o status sem virar "Expirada"', async () => {
    await renderizar({ status: 'fechado' });
    expect(screen.getByText('Fechada')).toBeOnTheScreen();
    expect(screen.queryByText('Expirada')).toBeNull();
  });

  it('expirada usa a borda tracejada e o fundo rebaixado do DS', async () => {
    await renderizar({ agora: new Date('2026-10-29T12:00:00-03:00') });
    const estilo = achatarEstilo(artigo().props.style);
    expect(estilo.borderStyle).toBe('dashed');
    expect(estilo.backgroundColor).toBe('#E1E5EA');
  });

  it('carga aberta usa borda firme e fundo de superfície', async () => {
    await renderizar();
    const estilo = achatarEstilo(artigo().props.style);
    expect(estilo.borderStyle).toBeUndefined();
    expect(estilo.backgroundColor).toBe('#FFFFFF');
  });

  it('o rótulo de propostas usa singular para uma e plural para as demais', () => {
    expect(rotuloPropostas(0)).toBe('0 propostas');
    expect(rotuloPropostas(1)).toBe('1 proposta');
    expect(rotuloPropostas(3)).toBe('3 propostas');
  });

  it('o artigo contém o link (sem sair do cartão)', async () => {
    await renderizar();
    expect(within(artigo()).getByRole('link')).toBeOnTheScreen();
  });
});

// Achata o `style` de um elemento (objeto ou array) para ler uma propriedade.
function achatarEstilo(estilo: unknown): Record<string, unknown> {
  const pilha = Array.isArray(estilo) ? estilo : [estilo];
  return pilha.reduce<Record<string, unknown>>(
    (acc, item) => (item && typeof item === 'object' ? { ...acc, ...item } : acc),
    {},
  );
}
