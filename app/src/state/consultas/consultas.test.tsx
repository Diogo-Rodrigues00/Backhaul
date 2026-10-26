// Módulo das consultas (ADR 0004, adendo): o cliente único, o provider dos corpos de tela e a
// limpeza registrada na sessão. A limpeza roda mesmo sem nenhuma tela de dados montada.
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { executarLimpezasDaSessao } from '@/state/sessao/limpezas';

import { clienteDeConsultas, comConsultas, ProvedorDeConsultas } from './consultas';

function MostraSeTemCache() {
  const cliente = useQueryClient();
  return <Text>{cliente.getQueryData(['cargas', 'minhas']) ? 'com cache' : 'sem cache'}</Text>;
}

afterEach(() => clienteDeConsultas().clear());

describe('clienteDeConsultas', () => {
  it('é um só por abertura do app', () => {
    expect(clienteDeConsultas()).toBeInstanceOf(QueryClient);
    expect(clienteDeConsultas()).toBe(clienteDeConsultas());
  });

  it('entrar e sair esvaziam o cache mesmo sem tela de dados montada (nada de A visível para B)', () => {
    clienteDeConsultas().setQueryData(['cargas', 'minhas'], { cargas: ['da conta A'] });
    clienteDeConsultas().setQueryData(['fretes', 'meus'], { fretes: ['da conta A'] });

    executarLimpezasDaSessao();

    expect(clienteDeConsultas().getQueryCache().getAll()).toHaveLength(0);
  });
});

describe('comConsultas', () => {
  it('dá ao corpo o cliente único e repassa as propriedades', async () => {
    clienteDeConsultas().setQueryData(['cargas', 'minhas'], { cargas: ['dados'] });
    function Corpo({ titulo }: { titulo: string }) {
      return (
        <>
          <Text>{titulo}</Text>
          <MostraSeTemCache />
        </>
      );
    }
    const ComCliente = comConsultas(Corpo);

    await render(<ComCliente titulo="Meu corpo" />);

    expect(screen.getByText('Meu corpo')).toBeOnTheScreen();
    expect(screen.getByText('com cache')).toBeOnTheScreen();
  });
});

describe('ProvedorDeConsultas', () => {
  it('aceita um cliente de teste no lugar do único', async () => {
    const outro = new QueryClient();
    outro.setQueryData(['cargas', 'minhas'], { cargas: ['do teste'] });

    await render(
      <ProvedorDeConsultas cliente={outro}>
        <MostraSeTemCache />
      </ProvedorDeConsultas>,
    );

    expect(screen.getByText('com cache')).toBeOnTheScreen();
  });
});
