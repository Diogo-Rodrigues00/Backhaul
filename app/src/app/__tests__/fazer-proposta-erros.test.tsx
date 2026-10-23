// Fazer proposta: erros do POST /propostas (MVP-13, CT-03). Cada resposta da API tem o seu
// tratamento: 409 de contraproposta, 409 de carga fechada, 403, 404 e falha genérica.
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar, ler } from '@/lib/armazenamento';
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

import { cargaProximaNormal, cargasProximasMock } from '../../../mocks/fixtures/cargas';
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

const CARGA = 'Grãos';
const ACEITAR = 'Aceitar R$ 4.200,50';

async function enviarContraproposta(valor = '3000') {
  await abrirComLista();
  await abrirContraproposta(CARGA);
  await fireEvent.changeText(screen.getByLabelText('Valor proposto (R$)'), valor);
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar contraproposta' }));
}

describe('Fazer proposta: erros', () => {
  it('409 "contraproposta única": mostra a mensagem no cartão, fecha o diálogo e a opção some', async () => {
    const mensagem = 'você já fez a contraproposta única para esta carga';
    espiarPropostas(() => respostaErro(409, mensagem));
    const anuncios = ouvirAnunciosDoTeste();
    await enviarContraproposta();

    await waitFor(() => expect(cartaoDa(CARGA).getByText(mensagem)).toBeOnTheScreen());
    await waitFor(() => expect(dialogos()).toHaveLength(0));
    expect(cartaoDa(CARGA).queryByRole('button', { name: /^Contraproposta/ })).toBeNull();
    expect(cartaoDa(CARGA).queryByText('Só uma contraproposta por carga.')).toBeNull();
    // "Aceitar" continua: a carga não tem proposta pendente.
    expect(botaoDoCartao(CARGA, ACEITAR)).toBeOnTheScreen();
    expect(anuncios.mensagens).toContain(mensagem);
    // A carga não virou "Proposta enviada": nada foi aceito pela API.
    expect(cartaoDa(CARGA).queryByText('Proposta enviada')).toBeNull();
    anuncios.parar();
  });

  it('409 "carga não está mais aberta": mostra a mensagem e recarrega a lista de cargas', async () => {
    const mensagem = 'carga não está mais aberta para propostas';
    espiarPropostas(() => respostaErro(409, mensagem));
    let leituras = 0;
    servidor.use(
      http.get(urlMock('/cargas/proximas'), () => {
        leituras += 1;
        // Na recarga a carga já saiu da lista.
        const cargas =
          leituras === 1
            ? cargasProximasMock
            : cargasProximasMock.filter((c) => c.id !== cargaProximaNormal.id);
        return HttpResponse.json({ cargas });
      }),
    );
    await abrirComLista();
    await abrirAceite(CARGA, ACEITAR);
    await fireEvent.press(screen.getByRole('button', { name: ACEITAR }));

    expect(await screen.findByText(`${mensagem} A lista foi atualizada.`)).toBeOnTheScreen();
    expect(screen.getByText('Carga indisponível')).toBeOnTheScreen();
    await waitFor(() => expect(leituras).toBeGreaterThanOrEqual(2));
    await waitFor(() => expect(screen.queryByRole('heading', { name: CARGA })).toBeNull());
    expect(dialogos()).toHaveLength(0);
  });

  it('403 sem a certificação exigida: mostra a mensagem da API no cartão, sem o link de disponibilidades', async () => {
    const mensagem = 'motorista sem a certificação exigida';
    espiarPropostas(() => respostaErro(403, mensagem));
    await abrirComLista();
    await abrirAceite(CARGA, ACEITAR);
    await fireEvent.press(screen.getByRole('button', { name: ACEITAR }));

    await waitFor(() => expect(cartaoDa(CARGA).getByText(mensagem)).toBeOnTheScreen());
    expect(cartaoDa(CARGA).queryByRole('link', { name: 'Minhas disponibilidades' })).toBeNull();
    // Dá para tentar de novo com outra carga ou depois: os botões continuam.
    expect(botaoDoCartao(CARGA, ACEITAR)).toBeOnTheScreen();
    expect(await ler(CHAVES.propostasEnviadas)).toBeNull();
  });

  it('404 "disponibilidade não encontrada": mensagem e link para Minhas disponibilidades', async () => {
    const mensagem = 'disponibilidade não encontrada';
    espiarPropostas(() => respostaErro(404, mensagem));
    await abrirComLista();
    await abrirAceite(CARGA, ACEITAR);
    await fireEvent.press(screen.getByRole('button', { name: ACEITAR }));

    await waitFor(() => expect(cartaoDa(CARGA).getByText(mensagem)).toBeOnTheScreen());
    const link = cartaoDa(CARGA).getByRole('link', { name: 'Minhas disponibilidades' });
    expect(link.props.href).toBe('/motorista/disponibilidades');
  });

  it('404 "carga não encontrada": trata como carga indisponível e recarrega a lista', async () => {
    espiarPropostas(() => respostaErro(404, 'carga não encontrada'));
    await abrirComLista();
    await abrirAceite(CARGA, ACEITAR);
    await fireEvent.press(screen.getByRole('button', { name: ACEITAR }));

    expect(await screen.findByText('Carga indisponível')).toBeOnTheScreen();
    expect(screen.queryByRole('link', { name: 'Minhas disponibilidades' })).toBeNull();
  });

  it('400 do servidor: a mensagem aparece dentro do diálogo, que continua aberto', async () => {
    espiarPropostas(() =>
      HttpResponse.json(
        { erros: ['valor_proposto deve ser um número maior que zero'] },
        { status: 400 },
      ),
    );
    await enviarContraproposta();

    expect(
      await screen.findByText('valor_proposto deve ser um número maior que zero'),
    ).toBeOnTheScreen();
    expect(dialogos()).toHaveLength(1);
    expect(screen.getByLabelText('Valor proposto (R$)').props.value).toBe('3000');
  });

  it('500 com HTML: mostra "Algo deu errado. Tente de novo." sem HTML e permite reenviar', async () => {
    let falhar = true;
    const recebidos = espiarPropostas(() => (falhar ? respostaHtml(500) : respostaCriada()));
    await abrirComLista();
    await abrirAceite(CARGA, ACEITAR);
    await fireEvent.press(screen.getByRole('button', { name: ACEITAR }));

    expect(await screen.findByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    expect(screen.queryByText(/Internal Server Error/)).toBeNull();
    expect(dialogos()).toHaveLength(1);

    falhar = false;
    await fireEvent.press(screen.getByRole('button', { name: ACEITAR }));
    await waitFor(() => expect(cartaoDa(CARGA).getByText('Proposta enviada')).toBeOnTheScreen());
    expect(recebidos).toHaveLength(2);
  });

  it('depois do 409 de contraproposta, um novo aceite ainda pode ser feito e o aviso fica', async () => {
    const mensagem = 'você já fez a contraproposta única para esta carga';
    espiarPropostas(() => respostaErro(409, mensagem));
    await enviarContraproposta();
    await waitFor(() => expect(cartaoDa(CARGA).getByText(mensagem)).toBeOnTheScreen());

    await aguardarAcoes(CARGA);
    await fireEvent.press(botaoDoCartao(CARGA, ACEITAR));
    await screen.findByRole('heading', { name: 'Aceitar o valor oferecido?' });
    // O aviso que explica o sumiço da contraproposta continua enquanto a opção não volta.
    expect(cartaoDa(CARGA).getByText(mensagem)).toBeOnTheScreen();
    expect(linkPorNome('Trocar disponibilidade')).toBeOnTheScreen();
  });
});

function respostaCriada() {
  return HttpResponse.json(
    {
      proposta: {
        id: 'bbbbbbbb-0000-4000-8000-0000000000f2',
        chamado_carga_id: cargaProximaNormal.id,
        chamado_disp_id: 'dddddddd-0000-4000-8000-000000000001',
        tipo: 'aceite',
        valor_proposto: 4200.5,
        status: 'pendente',
        criado_em: '2026-10-22T12:00:00.000Z',
      },
    },
    { status: 201 },
  );
}
