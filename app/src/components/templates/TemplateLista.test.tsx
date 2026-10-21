import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { Cabecalho } from '@/components/organisms/Cabecalho';
import { renderizarComRota } from '@/test-utils/renderComRota';

import { TemplateLista, type PropsTemplateLista } from './TemplateLista';

jest.mock('expo-router/head', () => ({ __esModule: true, default: () => null }));
jest.mock('@/hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: jest.fn(() => false) }));
jest.mock('@/hooks/useLoopAnimado', () => ({
  useLoopAnimado: jest.fn(() => ({ interpolate: () => 1 })),
}));

const vazio = {
  titulo: 'Nenhuma carga por aqui',
  descricao: 'Publique a primeira carga.',
  acao: <Text>Publicar carga</Text>,
};

function lista(props: Partial<PropsTemplateLista> = {}) {
  return (
    <TemplateLista
      titulo="Minhas cargas"
      descricao="Cargas que a sua empresa publicou."
      cabecalho={<Cabecalho variante="simples" />}
      estado="pronto"
      textoCarregando="Carregando cargas…"
      {...props}
    >
      <Text>Soja, 8.000 kg</Text>
    </TemplateLista>
  );
}

function papel(nome: string) {
  return screen.container.queryAll((el) => el.props.role === nome);
}

describe('TemplateLista: carregando (CT-01)', () => {
  it('expõe o texto num role="status", com 3 esqueletos, sem mostrar a lista', async () => {
    await renderizarComRota(lista({ estado: 'carregando' }));
    const status = papel('status').find((el) => el.props['aria-busy']);
    expect(status).toBeTruthy();
    expect(within(status!).getByText('Carregando cargas…')).toBeOnTheScreen();
    expect(screen.getAllByTestId('esqueleto-bloco', { includeHiddenElements: true })).toHaveLength(
      3,
    );
    expect(screen.queryByText('Soja, 8.000 kg')).toBeNull();
  });

  it('não mostra "Atualizar" nem a barra de novidades enquanto carrega', async () => {
    await renderizarComRota(
      lista({ estado: 'carregando', aoAtualizar: () => {}, novidade: { titulo: 'Nova' } }),
    );
    expect(screen.queryByRole('button', { name: 'Atualizar' })).toBeNull();
    expect(screen.queryByText('Nova')).toBeNull();
  });
});

describe('TemplateLista: vazio (CT-02)', () => {
  it('mostra a mensagem (h2) e a ação', async () => {
    await renderizarComRota(lista({ estado: 'vazio', vazio }));
    expect(
      screen.getByRole('heading', { name: 'Nenhuma carga por aqui' }).props['aria-level'],
    ).toBe(2);
    expect(screen.getByText('Publique a primeira carga.')).toBeOnTheScreen();
    expect(screen.getByText('Publicar carga')).toBeOnTheScreen();
    expect(screen.queryByText('Soja, 8.000 kg')).toBeNull();
  });

  it('o h1 continua sendo o único h1', async () => {
    await renderizarComRota(lista({ estado: 'vazio', vazio }));
    const h1 = screen.getAllByRole('heading').filter((el) => el.props['aria-level'] === 1);
    expect(h1).toHaveLength(1);
  });

  it('com polling, o vazio ainda mostra a barra de novidades e "Atualizar"', async () => {
    await renderizarComRota(
      lista({
        estado: 'vazio',
        vazio,
        aoAtualizar: () => {},
        novidade: { atualizadoEm: Date.now() },
      }),
    );
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeOnTheScreen();
    expect(screen.getByText(/Esta tela atualiza sozinha/)).toBeOnTheScreen();
  });
});

describe('TemplateLista: erro (CT-03)', () => {
  it('mostra um alerta com "Tentar de novo" que refaz a leitura', async () => {
    const aoTentarDeNovo = jest.fn();
    await renderizarComRota(lista({ estado: 'erro', erro: { aoTentarDeNovo } }));
    expect(papel('alert')).toHaveLength(1);
    expect(screen.getByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(aoTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  it('mostra a mensagem do servidor como veio', async () => {
    await renderizarComRota(
      lista({
        estado: 'erro',
        erro: { mensagem: 'Carga não encontrada', aoTentarDeNovo: () => {} },
      }),
    );
    expect(screen.getByText('Carga não encontrada')).toBeOnTheScreen();
  });

  it('sem erro.aoTentarDeNovo, "Tentar de novo" usa aoAtualizar', async () => {
    const aoAtualizar = jest.fn();
    await renderizarComRota(lista({ estado: 'erro', aoAtualizar }));
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(aoAtualizar).toHaveBeenCalledTimes(1);
  });

  it('não mostra "Atualizar" junto de "Tentar de novo"', async () => {
    await renderizarComRota(lista({ estado: 'erro', aoAtualizar: () => {} }));
    expect(screen.queryByRole('button', { name: 'Atualizar' })).toBeNull();
  });
});

describe('TemplateLista: pronto', () => {
  it('mostra a lista', async () => {
    await renderizarComRota(lista());
    expect(screen.getByText('Soja, 8.000 kg')).toBeOnTheScreen();
  });

  it('sem aoAtualizar nem novidade não há barra de ferramentas', async () => {
    await renderizarComRota(lista());
    expect(screen.queryByRole('button', { name: 'Atualizar' })).toBeNull();
    expect(screen.queryByText(/Esta tela atualiza sozinha/)).toBeNull();
  });

  it('"Atualizar" chama aoAtualizar e vira "Atualizando…" enquanto busca', async () => {
    const aoAtualizar = jest.fn();
    const tela = await renderizarComRota(lista({ aoAtualizar }));
    await fireEvent.press(screen.getByRole('button', { name: 'Atualizar' }));
    expect(aoAtualizar).toHaveBeenCalledTimes(1);
    expect(tela).toBeTruthy();
  });

  it('atualizando mostra "Atualizando…"', async () => {
    await renderizarComRota(lista({ aoAtualizar: () => {}, atualizando: true }));
    expect(screen.getByRole('button', { name: 'Atualizando…' })).toBeBusy();
  });

  it('a novidade aparece numa região de status educada e a hora da última atualização', async () => {
    await renderizarComRota(
      lista({
        aoAtualizar: () => {},
        novidade: {
          titulo: '1 nova proposta',
          atualizadoEm: new Date('2027-05-01T17:32:08.000Z').getTime(),
        },
      }),
    );
    const regiao = papel('status').find((el) => el.props['aria-live'] === 'polite');
    expect(within(regiao!).getByText('1 nova proposta')).toBeOnTheScreen();
    expect(screen.getByText(/Última atualização às 14:32:08/)).toBeOnTheScreen();
  });
});

describe('TemplateLista: altura reservada (CLS 0)', () => {
  it('carregando, vazio, erro e pronto usam a mesma altura mínima', async () => {
    const alturas: unknown[] = [];
    for (const props of [
      { estado: 'carregando' },
      { estado: 'vazio', vazio },
      { estado: 'erro', erro: { aoTentarDeNovo: () => {} } },
      { estado: 'pronto' },
    ] as Partial<PropsTemplateLista>[]) {
      const { unmount } = await renderizarComRota(lista(props));
      const [area] = screen.container.queryAll(
        (el) => StyleSheet.flatten(el.props.style)?.minHeight === 360,
      );
      alturas.push(StyleSheet.flatten(area?.props.style)?.minHeight);
      await unmount();
    }
    expect(alturas).toEqual([360, 360, 360, 360]);
  });
});
