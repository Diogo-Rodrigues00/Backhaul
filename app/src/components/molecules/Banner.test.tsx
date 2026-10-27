import { screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';
import { colors } from '@/theme/tokens';

import { Banner, type VarianteBanner } from './Banner';

function raiz() {
  const [no] = screen.container.queryAll(
    (el) => el.props.role === 'alert' || el.props.role === 'status',
  );
  if (!no) throw new Error('Banner não renderizado');
  return no;
}

describe('Banner', () => {
  it('erro é role="alert" (anuncia na hora)', async () => {
    await renderizar(<Banner variante="erro">Algo deu errado. Tente de novo.</Banner>);
    expect(raiz().props.role).toBe('alert');
    expect(screen.getByText('Algo deu errado. Tente de novo.')).toBeOnTheScreen();
  });

  it.each<VarianteBanner>(['info', 'ok', 'aviso'])('%s é role="status" (educado)', async (v) => {
    await renderizar(<Banner variante={v}>Texto</Banner>);
    expect(raiz().props.role).toBe('status');
  });

  it('com anunciar={false} é só texto: sem role nem região viva', async () => {
    await renderizar(
      <Banner variante="info" anunciar={false} titulo="Tentativa 1 de 18">
        Nova tentativa em 5 segundos.
      </Banner>,
    );
    expect(screen.container.queryAll((el) => el.props.role === 'status')).toHaveLength(0);
    expect(screen.container.queryAll((el) => el.props.role === 'alert')).toHaveLength(0);
    expect(screen.container.queryAll((el) => el.props['aria-live'] === 'off')).toHaveLength(1);
    expect(screen.getByText('Tentativa 1 de 18')).toBeOnTheScreen();
  });

  it('mostra título, texto e ação', async () => {
    await renderizar(
      <Banner variante="aviso" titulo="Sessão expirada" acao={<Text>Entrar de novo</Text>}>
        Entre de novo para continuar.
      </Banner>,
    );
    expect(screen.getByText('Sessão expirada')).toBeOnTheScreen();
    expect(screen.getByText('Entre de novo para continuar.')).toBeOnTheScreen();
    expect(screen.getByText('Entrar de novo')).toBeOnTheScreen();
  });

  it('tem borda de 2 px nas cores do papel (o sinal não é só a cor)', async () => {
    await renderizar(<Banner variante="erro">x</Banner>);
    expect(StyleSheet.flatten(raiz().props.style)).toMatchObject({
      borderWidth: 2,
      borderColor: colors.light.error.border,
      backgroundColor: colors.light.error.bg,
    });
  });

  it('aviso usa o fundo de destaque e a borda escura', async () => {
    await renderizar(<Banner variante="aviso">x</Banner>);
    expect(StyleSheet.flatten(raiz().props.style)).toMatchObject({
      backgroundColor: colors.light.bg.highlight,
      borderColor: colors.light.text.primary,
    });
  });
});
