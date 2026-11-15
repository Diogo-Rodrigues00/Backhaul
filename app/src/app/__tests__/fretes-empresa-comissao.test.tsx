// Meus fretes da empresa (card 044): a comissão vem de `GET /fretes/meus` e por isso não some ao recarregar
// a página; `comissao: null` não inventa nada; origem e destino aparecem em texto; o Pix que a lista traz
// (copia e cola e validade, sem QR) aparece com o pagamento pendente. O fluxo do POST segue em
// `fretes-empresa-pix.test.tsx` e `fretes-empresa-pagar.test.tsx`.
import { configure, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirFretesDaEmpresa,
  aguardarLista,
  aguardarSessao,
} from '@/test-utils/cenarioFretesEmpresa';

import {
  FRETE_ACEITO_ID,
  FRETE_EM_TRANSITO_ID,
  fretesDaEmpresaComComissaoMock,
  fretesDaEmpresaMock,
} from '../../../mocks/fixtures/fretes';
import { servidor, urlMock } from '../../../mocks/node';

// Como nas telas de fretes com a API de mock: a montagem da área protegida passa do limite padrão.
configure({ asyncUtilTimeout: 8000 });
jest.setTimeout(30_000);

jest.mock('@/hooks/useLoopAnimado', () => ({
  useLoopAnimado: jest.fn(() => ({ interpolate: () => '0deg' })),
}));
jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  anunciar: jest.fn(),
  moverFoco: jest.fn(),
}));
jest.mock('@/lib/armazenamento', () => {
  const memoria = new Map<string, string>();
  return {
    CHAVES: {
      token: 'backhaul.token',
      tema: 'backhaul.tema',
      disponibilidadeAtiva: 'backhaul.disponibilidadeAtiva',
    },
    ler: jest.fn(async (chave: string) => memoria.get(chave) ?? null),
    gravar: jest.fn(async (chave: string, valor: string) => void memoria.set(chave, valor)),
    apagar: jest.fn(async (chave: string) => void memoria.delete(chave)),
  };
});

const CODIGO = '00020126580014br.gov.bcb.pix0136abc-lista-backhaul5204000053039865802BR6304ABCD';
const expiraEm = (minutos: number) => new Date(Date.now() + minutos * 60_000).toISOString();

beforeEach(async () => {
  await apagar(CHAVES.token);
  await gravar(CHAVES.token, 'mock-empresa');
});

async function abrir() {
  await abrirFretesDaEmpresa();
  await aguardarSessao();
  await aguardarLista();
}

/** A lista como a API devolve depois de pagos os fretes em trânsito e entregue (com comissão). */
function listaComComissaoPaga() {
  servidor.use(
    http.get(urlMock('/fretes/meus'), () =>
      HttpResponse.json({ fretes: fretesDaEmpresaComComissaoMock }),
    ),
  );
}

/** Lista da empresa com alterações só no frete indicado (os outros ficam como no mock). */
function listaCom(freteId: string, alteracao: Record<string, unknown>) {
  servidor.use(
    http.get(urlMock('/fretes/meus'), () =>
      HttpResponse.json({
        fretes: fretesDaEmpresaMock.map((frete) =>
          frete.id === freteId ? { ...frete, ...alteracao } : frete,
        ),
      }),
    ),
  );
}

describe('Meus fretes (empresa): comissão que vem da lista (card 044)', () => {
  it('recarga: a comissão já paga aparece ao abrir a tela, sem nenhum POST', async () => {
    // A lista traz a transação dos fretes pagos (5%): é o que a API devolve depois de recarregar.
    // Antes do card, a tela só mostrava a comissão logo após o pagamento.
    listaComComissaoPaga();
    await abrir();

    // Duas transações no mock (Grãos e Material), ambas com 5%: cada uma aparece no próprio cartão.
    expect(screen.getAllByText('Resumo do pagamento')).toHaveLength(2);
    expect(screen.getAllByLabelText('Percentual de comissão: 5%')).toHaveLength(2);
    expect(screen.getByLabelText('Comissão da plataforma: R$ 175,00')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão da plataforma: R$ 140,00')).toBeOnTheScreen();
    expect(screen.getAllByText('Pago, retido até a entrega').length).toBeGreaterThanOrEqual(1);
  });

  it('valores da comissão vêm da API: um percentual diferente é mostrado como veio', async () => {
    listaCom(FRETE_EM_TRANSITO_ID, {
      comissao: { percentual_comissao: 7.5, valor_comissao: 262.5, status_pagamento: 'retido' },
    });
    await abrir();

    expect(screen.getByLabelText('Percentual de comissão: 7,5%')).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão da plataforma: R$ 262,50')).toBeOnTheScreen();
  });

  it('comissao null (antes do pagamento): nada de comissão inventada e "Pagar frete" continua', async () => {
    // Padrão do mock: nenhum frete tem transação, então não há resumo nem comissão em lugar nenhum.
    await abrir();

    expect(screen.queryAllByText('Resumo do pagamento')).toHaveLength(0);
    expect(screen.queryByText(/Comissão da plataforma/)).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Pagar frete de Produtos inflamáveis' }),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('Aguardando pagamento').length).toBeGreaterThanOrEqual(1);
  });

  it('lista sem o campo comissao (resposta sem ele): a tela segue, sem comissão e com "Pagar frete"', async () => {
    servidor.use(
      http.get(urlMock('/fretes/meus'), () =>
        HttpResponse.json({
          fretes: fretesDaEmpresaMock.map(({ comissao: _semComissao, ...frete }) => frete),
        }),
      ),
    );
    await abrir();

    expect(
      screen.getByRole('button', { name: 'Pagar frete de Produtos inflamáveis' }),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/Comissão da plataforma/)).toBeNull();
  });

  it('comissao null só no frete sem pagamento: os pagos mostram a comissão e o aceito não', async () => {
    listaComComissaoPaga();
    await abrir();

    expect(screen.getAllByText('Resumo do pagamento')).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: 'Pagar frete de Produtos inflamáveis' }),
    ).toBeOnTheScreen();
  });

  it('pendente com Pix da lista: copia e cola, validade e comissão, sem QR (que só o POST traz)', async () => {
    listaCom(FRETE_ACEITO_ID, {
      comissao: { percentual_comissao: 5, valor_comissao: 160, status_pagamento: 'pendente' },
      status_pagamento: 'pendente',
      pix_copia_cola: CODIGO,
      pix_expira_em: expiraEm(30),
    });
    await abrir();

    expect(await screen.findByRole('heading', { name: 'Pagamento por Pix' })).toBeOnTheScreen();
    expect(screen.getByText(CODIGO)).toBeOnTheScreen();
    expect(screen.getByLabelText('Comissão da plataforma: R$ 160,00')).toBeOnTheScreen();
    // Sem QR: o texto manda só copiar o código (nunca "leia o QR Code") e há o botão para pedir o QR.
    expect(
      screen.getByText('Abra o app do seu banco, escolha Pix e cole o código abaixo.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Mostrar QR Code de Produtos inflamáveis' }),
    ).toBeOnTheScreen();
    expect(screen.queryByLabelText(/QR Code do Pix/)).toBeNull();
    expect(screen.getByText('Aguardando confirmação do pagamento…')).toBeOnTheScreen();
    // Pendente: sem "Pagar frete" de novo.
    expect(
      screen.queryByRole('button', { name: 'Pagar frete de Produtos inflamáveis' }),
    ).toBeNull();
  });

  it('pendente com validade vencida na lista: avisa que o Pix expirou, sem o código', async () => {
    listaCom(FRETE_ACEITO_ID, {
      comissao: { percentual_comissao: 5, valor_comissao: 160, status_pagamento: 'pendente' },
      status_pagamento: 'pendente',
      pix_copia_cola: CODIGO,
      pix_expira_em: expiraEm(-5),
    });
    await abrir();

    expect(await screen.findByText('Código Pix expirado')).toBeOnTheScreen();
    expect(screen.queryByText(CODIGO)).toBeNull();
  });

  it('origem e destino em texto em cada cartão, com o nome da cidade da lista', async () => {
    await abrir();

    expect(screen.getAllByText('Coleta em')).toHaveLength(3);
    expect(screen.getAllByText('Entrega em')).toHaveLength(3);
    expect(screen.getByText('Uberaba - MG')).toBeOnTheScreen();
    expect(screen.getByText('Latitude -23,5500, longitude -46,6300')).toBeOnTheScreen();
  });

  it('depois do POST, a lista (que agora traz a comissão) segue valendo ao recarregar', async () => {
    let pago = false;
    servidor.use(
      http.post(urlMock(`/fretes/${FRETE_ACEITO_ID}/pagamento`), () => {
        pago = true;
        return HttpResponse.json(
          {
            transacao: {
              id: 'tr-44',
              frete_id: FRETE_ACEITO_ID,
              valor_frete: 3200,
              percentual_comissao: 5,
              valor_comissao: 160,
              status_pagamento: 'retido',
              criado_em: new Date().toISOString(),
            },
          },
          { status: 201 },
        );
      }),
      http.get(urlMock('/fretes/meus'), () =>
        HttpResponse.json({
          fretes: fretesDaEmpresaMock.map((frete) =>
            frete.id === FRETE_ACEITO_ID && pago
              ? {
                  ...frete,
                  status_pagamento: 'retido',
                  comissao: {
                    percentual_comissao: 5,
                    valor_comissao: 160,
                    status_pagamento: 'retido',
                  },
                }
              : frete,
          ),
        }),
      ),
    );
    await abrir();
    fireEvent.press(screen.getByRole('button', { name: 'Pagar frete de Produtos inflamáveis' }));
    fireEvent.press(await screen.findByRole('button', { name: 'Pagar frete' }));

    // Atualização imediata com o resultado do POST; a próxima leitura da lista traz o mesmo valor.
    await waitFor(() =>
      expect(screen.getByLabelText('Comissão da plataforma: R$ 160,00')).toBeOnTheScreen(),
    );
    expect(await screen.findAllByText('Pago, retido até a entrega')).not.toHaveLength(0);
  });
});
