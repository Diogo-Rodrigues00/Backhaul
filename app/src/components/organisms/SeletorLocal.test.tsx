import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';

import type { Local } from './SeletorLocal.logica';
import { SeletorLocal } from './SeletorLocal';

const mockPermissao = jest.fn();
const mockPosicao = jest.fn();
jest.mock('./SeletorLocal.expoLocation', () => ({
  carregarExpoLocation: () =>
    Promise.resolve({
      requestForegroundPermissionsAsync: (...args: unknown[]) => mockPermissao(...args),
      getCurrentPositionAsync: (...args: unknown[]) => mockPosicao(...args),
      Accuracy: { Balanced: 3 },
    }),
}));
jest.mock('@/lib/a11y', () => {
  const real = jest.requireActual('@/lib/a11y.native');
  return { ...real, moverFoco: jest.fn() };
});

const anunciar = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

function Controlado({
  inicial = null as Local | null,
  permitirGps = false,
  erro,
  aoMudar = jest.fn(),
}: {
  inicial?: Local | null;
  permitirGps?: boolean;
  erro?: string;
  aoMudar?: (local: Local | null) => void;
}) {
  const [valor, setValor] = useState<Local | null>(inicial);
  return (
    <SeletorLocal
      id="origem"
      rotulo="Origem"
      valor={valor}
      permitirGps={permitirGps}
      erro={erro}
      aoMudar={(novo) => {
        setValor(novo);
        aoMudar(novo);
      }}
    />
  );
}

const uberlandia: Local = {
  lat: -18.9186,
  lng: -48.2772,
  rotulo: 'Uberlândia - MG',
  origem: 'cidade',
};

beforeEach(() => {
  jest.useFakeTimers();
  anunciar.mockClear();
  mockPermissao.mockReset();
  mockPosicao.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

async function digitar(texto: string, rotulo = 'Origem') {
  await fireEvent.changeText(screen.getByLabelText(rotulo), texto);
}

// Com um local escolhido o grupo também se chama "Origem", então contamos os campos de texto.
function campoDeBusca() {
  return screen.container.queryAll((el) => el.type === 'TextInput');
}

async function passarTempo(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('SeletorLocal no iPhone: busca de cidade', () => {
  it('campo com o nome do rótulo; sem digitar não há resultados', async () => {
    await renderizar(<Controlado />);
    expect(screen.getByLabelText('Origem')).toBeOnTheScreen();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('busca sem acento e sem diferença de maiúscula ("uberlandia" acha Uberlândia)', async () => {
    await renderizar(<Controlado />);
    await digitar('uberlandia');
    expect(screen.getByRole('button', { name: 'Escolher Uberlândia - MG' })).toBeOnTheScreen();
    await digitar('UBERL');
    expect(screen.getByRole('button', { name: 'Escolher Uberlândia - MG' })).toBeOnTheScreen();
  });

  it('mostra no máximo 8 resultados', async () => {
    await renderizar(<Controlado />);
    await digitar('a');
    expect(screen.getAllByRole('button').length).toBeLessThanOrEqual(8);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(1);
  });

  it('tocar num resultado escolhe: mostra "Selecionado" e o botão "Trocar"', async () => {
    const aoMudar = jest.fn();
    await renderizar(<Controlado aoMudar={aoMudar} />);
    await digitar('uberl');
    await fireEvent.press(screen.getByRole('button', { name: 'Escolher Uberlândia - MG' }));

    expect(aoMudar).toHaveBeenCalledWith(
      expect.objectContaining({ rotulo: 'Uberlândia - MG', origem: 'cidade' }),
    );
    expect(screen.getByText('Selecionado: Uberlândia - MG')).toBeOnTheScreen();
    expect(campoDeBusca()).toHaveLength(0);
    expect(anunciar).toHaveBeenCalledWith('Selecionado: Uberlândia - MG');

    await fireEvent.press(screen.getByRole('button', { name: 'Trocar' }));
    expect(aoMudar).toHaveBeenLastCalledWith(null);
    expect(campoDeBusca()).toHaveLength(1);
  });

  it('valor inicial aparece como "Selecionado: ..."', async () => {
    await renderizar(<Controlado inicial={uberlandia} />);
    expect(screen.getByText('Selecionado: Uberlândia - MG')).toBeOnTheScreen();
  });

  it('anuncia a contagem 300 ms depois da última tecla, uma vez só', async () => {
    await renderizar(<Controlado />);
    await digitar('ub');
    await passarTempo(200);
    await digitar('ube');
    await passarTempo(200);
    expect(anunciar).not.toHaveBeenCalled();
    await passarTempo(100);
    expect(anunciar).toHaveBeenCalledTimes(1);
    expect(anunciar.mock.calls[0]![0]).toMatch(/^\d+ resultados?$/);
  });

  it('sem resultado: mostra e anuncia "Nenhuma cidade encontrada. Tente outro nome."', async () => {
    await renderizar(<Controlado />);
    await digitar('zzzz');
    await passarTempo(300);
    expect(screen.getByText('Nenhuma cidade encontrada. Tente outro nome.')).toBeOnTheScreen();
    expect(anunciar).toHaveBeenCalledWith('Nenhuma cidade encontrada. Tente outro nome.');
  });

  it('o erro do formulário fica associado ao campo de busca', async () => {
    await renderizar(<Controlado erro="Escolha o local de origem." />);
    const campo = screen.getByLabelText('Origem');
    expect(campo.props.accessibilityHint).toContain('Escolha o local de origem.');
    expect(screen.getByText('Escolha o local de origem.')).toBeOnTheScreen();
  });
});

describe('SeletorLocal no iPhone: GPS', () => {
  it('empresa (sem permitirGps) não vê "Usar minha localização"', async () => {
    await renderizar(<Controlado />);
    expect(screen.queryByText('Usar minha localização')).toBeNull();
  });

  it('com permissão: coordenadas do aparelho, "Minha localização atual" e cidade mais próxima', async () => {
    mockPermissao.mockResolvedValue({ status: 'granted' });
    mockPosicao.mockResolvedValue({ coords: { latitude: -18.95, longitude: -48.3 } });
    const aoMudar = jest.fn();
    await renderizar(<Controlado permitirGps aoMudar={aoMudar} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));

    expect(aoMudar).toHaveBeenCalledWith({
      lat: -18.95,
      lng: -48.3,
      rotulo: 'Minha localização atual (perto de Uberlândia - MG)',
      origem: 'gps',
    });
    expect(
      await screen.findByText('Selecionado: Minha localização atual (perto de Uberlândia - MG)'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Localização obtida')).toBeOnTheScreen();
  });

  it('enquanto espera o botão mostra "Obtendo localização…" e ignora novo toque', async () => {
    mockPermissao.mockReturnValue(new Promise(() => undefined));
    await renderizar(<Controlado permitirGps />);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(await screen.findByText('Obtendo localização…')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /Obtendo localização/ }));
    expect(mockPermissao).toHaveBeenCalledTimes(1);
  });

  it('permissão negada: aviso explicando e a busca de cidade continua', async () => {
    mockPermissao.mockResolvedValue({ status: 'denied' });
    await renderizar(<Controlado permitirGps />);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));

    expect(await screen.findByText('Não foi possível usar sua localização.')).toBeOnTheScreen();
    expect(screen.getByText(/Você não permitiu o acesso à localização/)).toBeOnTheScreen();
    await digitar('uberl', 'Ou escolha a cidade');
    expect(screen.getByRole('button', { name: 'Escolher Uberlândia - MG' })).toBeOnTheScreen();
  });

  it('erro do aparelho: mesma mensagem e a lista de cidades segue disponível', async () => {
    mockPermissao.mockRejectedValue(new Error('indisponível'));
    await renderizar(<Controlado permitirGps />);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(await screen.findByText('Não foi possível usar sua localização.')).toBeOnTheScreen();
    expect(screen.getByText('Escolha a cidade na lista.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Ou escolha a cidade')).toBeOnTheScreen();
  });

  it('sem posição em 10 s: avisa (timeout) e o seletor de cidade segue disponível', async () => {
    mockPermissao.mockResolvedValue({ status: 'granted' });
    mockPosicao.mockReturnValue(new Promise(() => undefined));
    await renderizar(<Controlado permitirGps />);
    await fireEvent.press(screen.getByRole('button', { name: 'Usar minha localização' }));
    await passarTempo(10_000);
    expect(await screen.findByText('Não foi possível usar sua localização.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Ou escolha a cidade')).toBeOnTheScreen();
  });
});
