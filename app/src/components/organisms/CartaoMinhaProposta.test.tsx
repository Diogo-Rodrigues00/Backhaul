import { fireEvent, screen } from '@testing-library/react-native';

import { Texto } from '@/components/atoms/Texto';
import { renderizarComRota } from '@/test-utils/renderComRota';

import {
  CartaoMinhaProposta,
  fraseDaDiferenca,
  type PropsCartaoMinhaProposta,
} from './CartaoMinhaProposta';

const base: PropsCartaoMinhaProposta = {
  tipoCarga: 'Grãos',
  empresa: 'Transportes Rápidos LTDA',
  tipo: 'contraproposta',
  status: 'pendente',
  valorOferecido: 3500,
  valorProposto: 3200,
  criadoEm: '2026-11-03T20:30:00.000Z',
  freteId: null,
};

async function renderizar(props: Partial<PropsCartaoMinhaProposta> = {}) {
  await renderizarComRota(<CartaoMinhaProposta {...base} {...props} />);
}

// View não é elemento de acessibilidade para o RNTL: o papel de article sai por `props.role`.
const artigos = () => screen.container.queryAll((el) => el.props.role === 'article');

describe('CartaoMinhaProposta', () => {
  it('é um article cujo nome é o tipo da carga (h2)', async () => {
    await renderizar();
    expect(artigos()).toHaveLength(1);
    const titulo = screen.getByRole('heading', { name: 'Grãos' });
    expect(titulo.props['aria-level']).toBe(2);
    expect(artigos()[0]!.props['aria-labelledby']).toBe(titulo.props.nativeID);
  });

  it('mostra empresa, tipo, status em texto e os dois valores em reais', async () => {
    await renderizar();
    expect(screen.getByText('Empresa: Transportes Rápidos LTDA')).toBeOnTheScreen();
    expect(screen.getByText('Contraproposta')).toBeOnTheScreen();
    expect(screen.getByText('Pendente')).toBeOnTheScreen();
    expect(screen.getByText('Valor oferecido pela empresa')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.500,00')).toBeOnTheScreen();
    expect(screen.getByText('Seu valor')).toBeOnTheScreen();
    expect(screen.getByText('R$ 3.200,00')).toBeOnTheScreen();
  });

  it('o tipo aceite aparece como "Proposta", sem o rótulo "Aceita o valor" (confundia com o status)', async () => {
    await renderizar({ tipo: 'aceite', status: 'aceita', valorProposto: 3500 });
    expect(screen.getByText('Proposta')).toBeOnTheScreen();
    expect(screen.queryByText('Aceita o valor')).toBeNull();
    expect(screen.getByText('Aceita')).toBeOnTheScreen();
  });

  it('o slot do rodapé (children) aparece ao lado da data, para o botão do card 043', async () => {
    await renderizarComRota(
      <CartaoMinhaProposta {...base}>
        <Texto>Conversa com a empresa</Texto>
      </CartaoMinhaProposta>,
    );
    expect(screen.getByText('Conversa com a empresa')).toBeOnTheScreen();
    expect(screen.getByText('Enviada em 03/11/2026, 17:30')).toBeOnTheScreen();
  });

  it('mostra a data de envio no fuso de São Paulo', async () => {
    await renderizar();
    expect(screen.getByText('Enviada em 03/11/2026, 17:30')).toBeOnTheScreen();
  });

  it('aceita com frete: link "Ver frete de <carga>" para Meus fretes', async () => {
    await renderizar({ status: 'aceita', tipo: 'aceite', valorProposto: 3500, freteId: 'f-1' });
    expect(screen.getByText('Aceita')).toBeOnTheScreen();
    const link = screen.getByRole('link', { name: 'Ver frete de Grãos' });
    expect(link.props.href).toBe('/motorista/fretes');
  });

  it('aceita sem frete_id ainda não inventa link', async () => {
    await renderizar({ status: 'aceita', tipo: 'aceite', freteId: null });
    expect(screen.queryByRole('link', { name: /Ver frete/ })).toBeNull();
  });

  it.each(['pendente', 'recusada', 'expirada'] as const)(
    '%s não tem link "Ver frete", mesmo com frete_id',
    async (status) => {
      await renderizar({ status, freteId: 'f-1' });
      expect(screen.queryByRole('link', { name: /Ver frete/ })).toBeNull();
    },
  );

  it.each([
    ['aceita', 'Aceita'],
    ['recusada', 'Recusada'],
    ['expirada', 'Expirada'],
  ] as const)('o status %s aparece em texto: "%s"', async (status, texto) => {
    await renderizar({ status });
    expect(screen.getByText(texto)).toBeOnTheScreen();
  });

  it('valores vindos como texto da API (NUMERIC) são formatados', async () => {
    await renderizar({ valorOferecido: '3500.00', valorProposto: '3200.00' });
    expect(screen.getByText('R$ 3.500,00')).toBeOnTheScreen();
    expect(
      screen.getByText('Sua contraproposta é R$ 300,00 abaixo do valor oferecido.'),
    ).toBeOnTheScreen();
  });
});

describe('fraseDaDiferenca', () => {
  it('aceite: o motorista aceitou o valor oferecido', () => {
    expect(fraseDaDiferenca('aceite', 100, 100)).toBe(
      'Você aceitou o valor oferecido pela empresa.',
    );
  });

  it('contraproposta abaixo, acima e igual ao valor oferecido', () => {
    expect(fraseDaDiferenca('contraproposta', 3500, 3200)).toBe(
      'Sua contraproposta é R$ 300,00 abaixo do valor oferecido.',
    );
    expect(fraseDaDiferenca('contraproposta', 3500, 3700)).toBe(
      'Sua contraproposta é R$ 200,00 acima do valor oferecido.',
    );
    expect(fraseDaDiferenca('contraproposta', 3500, '3500.00')).toBe(
      'Sua contraproposta repete o valor oferecido.',
    );
  });

  it('centavos não viram resto de ponto flutuante', () => {
    expect(fraseDaDiferenca('contraproposta', 3500.1, 3200.2)).toBe(
      'Sua contraproposta é R$ 299,90 abaixo do valor oferecido.',
    );
  });

  it('sem número válido, não há frase', () => {
    expect(fraseDaDiferenca('contraproposta', null, 3200)).toBeNull();
  });
});

describe('CartaoMinhaProposta: conversa (card 043)', () => {
  it('sem as props da conversa não há botão', async () => {
    await renderizar();
    expect(screen.queryByRole('button', { name: /conversa/ })).toBeNull();
  });

  it('o botão leva empresa e carga no nome, aria-expanded e aria-controls', async () => {
    const aoAlternar = jest.fn();
    await renderizar({ idConversa: 'conversa-1', aoAlternarConversa: aoAlternar });
    const botao = screen.getByRole('button', {
      name: /^Abrir conversa com Transportes Rápidos LTDA sobre Grãos, enviada em \d{2}\/\d{2}\/\d{4}/,
    });
    expect(botao).toBeCollapsed();
    expect(botao.props['aria-controls']).toBe('conversa-1');
    await fireEvent.press(botao);
    expect(aoAlternar).toHaveBeenCalledTimes(1);
  });

  it('o painel só aparece com a conversa aberta', async () => {
    const props = {
      idConversa: 'conversa-1',
      aoAlternarConversa: jest.fn(),
      conversa: <Texto>painel da conversa</Texto>,
    };
    await renderizar(props);
    expect(screen.queryByText('painel da conversa')).toBeNull();
  });

  it('aberta: mostra o painel e "Fechar conversa"', async () => {
    await renderizar({
      conversaAberta: true,
      idConversa: 'conversa-1',
      aoAlternarConversa: jest.fn(),
      conversa: <Texto>painel da conversa</Texto>,
    });
    expect(screen.getByText('painel da conversa')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', {
        name: /^Fechar conversa com Transportes Rápidos LTDA sobre Grãos, enviada em /,
      }),
    ).toBeExpanded();
  });
});
