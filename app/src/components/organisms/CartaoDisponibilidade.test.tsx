import { fireEvent, screen } from '@testing-library/react-native';

import { renderizar } from '@/test-utils/renderComTema';

import {
  CartaoDisponibilidade,
  LOCAL_SEM_CIDADE,
  rotuloPropostasPendentes,
  type PropsCartaoDisponibilidade,
} from './CartaoDisponibilidade';

// Relógio fixo (21/10/2026, 12:00 de Brasília). Prazo de 22/10 às 12:00 de Brasília.
const agora = new Date('2026-10-21T12:00:00-03:00');

// Centro de Uberlândia e de Uberaba (cidades de src/data/cidades.ts).
const uberlandia = { lat: -18.9186, lng: -48.2772 };
const uberaba = { lat: -19.7469, lng: -47.9319 };

const base: PropsCartaoDisponibilidade = {
  id: 'disp-1',
  local: uberlandia,
  raioKm: 80,
  urgencia: 'urgente',
  status: 'aberto',
  expiraEm: '2026-10-22T15:00:00Z',
  propostasPendentes: 2,
  ativa: false,
  aoUsar: jest.fn(),
  agora,
};

async function montar(props: Partial<PropsCartaoDisponibilidade> = {}) {
  await renderizar(<CartaoDisponibilidade {...base} {...props} />);
}

function artigo() {
  const [elemento] = screen.container.queryAll((el) => el.props.role === 'article');
  if (!elemento) throw new Error('article não encontrado');
  return elemento;
}

describe('CartaoDisponibilidade', () => {
  it('é um article rotulado (aria-labelledby) pelo h2 com o local', async () => {
    await montar();
    const titulo = screen.getByRole('heading', { name: 'Perto de Uberlândia - MG' });
    expect(titulo.props['aria-level']).toBe(2);
    expect(artigo().props['aria-labelledby']).toBe(titulo.props.nativeID);
  });

  it('mostra local, raio, urgência, prazo, status e propostas pendentes em texto (MVP-11)', async () => {
    await montar();
    expect(screen.getByText('Perto de Uberlândia - MG')).toBeOnTheScreen();
    expect(screen.getByText('80 km')).toBeOnTheScreen();
    expect(screen.getByText('Urgente')).toBeOnTheScreen();
    expect(screen.getByText('Expira em')).toBeOnTheScreen();
    expect(screen.getByText('22/10/2026, 12:00')).toBeOnTheScreen();
    expect(screen.getByText('Aberta')).toBeOnTheScreen();
    expect(screen.getByText('2 propostas pendentes')).toBeOnTheScreen();
    expect(screen.queryByText('Ativa')).toBeNull();
  });

  it('a ativa mostra "Ativa" em texto e não oferece "Usar esta"', async () => {
    await montar({ ativa: true });
    expect(screen.getByText('Ativa')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Usar esta/ })).toBeNull();
  });

  it('"Usar esta" tem nome único pelo local e entrega o id ao tocar', async () => {
    const aoUsar = jest.fn();
    await montar({ aoUsar, local: uberaba });
    const botao = screen.getByRole('button', {
      name: 'Usar esta disponibilidade perto de Uberaba - MG',
    });
    fireEvent.press(botao);
    expect(aoUsar).toHaveBeenCalledWith('disp-1');
  });

  it('aberta vencida vira "Expirada" (CT-10): prazo vencido e "Usar esta" desabilitado', async () => {
    await montar({ expiraEm: '2026-10-21T14:00:00Z' });
    expect(screen.getByText('Expirada')).toBeOnTheScreen();
    expect(screen.queryByText('Aberta')).toBeNull();
    expect(screen.getByText('Prazo vencido em')).toBeOnTheScreen();
    const botao = screen.getByRole('button', { name: /Usar esta/ });
    expect(botao).toBeDisabled();
  });

  it.each([
    ['fechado', 'Fechada'],
    ['cancelado', 'Cancelada'],
    ['em_negociacao', 'Em negociação'],
  ] as const)('status %s aparece como "%s" e não pode ser usada', async (status, texto) => {
    await montar({ status });
    expect(screen.getByText(texto)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Usar esta/ })).toBeDisabled();
  });

  it('sem número de propostas (plano B) a linha não aparece', async () => {
    await montar({ propostasPendentes: undefined });
    expect(screen.queryByText(/propostas? pendentes?/)).toBeNull();
  });

  it('sem `aoUsar` não há botão', async () => {
    await montar({ aoUsar: undefined });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('coordenada fora de qualquer cidade mostra "Local não identificado"', async () => {
    await montar({ local: { lat: 999, lng: 999 } });
    expect(screen.getByText(LOCAL_SEM_CIDADE)).toBeOnTheScreen();
  });

  describe('cancelar disponibilidade (card 034, MVP-22)', () => {
    const nomeDoCancelar =
      'Cancelar disponibilidade perto de Uberlândia - MG, expira em 22/10/2026, 12:00';

    it('aparece em aberta e no prazo, também na ativa, e entrega o id ao tocar', async () => {
      const aoCancelar = jest.fn();
      await montar({ aoCancelar, ativa: true });
      fireEvent.press(screen.getByRole('button', { name: nomeDoCancelar }));
      expect(aoCancelar).toHaveBeenCalledWith('disp-1');
      // A ativa continua sem "Usar esta", mas cancelar está disponível.
      expect(screen.queryByRole('button', { name: /Usar esta/ })).toBeNull();
    });

    it.each([
      ['aberta vencida (Expirada)', { expiraEm: '2026-10-21T14:00:00Z' }],
      ['fechada', { status: 'fechado' as const }],
      ['cancelada', { status: 'cancelado' as const }],
      ['em negociação', { status: 'em_negociacao' as const }],
    ])('não aparece em %s', async (_nome, props) => {
      await montar({ aoCancelar: jest.fn(), ...props });
      expect(screen.queryByRole('button', { name: /Cancelar disponibilidade/ })).toBeNull();
    });

    it('sem `aoCancelar` não há o botão', async () => {
      await montar({ aoCancelar: undefined });
      expect(screen.queryByRole('button', { name: /Cancelar disponibilidade/ })).toBeNull();
    });

    it('o nome acessível é único por item: local e horário do prazo', async () => {
      const aoCancelar = jest.fn();
      await renderizar(
        <>
          <CartaoDisponibilidade
            {...base}
            id="disp-a"
            local={uberlandia}
            expiraEm="2026-10-22T15:00:00Z"
            aoCancelar={aoCancelar}
          />
          <CartaoDisponibilidade
            {...base}
            id="disp-b"
            local={uberlandia}
            expiraEm="2026-10-23T15:00:00Z"
            aoCancelar={aoCancelar}
          />
        </>,
      );
      // `getByRole` falha se houver mais de um botão com o mesmo nome: a consulta prova a unicidade.
      fireEvent.press(screen.getByRole('button', { name: nomeDoCancelar }));
      expect(aoCancelar).toHaveBeenLastCalledWith('disp-a');
      fireEvent.press(
        screen.getByRole('button', {
          name: 'Cancelar disponibilidade perto de Uberlândia - MG, expira em 23/10/2026, 12:00',
        }),
      );
      expect(aoCancelar).toHaveBeenLastCalledWith('disp-b');
    });
  });

  it('singular e plural das propostas pendentes', () => {
    expect(rotuloPropostasPendentes(0)).toBe('0 propostas pendentes');
    expect(rotuloPropostasPendentes(1)).toBe('1 proposta pendente');
    expect(rotuloPropostasPendentes(3)).toBe('3 propostas pendentes');
  });
});
