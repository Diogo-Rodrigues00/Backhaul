import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useMovimentoReduzido } from '@/hooks/useMovimentoReduzido';
import { renderizar } from '@/test-utils/renderComTema';
import { colors } from '@/theme/tokens';

import { aparencia, Botao, estadoVisual, type VarianteBotao } from './Botao';

jest.mock('@/hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: jest.fn(() => false) }));
// O giro do carregamento é testado em Carregando.test; aqui só importa que ele aparece.
jest.mock('@/hooks/useLoopAnimado', () => ({
  useLoopAnimado: jest.fn(() => ({
    interpolate: () => '0deg',
  })),
}));

const reduzido = useMovimentoReduzido as jest.MockedFunction<typeof useMovimentoReduzido>;

function estiloDe(el: { props: { style?: unknown } }) {
  return StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
}

// O Pressable usa o Pressability: o toque começa em responderGrant (sem isso não há estado "pressed").
async function segurar(el: Parameters<typeof fireEvent>[0]) {
  await fireEvent(el, 'responderGrant', {
    nativeEvent: { touches: [], changedTouches: [], target: 1, timestamp: 0 },
    persist: () => {},
  });
}

function estiloDoBotao() {
  return estiloDe(screen.getByRole('button'));
}

beforeEach(() => reduzido.mockReturnValue(false));

describe('Botao: semântica', () => {
  it('é um botão com o rótulo como nome acessível', async () => {
    await renderizar(<Botao>Publicar carga</Botao>);
    expect(screen.getByRole('button', { name: 'Publicar carga' })).toBeOnTheScreen();
  });

  it('ícone à esquerda é decorativo: não entra no nome acessível', async () => {
    await renderizar(<Botao icone="plus">Adicionar</Botao>);
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeOnTheScreen();
  });

  it('chama aoPressionar ao tocar', async () => {
    const aoPressionar = jest.fn();
    await renderizar(<Botao aoPressionar={aoPressionar}>Entrar</Botao>);
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(aoPressionar).toHaveBeenCalledTimes(1);
  });

  it('onPress (do Link com asChild) tem o mesmo efeito', async () => {
    const onPress = jest.fn();
    await renderizar(<Botao onPress={onPress}>Ir</Botao>);
    await fireEvent.press(screen.getByRole('button', { name: 'Ir' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('o role pode ser trocado (link com cara de botão)', async () => {
    await renderizar(<Botao role="link">Criar conta</Botao>);
    expect(screen.getByRole('link', { name: 'Criar conta' })).toBeOnTheScreen();
  });
});

describe('Botao: desabilitado', () => {
  it('fica desabilitado de verdade e ignora toques', async () => {
    const aoPressionar = jest.fn();
    await renderizar(
      <Botao desabilitado aoPressionar={aoPressionar}>
        Salvar
      </Botao>,
    );
    const botao = screen.getByRole('button', { name: 'Salvar' });
    expect(botao).toBeDisabled();
    await fireEvent.press(botao);
    expect(aoPressionar).not.toHaveBeenCalled();
  });

  it('usa fundo e texto de disabled.*', async () => {
    await renderizar(<Botao desabilitado>Salvar</Botao>);
    expect(estiloDoBotao()).toMatchObject({
      backgroundColor: colors.light.disabled.bg,
      borderColor: colors.light.border.subtle,
    });
  });
});

describe('Botao: carregando (CT-01)', () => {
  it('nome acessível vira o rótulo de progresso, com aria-busy e aria-disabled', async () => {
    await renderizar(
      <Botao carregando rotuloCarregando="Publicando…">
        Publicar carga
      </Botao>,
    );
    expect(screen.queryByRole('button', { name: 'Publicar carga' })).toBeNull();
    const botao = screen.getByRole('button', { name: 'Publicando…' });
    expect(botao).toBeBusy();
    expect(botao).toBeDisabled();
  });

  it('não usa disabled de verdade: o foco continua no botão durante o envio', async () => {
    await renderizar(<Botao carregando>Publicar</Botao>);
    // disabled de verdade tiraria o botão da ordem de foco; aria-disabled mantém.
    const botao = screen.getByRole('button', { name: 'Carregando…' });
    expect(botao.props.focusable).not.toBe(false);
  });

  it('um botão parado tem busy e disabled falsos', async () => {
    await renderizar(<Botao>Publicar</Botao>);
    const botao = screen.getByRole('button', { name: 'Publicar' });
    expect(botao).not.toBeBusy();
    expect(botao).not.toBeDisabled();
  });

  it('ignora toques enquanto carrega', async () => {
    const aoPressionar = jest.fn();
    await renderizar(
      <Botao carregando aoPressionar={aoPressionar}>
        Publicar
      </Botao>,
    );
    await fireEvent.press(screen.getByRole('button'));
    expect(aoPressionar).not.toHaveBeenCalled();
  });

  it('dois toques seguidos chamam aoPressionar uma vez (o pai marca carregando)', async () => {
    const enviar = jest.fn();
    function Formulario() {
      const [enviando, setEnviando] = useState(false);
      return (
        <Botao
          carregando={enviando}
          rotuloCarregando="Publicando…"
          aoPressionar={() => {
            enviar();
            setEnviando(true);
          }}
        >
          Publicar carga
        </Botao>
      );
    }
    await renderizar(<Formulario />);

    await fireEvent.press(screen.getByRole('button', { name: 'Publicar carga' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Publicando…' }));

    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it('1 clique = 1 requisição: a trava vale mesmo antes do pai marcar carregando', async () => {
    let concluir: () => void = () => {};
    const requisicao = new Promise<void>((resolve) => (concluir = resolve));
    const aoPressionar = jest.fn(() => requisicao);
    await renderizar(<Botao aoPressionar={aoPressionar}>Publicar</Botao>);
    const botao = screen.getByRole('button', { name: 'Publicar' });

    await fireEvent.press(botao);
    await fireEvent.press(botao);
    expect(aoPressionar).toHaveBeenCalledTimes(1);

    concluir();
    await requisicao;
    await fireEvent.press(botao);
    expect(aoPressionar).toHaveBeenCalledTimes(2);
  });

  it('a trava também é liberada quando a requisição falha', async () => {
    const aoPressionar = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(new Error('falhou'))
      .mockResolvedValue();
    await renderizar(<Botao aoPressionar={aoPressionar}>Publicar</Botao>);
    const botao = screen.getByRole('button', { name: 'Publicar' });

    await fireEvent.press(botao);
    await Promise.resolve();
    await Promise.resolve();
    await fireEvent.press(botao);

    expect(aoPressionar).toHaveBeenCalledTimes(2);
  });
});

describe('Botao: tamanhos, bloco e variantes', () => {
  it.each([
    ['md', 48],
    ['lg', 56],
  ] as const)('tamanho %s tem altura mínima de %i px', async (tamanho, altura) => {
    await renderizar(<Botao tamanho={tamanho}>Aceitar</Botao>);
    expect(estiloDoBotao().minHeight).toBe(altura);
  });

  it('nenhum alvo fica abaixo de 48 px, nem o botão de texto', async () => {
    await renderizar(<Botao variante="texto">Cancelar</Botao>);
    expect(estiloDoBotao()).toMatchObject({ minHeight: 48, minWidth: 48 });
  });

  it('bloco ocupa toda a largura', async () => {
    await renderizar(<Botao bloco>Entrar</Botao>);
    expect(estiloDoBotao()).toMatchObject({ width: '100%' });
  });

  it('primário: âmbar com borda asfalto (claro) e borda âmbar (escuro)', async () => {
    await renderizar(<Botao>Publicar</Botao>);
    expect(estiloDoBotao()).toMatchObject({
      backgroundColor: colors.light.action.fill,
      borderColor: colors.light.action.border,
    });
    await screen.unmount();
    await renderizar(<Botao>Publicar</Botao>, 'dark');
    expect(estiloDoBotao()).toMatchObject({ borderColor: colors.dark.action.border });
  });

  it('o rótulo do botão de texto é sublinhado', async () => {
    await renderizar(<Botao variante="texto">Cancelar</Botao>);
    const rotulo = StyleSheet.flatten(screen.getByText('Cancelar').props.style) as Record<
      string,
      unknown
    >;
    expect(rotulo.textDecorationLine).toBe('underline');
  });
});

describe('Botao: estados visuais (tabela do DS)', () => {
  const variantes: VarianteBotao[] = ['primario', 'secundario', 'perigo', 'texto'];

  it('pressionado desce 1 px', async () => {
    await renderizar(<Botao>Publicar</Botao>);
    expect(estiloDoBotao().transform).toBeUndefined();
    await segurar(screen.getByRole('button'));
    expect(estiloDoBotao().transform).toEqual([{ translateY: 1 }]);
    expect(estiloDoBotao().backgroundColor).toBe(colors.light.action.fillPressed);
  });

  it('com movimento reduzido o pressionado só muda a cor, sem mover', async () => {
    reduzido.mockReturnValue(true);
    await renderizar(<Botao>Publicar</Botao>);
    await segurar(screen.getByRole('button'));
    expect(estiloDoBotao().transform).toBeUndefined();
    expect(estiloDoBotao().backgroundColor).toBe(colors.light.action.fillPressed);
  });

  it('hover do primário usa action.fillHover; do secundário, bg.sunken com borda escura', () => {
    expect(aparencia(colors.light, 'primario', 'hover').fundo).toBe(colors.light.action.fillHover);
    expect(aparencia(colors.light, 'secundario', 'hover')).toMatchObject({
      fundo: colors.light.bg.sunken,
      borda: colors.light.text.primary,
    });
  });

  it('perigo usa error.* e fundo suave no hover', () => {
    expect(aparencia(colors.light, 'perigo', 'padrao')).toMatchObject({
      borda: colors.light.error.border,
      texto: 'erro',
    });
    expect(aparencia(colors.light, 'perigo', 'hover').fundo).toBe(colors.light.error.bg);
  });

  it.each(variantes)('desabilitado de %s usa disabled.* no texto', (variante) => {
    expect(aparencia(colors.dark, variante, 'desabilitado').texto).toBe('desabilitado');
  });

  it('estadoVisual dá prioridade a desabilitado, depois pressionado e hover', () => {
    expect(estadoVisual(true, true, true)).toBe('desabilitado');
    expect(estadoVisual(false, true, true)).toBe('pressionado');
    expect(estadoVisual(false, false, true)).toBe('hover');
    expect(estadoVisual(false, false)).toBe('padrao');
  });
});
