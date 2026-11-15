// Meus fretes do motorista (card 044): origem e destino em texto nos cartões e nenhuma comissão nem Pix
// na tela, mesmo que a API os mande. Tela real com MSW (mesmo arranjo de motorista-fretes.test.tsx).
import { QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { renderRouter, screen, configure } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { CascaContext } from '@/components/organisms/useCasca';
import { TemaContext } from '@/state/tema/TemaProvider';
import { valorDoTema } from '@/test-utils/renderComTema';

import { fretesDoMotoristaMock } from '../../../mocks/fixtures/fretes';
import { servidor, urlMock } from '../../../mocks/node';
import { criarClienteDeTeste, entrarComoMock, sairDoMock } from '../../../mocks/utils-teste';
import MeusFretes from '../motorista/fretes';

// O Jest não executa import() dinâmico: o corpo da tela (React.lazy) vem de um módulo falso.
jest.mock('@/telas/CorpoMeusFretesMotorista.carregar', () => ({
  carregarCorpoMeusFretesMotorista: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoMeusFretesMotorista')),
}));
jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));

configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

const CASCA = { cabecalho: null, abas: undefined, habilitado: true };

function Tela() {
  return (
    <CascaContext.Provider value={CASCA}>
      <MeusFretes />
    </CascaContext.Provider>
  );
}

async function abrir() {
  entrarComoMock('mock-motorista', () => undefined);
  const cliente = criarClienteDeTeste();
  function Raiz() {
    return (
      <TemaContext.Provider value={valorDoTema('light')}>
        <QueryClientProvider client={cliente}>
          <Slot />
        </QueryClientProvider>
      </TemaContext.Provider>
    );
  }
  await renderRouter(
    { _layout: Raiz, 'motorista/fretes': Tela },
    { initialUrl: '/motorista/fretes' },
  );
}

const CODIGO_PIX = '00020126-codigo-que-nao-pode-aparecer';

/** A API (por engano) manda comissão e Pix ao motorista: a tela não pode mostrar nada disso. */
function listaComComissaoEPix() {
  servidor.use(
    http.get(urlMock('/fretes/meus'), () =>
      HttpResponse.json({
        fretes: fretesDoMotoristaMock.map((frete) => ({
          ...frete,
          comissao: { percentual_comissao: 5, valor_comissao: 175, status_pagamento: 'pendente' },
          pix_copia_cola: CODIGO_PIX,
          pix_expira_em: new Date(Date.now() + 30 * 60_000).toISOString(),
        })),
      }),
    ),
  );
}

describe('Meus fretes (motorista): origem, destino e sem comissão (card 044)', () => {
  afterEach(() => sairDoMock());

  it('mostra origem e destino em texto em cada cartão, com o nome da cidade da lista', async () => {
    await abrir();
    await screen.findByRole('heading', { name: 'Grãos' });
    // "Coleta em" e "Entrega em" são os rótulos do LinhaRota (texto, não só cor ou seta).
    expect(screen.getAllByText('Coleta em')).toHaveLength(3);
    expect(screen.getAllByText('Entrega em')).toHaveLength(3);
    expect(screen.getAllByText('Uberlândia - MG').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Uberaba - MG')).toBeOnTheScreen();
    expect(screen.getByText('Araguari - MG')).toBeOnTheScreen();
  });

  it('destino fora da lista fixa (São Paulo) mostra as coordenadas em texto', async () => {
    await abrir();
    await screen.findByRole('heading', { name: 'Grãos' });
    expect(screen.getByText('Lat -23,5500, Lng -46,6300')).toBeOnTheScreen();
  });

  it('não mostra comissão, percentual nem Pix, nem com a API enviando esses campos', async () => {
    listaComComissaoEPix();
    await abrir();
    await screen.findByRole('heading', { name: 'Grãos' });
    // A lista carregou (há origem em texto); só então confere a ausência.
    expect(screen.getAllByText('Coleta em')).toHaveLength(3);

    expect(screen.queryByText(/comiss/i)).toBeNull();
    expect(screen.queryByText(/Pagamento por Pix/)).toBeNull();
    expect(screen.queryByText(CODIGO_PIX)).toBeNull();
    expect(screen.queryByText(/5%/)).toBeNull();
    expect(screen.queryByText('R$ 175,00')).toBeNull();
  });
});
