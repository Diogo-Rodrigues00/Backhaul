// Chunk da consulta de disponibilidades que não baixa (sem conexão): a área não cai. O provider
// degrada para o erro de sempre (que a tela mostra com "Tentar de novo") e a nova tentativa baixa o
// chunk de novo.
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

import { CascaContext } from '@/components/organisms/useCasca';

import { criarClienteDeTeste, entrarComoMock, sairDoMock } from '../../../mocks/utils-teste';
import { DisponibilidadeAtivaProvider } from './DisponibilidadeAtivaProvider';
import { useDisponibilidadeAtiva } from './useDisponibilidadeAtiva';

const mockCarregar = jest.fn();
jest.mock('./ConsultaDasDisponibilidades.carregar', () => ({
  carregarConsultaDasDisponibilidades: () => mockCarregar(),
}));

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

function Sonda() {
  const { erro, carregando, atualizar, disponibilidades } = useDisponibilidadeAtiva();
  return (
    <>
      <Text testID="estado">
        {`${carregando ? 'carregando' : 'pronto'}|${erro ? 'erro' : 'sem-erro'}|${disponibilidades.length}`}
      </Text>
      <Pressable role="button" aria-label="Atualizar" onPress={() => void atualizar()} />
    </>
  );
}

const estado = () => screen.getByTestId('estado').props.children as string;

async function abrir() {
  await render(
    <QueryClientProvider client={criarClienteDeTeste()}>
      <CascaContext.Provider value={{ cabecalho: null, abas: undefined, habilitado: true }}>
        <DisponibilidadeAtivaProvider>
          <Sonda />
        </DisponibilidadeAtivaProvider>
      </CascaContext.Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  entrarComoMock('mock-motorista');
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  mockCarregar.mockReset();
});
afterEach(() => {
  sairDoMock();
  jest.restoreAllMocks();
});

describe('DisponibilidadeAtivaProvider com o chunk da consulta fora do ar', () => {
  it('não derruba a área: mostra o erro e, ao atualizar, baixa de novo e carrega a lista', async () => {
    mockCarregar
      .mockRejectedValueOnce(new Error('Loading chunk failed'))
      .mockImplementation(() =>
        Promise.resolve(jest.requireActual('./ConsultaDasDisponibilidades')),
      );

    await abrir();

    await waitFor(() => expect(estado()).toMatch(/^pronto\|erro\|/));
    expect(mockCarregar).toHaveBeenCalledTimes(1);

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Atualizar' })));

    await waitFor(() => expect(estado()).toMatch(/^pronto\|sem-erro\|[1-9]/));
    expect(mockCarregar).toHaveBeenCalledTimes(2);
  });
});
