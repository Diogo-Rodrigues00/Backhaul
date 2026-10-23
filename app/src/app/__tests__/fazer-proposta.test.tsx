// Fazer proposta (MVP-13, card 025, D-PO-05, D-PO-08, D-PO-14, CT-01): aceite e contraproposta nos
// cartões de "Cargas próximas", com a API de mock (MSW). Os erros ficam em
// `fazer-proposta-erros.test.tsx`.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
import { lerListaPropostasEnviadas } from '@/lib/propostasEnviadas';
import { linkPorNome } from '@/test-utils/cenarioCargasProximas';
import {
  abrirAceite,
  abrirComLista,
  abrirContraproposta,
  aguardarAcoes,
  botaoDoCartao,
  cartaoDa,
  dialogos,
  espiarPropostas,
  ouvirAnunciosDoTeste,
} from '@/test-utils/cenarioFazerProposta';

import { CARGA_NORMAL_ID, CARGA_URGENTE_ID } from '../../../mocks/fixtures/cargas';
import { DISPONIBILIDADE_ABERTA_ID } from '../../../mocks/fixtures/disponibilidades';
import { servidor, urlMock } from '../../../mocks/node';
import { respostaErro, respostaHtml } from '../../../mocks/respostas';

jest.mock('@/lib/armazenamento', () => {
  const memoria = new Map<string, string>();
  return {
    CHAVES: {
      token: 'backhaul.token',
      tema: 'backhaul.tema',
      disponibilidadeAtiva: 'backhaul.disponibilidadeAtiva',
      propostasEnviadas: 'backhaul.propostasEnviadas',
    },
    ler: jest.fn(async (chave: string) => memoria.get(chave) ?? null),
    gravar: jest.fn(async (chave: string, valor: string) => void memoria.set(chave, valor)),
    apagar: jest.fn(async (chave: string) => void memoria.delete(chave)),
  };
});

beforeEach(async () => {
  await apagar(CHAVES.token);
  await apagar(CHAVES.disponibilidadeAtiva);
  await apagar(CHAVES.propostasEnviadas);
  await gravar(CHAVES.token, 'mock-motorista');
});

// "Grãos" (normal, R$ 4.200,50) não tem proposta na fixture; "Produtos inflamáveis" tem pendente.
const CARGA = 'Grãos';
const ACEITAR = 'Aceitar R$ 4.200,50';

describe('Fazer proposta: botões do cartão', () => {
  it('cada carga sem proposta mostra "Aceitar R$ X" e "Contraproposta" com a carga no nome', async () => {
    await abrirComLista();
    await aguardarAcoes(CARGA);

    // O nome acessível completo identifica a carga entre as dez da lista.
    expect(
      cartaoDa(CARGA).getByRole('button', {
        name: 'Aceitar R$ 4.200,50 pela carga Grãos, Araguari - MG → Uberlândia - MG',
      }),
    ).toBeOnTheScreen();
    expect(
      cartaoDa(CARGA).getByRole('button', {
        name: 'Contraproposta para Grãos, Araguari - MG → Uberlândia - MG',
      }),
    ).toBeOnTheScreen();
    // O texto visível é o começo do nome acessível (WCAG 2.5.3).
    expect(cartaoDa(CARGA).getByText('Contraproposta')).toBeOnTheScreen();
    // Aviso antes do envio (MVP-13).
    expect(cartaoDa(CARGA).getByText('Só uma contraproposta por carga.')).toBeOnTheScreen();
  });

  it('carga com proposta pendente mostra só "Proposta enviada", sem botões (D-PO-05)', async () => {
    await abrirComLista();
    await aguardarAcoes(CARGA);

    const pendente = cartaoDa('Produtos inflamáveis');
    expect(pendente.getByText('Proposta enviada')).toBeOnTheScreen();
    expect(pendente.queryByRole('button')).toBeNull();
  });

  it('depois de uma contraproposta recusada, some "Contraproposta" e "Aceitar" continua (D-PO-05)', async () => {
    servidor.use(
      http.get(urlMock('/propostas/minhas'), () =>
        HttpResponse.json({
          propostas: [
            {
              id: 'bbbbbbbb-0000-4000-8000-0000000000a1',
              tipo: 'contraproposta',
              valor_proposto: 3900,
              status: 'recusada',
              criado_em: '2026-10-21T12:00:00.000Z',
              disponibilidade_id: DISPONIBILIDADE_ABERTA_ID,
              carga: {
                id: CARGA_NORMAL_ID,
                tipo_carga: CARGA,
                empresa: 'Transportes Rápidos LTDA',
                origem: { lat: -18.6456, lng: -48.1935 },
                destino: { lat: -18.9186, lng: -48.2772 },
                valor_oferecido: 4200.5,
                urgencia: 'normal',
                status: 'aberto',
                certificacao_exigida: null,
                expira_em: '2030-01-01T00:00:00.000Z',
              },
            },
          ],
        }),
      ),
    );
    await abrirComLista();
    await aguardarAcoes(CARGA);

    expect(cartaoDa(CARGA).queryByRole('button', { name: /^Contraproposta/ })).toBeNull();
    expect(cartaoDa(CARGA).queryByText('Só uma contraproposta por carga.')).toBeNull();
    expect(botaoDoCartao(CARGA, ACEITAR)).toBeOnTheScreen();
  });

  it('sem GET /propostas/minhas (404), a contraproposta guardada neste aparelho esgota a opção', async () => {
    servidor.use(
      http.get(urlMock('/propostas/minhas'), () =>
        HttpResponse.json({ erro: 'rota não encontrada' }, { status: 404 }),
      ),
    );
    await gravar(
      CHAVES.propostasEnviadas,
      JSON.stringify([
        { cargaId: CARGA_NORMAL_ID, enviadaEm: '2026-10-21T12:00:00.000Z', tipo: 'contraproposta' },
      ]),
    );
    await abrirComLista();

    // Pendente guardada para a carga: só "Proposta enviada".
    await waitFor(() => expect(cartaoDa(CARGA).getByText('Proposta enviada')).toBeOnTheScreen());
    expect(cartaoDa(CARGA).queryByRole('button')).toBeNull();
  });
});

// Contra a API real a rota 4a (GET /propostas/minhas) ainda não existe: os botões têm de aparecer
// mesmo assim, e a carga já proposta neste aparelho continua só com "Proposta enviada".
describe('Fazer proposta: sem GET /propostas/minhas', () => {
  it.each([
    ['404 com HTML do Express', () => respostaHtml(404)],
    ['500', () => respostaErro(500, 'erro interno')],
    ['falha de rede', () => HttpResponse.error()],
  ])('%s: os botões aparecem e a carga já proposta segue marcada', async (_nome, resposta) => {
    servidor.use(http.get(urlMock('/propostas/minhas'), resposta));
    await gravar(
      CHAVES.propostasEnviadas,
      JSON.stringify([
        { cargaId: CARGA_URGENTE_ID, enviadaEm: '2026-10-21T12:00:00.000Z', tipo: 'aceite' },
      ]),
    );
    await abrirComLista();
    await aguardarAcoes(CARGA);

    expect(botaoDoCartao(CARGA, ACEITAR)).toBeOnTheScreen();
    expect(botaoDoCartao(CARGA, 'Contraproposta')).toBeOnTheScreen();
    const proposta = cartaoDa('Produtos inflamáveis');
    expect(proposta.getByText('Proposta enviada')).toBeOnTheScreen();
    expect(proposta.queryByRole('button')).toBeNull();
  });

  it('a carga já proposta nunca mostra botões, nem enquanto o aparelho é lido', async () => {
    servidor.use(http.get(urlMock('/propostas/minhas'), () => respostaHtml(404)));
    await gravar(
      CHAVES.propostasEnviadas,
      JSON.stringify([
        { cargaId: CARGA_URGENTE_ID, enviadaEm: '2026-10-21T12:00:00.000Z', tipo: 'aceite' },
      ]),
    );
    await abrirComLista();
    await aguardarAcoes(CARGA);
    // Os botões só surgem juntos, depois de saber quem já tem proposta.
    expect(cartaoDa('Produtos inflamáveis').queryByRole('button')).toBeNull();
  });
});

describe('Fazer proposta: aceite', () => {
  it('pede confirmação e envia { chamado_carga_id, chamado_disp_id, tipo: "aceite" } sem valor', async () => {
    const recebidos = espiarPropostas();
    const anuncios = ouvirAnunciosDoTeste();
    await abrirComLista();
    await abrirAceite(CARGA, ACEITAR);

    // D-PO-08: nada foi enviado antes da confirmação.
    expect(recebidos).toHaveLength(0);
    expect(
      screen.getByText(/Você faz o frete Grãos, Araguari - MG → Uberlândia - MG/),
    ).toBeOnTheScreen();
    expect(dialogos()).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: ACEITAR }));

    await waitFor(() => expect(cartaoDa(CARGA).getByText('Proposta enviada')).toBeOnTheScreen());
    expect(recebidos).toEqual([
      {
        chamado_carga_id: CARGA_NORMAL_ID,
        chamado_disp_id: DISPONIBILIDADE_ABERTA_ID,
        tipo: 'aceite',
      },
    ]);
    expect(recebidos[0]).not.toHaveProperty('valor_proposto');
    expect(anuncios.mensagens).toContain('Proposta enviada');
    expect(cartaoDa(CARGA).queryByRole('button')).toBeNull();
    anuncios.parar();
  });

  it('guarda a proposta no aparelho (plano B de D-PO-05) e fecha o diálogo', async () => {
    espiarPropostas();
    await abrirComLista();
    await abrirAceite(CARGA, ACEITAR);
    await fireEvent.press(screen.getByRole('button', { name: ACEITAR }));

    await waitFor(() => expect(cartaoDa(CARGA).getByText('Proposta enviada')).toBeOnTheScreen());
    // O diálogo só fecha depois de a proposta ser guardada.
    await waitFor(() => expect(dialogos()).toHaveLength(0));
    const guardadas = lerListaPropostasEnviadas(await ler(CHAVES.propostasEnviadas));
    expect(guardadas).toEqual([
      expect.objectContaining({ cargaId: CARGA_NORMAL_ID, tipo: 'aceite' }),
    ]);
  });

  it('Cancelar fecha o diálogo sem enviar e os botões continuam', async () => {
    const recebidos = espiarPropostas();
    await abrirComLista();
    await abrirAceite(CARGA, ACEITAR);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(dialogos()).toHaveLength(0));
    expect(recebidos).toHaveLength(0);
    expect(botaoDoCartao(CARGA, ACEITAR)).toBeOnTheScreen();
  });

  it('CT-01: clicar duas vezes em confirmar gera uma só requisição', async () => {
    const recebidos = espiarPropostas(undefined, 150);
    await abrirComLista();
    await abrirAceite(CARGA, ACEITAR);

    const confirmar = screen.getByRole('button', { name: ACEITAR });
    await fireEvent.press(confirmar);
    await fireEvent.press(confirmar);

    await waitFor(() => expect(cartaoDa(CARGA).getByText('Proposta enviada')).toBeOnTheScreen());
    expect(recebidos).toHaveLength(1);
  });
});

describe('Fazer proposta: contraproposta', () => {
  it('avisa que é única antes do envio, no diálogo e no campo, e envia o valor como número', async () => {
    const recebidos = espiarPropostas();
    const anuncios = ouvirAnunciosDoTeste();
    await abrirComLista();
    await abrirContraproposta(CARGA);

    // Aviso na descrição do diálogo e na ajuda do campo (aria-describedby).
    expect(
      screen.getByText(
        /Você só pode enviar uma contraproposta para esta carga\. Depois de enviada/,
      ),
    ).toBeOnTheScreen();
    const campo = screen.getByLabelText('Valor proposto (R$)');
    expect(campo.props['aria-describedby']).toBeTruthy();
    expect(campo.props.inputMode).toBe('decimal');
    expect(
      screen.getAllByText('Você só pode enviar uma contraproposta para esta carga.'),
    ).toHaveLength(1);

    await fireEvent.changeText(campo, '3.200,50');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar contraproposta' }));

    await waitFor(() => expect(cartaoDa(CARGA).getByText('Proposta enviada')).toBeOnTheScreen());
    expect(recebidos).toEqual([
      {
        chamado_carga_id: CARGA_NORMAL_ID,
        chamado_disp_id: DISPONIBILIDADE_ABERTA_ID,
        tipo: 'contraproposta',
        valor_proposto: 3200.5,
      },
    ]);
    expect(typeof recebidos[0]?.valor_proposto).toBe('number');
    expect(anuncios.mensagens).toContain('Proposta enviada');
    await waitFor(() => expect(dialogos()).toHaveLength(0));
    const guardadas = lerListaPropostasEnviadas(await ler(CHAVES.propostasEnviadas));
    expect(guardadas).toEqual([
      expect.objectContaining({ cargaId: CARGA_NORMAL_ID, tipo: 'contraproposta' }),
    ]);
    anuncios.parar();
  });

  it.each([
    ['', 'Informe o valor da contraproposta.'],
    ['0', 'Informe um número maior que zero.'],
    ['0,00', 'Informe um número maior que zero.'],
    ['-5', 'Informe um número maior que zero.'],
    ['abc', 'Informe um número maior que zero.'],
    ['1.234', 'Use vírgula para decimais e sem ponto de milhar (ex.: 1234 ou 1234,5).'],
  ])('valor "%s" é bloqueado no campo, sem enviar (D-PO-14)', async (digitado, mensagem) => {
    const recebidos = espiarPropostas();
    await abrirComLista();
    await abrirContraproposta(CARGA);

    await fireEvent.changeText(screen.getByLabelText('Valor proposto (R$)'), digitado);
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar contraproposta' }));

    expect(await screen.findByText(mensagem)).toBeOnTheScreen();
    expect(screen.getByLabelText('Valor proposto (R$)').props['aria-invalid']).toBe(true);
    expect(recebidos).toHaveLength(0);
    expect(dialogos()).toHaveLength(1);

    // Corrigir o texto limpa o erro.
    await fireEvent.changeText(screen.getByLabelText('Valor proposto (R$)'), '3200');
    await waitFor(() => expect(screen.queryByText(mensagem)).toBeNull());
  });

  it('reabrir o diálogo começa com o campo limpo', async () => {
    espiarPropostas();
    await abrirComLista();
    await abrirContraproposta(CARGA);
    await fireEvent.changeText(screen.getByLabelText('Valor proposto (R$)'), '3000');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(dialogos()).toHaveLength(0));

    await abrirContraproposta(CARGA);
    expect(screen.getByLabelText('Valor proposto (R$)').props.value).toBe('');
  });

  it('o aceite não mostra campo de valor', async () => {
    await abrirComLista();
    await abrirAceite(CARGA, ACEITAR);

    expect(screen.queryByLabelText('Valor proposto (R$)')).toBeNull();
    expect(linkPorNome('Trocar disponibilidade')).toBeOnTheScreen();
  });
});
