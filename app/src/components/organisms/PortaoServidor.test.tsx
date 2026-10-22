import { act, fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import { anunciar } from '@/lib/a11y';
import { renderizarComRota } from '@/test-utils/renderComRota';

import { PortaoServidor, type PropsPortaoServidor } from './PortaoServidor';

jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  moverFoco: jest.fn(),
  anunciar: jest.fn(),
}));
jest.mock('@/hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: jest.fn(() => true) }));

function props(extra: Partial<PropsPortaoServidor> = {}): PropsPortaoServidor {
  return {
    estado: 'verificando',
    tentativa: 1,
    totalTentativas: 18,
    intervaloSegundos: 5,
    aoTentarDeNovo: jest.fn(),
    children: <Text>conteúdo do app</Text>,
    ...extra,
  };
}

function portao(extra: Partial<PropsPortaoServidor> = {}) {
  return <PortaoServidor {...props(extra)} />;
}

function papel(nome: string) {
  return screen.container.queryAll((el) => el.props.role === nome);
}

beforeEach(() => jest.mocked(anunciar).mockClear());

describe('PortaoServidor', () => {
  it.each(['verificando', 'pronto'] as const)(
    '%s: mostra o app, sem a tela do portão',
    async (estado) => {
      await renderizarComRota(portao({ estado }));
      expect(screen.getByText('conteúdo do app')).toBeOnTheScreen();
      expect(screen.queryByText('Conectando ao servidor')).toBeNull();
      expect(screen.queryByText('Não foi possível conectar ao servidor')).toBeNull();
    },
  );

  describe('lento (Conectando ao servidor)', () => {
    it('troca o app pela tela com h1, frase e a tentativa em região de status', async () => {
      await renderizarComRota(portao({ estado: 'lento', tentativa: 3 }));

      expect(screen.queryByText('conteúdo do app')).toBeNull();
      const titulo = screen.getByRole('heading', { name: 'Conectando ao servidor' });
      expect(titulo.props['aria-level']).toBe(1);
      expect(
        screen.getByText(
          'O servidor pode levar até 1 minuto para acordar. Fique nesta tela, ela libera sozinha.',
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('Tentativa 3 de 18')).toBeOnTheScreen();
      expect(screen.getByText('Nova tentativa em 5 segundos.')).toBeOnTheScreen();
      expect(papel('status')).toHaveLength(1);
      expect(papel('alert')).toHaveLength(0);
      expect(papel('main')).toHaveLength(1);
      expect(papel('banner')).toHaveLength(1);
    });

    it('usa o total e o intervalo recebidos (nenhum valor fixo na tela)', async () => {
      await renderizarComRota(
        portao({ estado: 'lento', tentativa: 2, totalTentativas: 4, intervaloSegundos: 10 }),
      );
      expect(screen.getByText('Tentativa 2 de 4')).toBeOnTheScreen();
      expect(screen.getByText('Nova tentativa em 10 segundos.')).toBeOnTheScreen();
    });

    it('não oferece botão: a tela libera sozinha', async () => {
      await renderizarComRota(portao({ estado: 'lento' }));
      expect(screen.queryByRole('button', { name: 'Tentar de novo' })).toBeNull();
    });
  });

  describe('falhou (Servidor não respondeu)', () => {
    it('mostra h1, a frase em role="alert" e o botão Tentar de novo', async () => {
      const aoTentarDeNovo = jest.fn();
      await renderizarComRota(portao({ estado: 'falhou', aoTentarDeNovo }));

      expect(screen.queryByText('conteúdo do app')).toBeNull();
      const titulo = screen.getByRole('heading', { name: 'Não foi possível conectar ao servidor' });
      expect(titulo.props['aria-level']).toBe(1);
      const frase = screen.getByText(
        'Passou de 1 minuto e o servidor não respondeu. Confira sua internet e tente de novo.',
      );
      expect(papel('alert')).toEqual([frase]);

      fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
      expect(aoTentarDeNovo).toHaveBeenCalledTimes(1);
    });
  });

  describe('anúncio na região educada', () => {
    // A rota do teste guarda a UI da primeira renderização: o estado muda por dentro.
    let mudarEstado: (estado: PropsPortaoServidor['estado']) => void = () => undefined;
    function Controlado({ inicial }: { inicial: PropsPortaoServidor['estado'] }) {
      const [estado, setEstado] = useState(inicial);
      mudarEstado = setEstado;
      return portao({ estado });
    }

    it('lento → pronto: anuncia que o servidor conectou', async () => {
      await renderizarComRota(<Controlado inicial="lento" />);
      expect(anunciar).not.toHaveBeenCalled();

      await act(async () => mudarEstado('pronto'));
      expect(anunciar).toHaveBeenCalledWith('Servidor conectado.');
      expect(anunciar).toHaveBeenCalledTimes(1);
    });

    it('verificando → pronto (servidor rápido): não anuncia nada', async () => {
      await renderizarComRota(<Controlado inicial="verificando" />);
      await act(async () => mudarEstado('pronto'));
      expect(anunciar).not.toHaveBeenCalled();
    });
  });
});
