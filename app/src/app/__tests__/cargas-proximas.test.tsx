// Cargas próximas do motorista (MVP-12, D-PO-03/05, CT-01/07/10). Tela real na área protegida, com a
// API de mock (MSW) nos formatos de docs/api.md e da proposta 4a/4b. Estados e erros ficam em
// `cargas-proximas-estados.test.tsx`; "Atualizar" em `cargas-proximas-atualizar.test.tsx`.
import { screen, waitFor, within } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';

import { apagar, CHAVES, gravar } from '@/lib/armazenamento';
import {
  abrirCargasProximas,
  aguardarLista,
  aguardarSessao,
  cartoes,
  linkPorNome,
  titulosDosCartoes,
} from '@/test-utils/cenarioCargasProximas';

import {
  cargaProximaNormal,
  cargaProximaUrgente,
  cargasProximasMock,
} from '../../../mocks/fixtures/cargas';
import { servidor, urlMock } from '../../../mocks/node';

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
// O Jest não executa import() dinâmico: o corpo da tela (React.lazy) vem de um módulo falso.
jest.mock('@/telas/CorpoCargasProximas.carregar', () => ({
  carregarCorpoCargasProximas: () =>
    Promise.resolve(jest.requireActual('@/telas/CorpoCargasProximas')),
}));

beforeEach(async () => {
  await apagar(CHAVES.token);
  await apagar(CHAVES.disponibilidadeAtiva);
  await apagar(CHAVES.propostasEnviadas);
  await gravar(CHAVES.token, 'mock-motorista');
});

async function abrirComLista() {
  await abrirCargasProximas();
  await aguardarSessao();
  await aguardarLista();
}

describe('Cargas próximas', () => {
  it('mostra o h1, a barra de contexto e "Atualizar" com a lista pronta', async () => {
    await abrirComLista();

    const h1 = screen.getByRole('heading', { name: 'Cargas próximas' });
    expect(h1.props['aria-level']).toBe(1);
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
    expect(
      screen.getByText(/Buscando perto de Uberlândia - MG, raio de 80 km, até /),
    ).toBeOnTheScreen();
    expect(linkPorNome('Trocar disponibilidade').props.href).toBe('/motorista/disponibilidades');
    expect(screen.getByText(/Ordem: urgência primeiro/)).toBeOnTheScreen();
  });

  it('D-PO-03: a busca usa lat, lng e raio_km da disponibilidade ativa', async () => {
    let consulta = '';
    servidor.use(
      http.get(urlMock('/cargas/proximas'), ({ request }) => {
        consulta = new URL(request.url).search;
        return HttpResponse.json({ cargas: cargasProximasMock });
      }),
    );
    await abrirComLista();

    // Ativa de mock: Uberlândia, raio de 80 km.
    expect(consulta).toBe('?lat=-18.9186&lng=-48.2772&raio_km=80');
  });

  it('MVP-12: a ordem é exatamente a da API, sem reordenar', async () => {
    // A API manda normal, crítico, urgente: o front não "corrige" para crítico, urgente, normal.
    const [critica, , urgente] = cargasProximasMock;
    servidor.use(
      http.get(urlMock('/cargas/proximas'), () =>
        HttpResponse.json({ cargas: [cargaProximaNormal, critica, urgente] }),
      ),
    );
    await abrirComLista();

    expect(titulosDosCartoes()).toEqual([
      cargaProximaNormal.tipo_carga,
      critica!.tipo_carga,
      urgente!.tipo_carga,
    ]);
  });

  it('a lista de exemplo (10 cargas) aparece inteira na ordem do contrato', async () => {
    await abrirComLista();

    expect(cartoes()).toHaveLength(10);
    expect(titulosDosCartoes()).toEqual(cargasProximasMock.map((carga) => carga.tipo_carga));
    // Urgência antes de distância: crítico primeiro, normal por último.
    expect(cargasProximasMock.map((carga) => carga.urgencia)).toEqual([
      'critico',
      'critico',
      'urgente',
      'urgente',
      'urgente',
      'normal',
      'normal',
      'normal',
      'normal',
      'normal',
    ]);
  });

  it('cada carga mostra urgência, tipo, empresa, distância, rota, peso, valor, certificação e prazo', async () => {
    await abrirComLista();

    const cartao = cartoes().find(
      (el) => within(el).queryByRole('heading', { name: cargaProximaUrgente.tipo_carga }) !== null,
    );
    expect(cartao).toBeDefined();
    const dentro = within(cartao!);
    expect(dentro.getByText('Urgente')).toBeOnTheScreen();
    expect(dentro.getByText('Transportes Rápidos LTDA')).toBeOnTheScreen();
    expect(dentro.getByText('12,4 km')).toBeOnTheScreen();
    expect(dentro.getByText('Uberlândia - MG')).toBeOnTheScreen();
    expect(dentro.getByText('Uberaba - MG')).toBeOnTheScreen();
    expect(dentro.getByLabelText('Peso: 8.000 kg')).toBeOnTheScreen();
    expect(dentro.getByText('R$ 3.500,00')).toBeOnTheScreen();
    expect(dentro.getByText('Exige MOPP - Classe 3 Inflamáveis')).toBeOnTheScreen();
    expect(dentro.getByText('Expira em')).toBeOnTheScreen();
  });

  it('carga sem exigência mostra "Sem exigência"', async () => {
    await abrirComLista();

    const cartao = cartoes().find(
      (el) => within(el).queryByRole('heading', { name: 'Grãos' }) !== null,
    );
    expect(within(cartao!).getByText('Sem exigência')).toBeOnTheScreen();
    expect(within(cartao!).getByText('48,9 km')).toBeOnTheScreen();
  });

  it('motorista sem MOPP: a API já filtra e a tela não mostra carga que exige MOPP (MVP-12)', async () => {
    const semExigencia = cargasProximasMock.filter((carga) => carga.certificacao_exigida === null);
    servidor.use(
      http.get(urlMock('/cargas/proximas'), () => HttpResponse.json({ cargas: semExigencia })),
    );
    await abrirComLista();

    expect(cartoes()).toHaveLength(semExigencia.length);
    expect(semExigencia.length).toBeLessThan(cargasProximasMock.length);
    expect(screen.queryByText(/Exige MOPP/)).toBeNull();
  });

  it('o selo de urgência vem antes do tipo da carga em cada cartão', async () => {
    await abrirComLista();

    const [primeiro] = cartoes();
    const texto = JSON.stringify(primeiro);
    expect(texto.indexOf('Urgência: ')).toBeGreaterThan(-1);
    expect(texto.indexOf('Urgência: ')).toBeLessThan(
      texto.indexOf(cargasProximasMock[0]!.tipo_carga),
    );
  });

  describe('D-PO-05: "Proposta enviada"', () => {
    it('com proposta pendente do motorista (GET /propostas/minhas), marca a carga e só ela', async () => {
      await abrirComLista();

      // A fixture 4a tem pendente para "Produtos inflamáveis"; "Grãos" já foi aceita.
      await waitFor(() => expect(screen.getAllByText('Proposta enviada')).toHaveLength(1));
      const cartao = cartoes().find(
        (el) =>
          within(el).queryByRole('heading', { name: cargaProximaUrgente.tipo_carga }) !== null,
      );
      expect(within(cartao!).getByText('Proposta enviada')).toBeOnTheScreen();
      expect(within(cartao!).queryByRole('button', { name: /Aceitar|Contraproposta/ })).toBeNull();
    });

    it('proposta recusada ou aceita não marca a carga', async () => {
      servidor.use(
        http.get(urlMock('/propostas/minhas'), () =>
          HttpResponse.json({
            propostas: [
              {
                id: 'bbbbbbbb-0000-4000-8000-0000000000aa',
                tipo: 'aceite',
                valor_proposto: 4200.5,
                status: 'recusada',
                criado_em: '2026-10-21T12:00:00.000Z',
                disponibilidade_id: 'dddddddd-0000-4000-8000-000000000001',
                carga: {
                  id: cargaProximaNormal.id,
                  tipo_carga: cargaProximaNormal.tipo_carga,
                  empresa: cargaProximaNormal.empresa,
                  origem: cargaProximaNormal.origem,
                  destino: cargaProximaNormal.destino,
                  valor_oferecido: cargaProximaNormal.valor_oferecido,
                  urgencia: cargaProximaNormal.urgencia,
                  status: 'aberto',
                  certificacao_exigida: null,
                  expira_em: cargaProximaNormal.expira_em,
                },
              },
            ],
          }),
        ),
      );
      await abrirComLista();

      await waitFor(() => expect(titulosDosCartoes()).toHaveLength(10));
      expect(screen.queryByText('Proposta enviada')).toBeNull();
    });
  });
});
