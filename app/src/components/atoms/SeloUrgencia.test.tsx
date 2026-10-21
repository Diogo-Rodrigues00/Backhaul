import { screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { renderizar } from '@/test-utils/renderComTema';
import { colors, urgencyIcon } from '@/theme/tokens';

import { icones } from './icones';
import { SeloUrgencia } from './SeloUrgencia';

function estiloDe(el: { props: { style?: unknown } }) {
  return StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
}

// Atributos (d, cx, cy...) de cada forma desenhada pelo react-native-svg.
function formasRenderizadas() {
  return screen.container
    .queryAll(
      (el) =>
        typeof el.type === 'string' &&
        el.type.startsWith('RNSVG') &&
        el.type !== 'RNSVGSvgView' &&
        el.type !== 'RNSVGGroup',
    )
    .map((el) => {
      const { d, cx, cy, r } = el.props as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries({ d, cx, cy, r }).filter(([, v]) => v !== undefined),
      );
    });
}

const niveis = ['normal', 'urgente', 'critico'] as const;

describe('SeloUrgencia (D-PO-13)', () => {
  it.each([
    ['normal', 'Normal'],
    ['urgente', 'Urgente'],
    ['critico', 'Crítico'],
  ] as const)('%s mostra o texto "%s" e o prefixo oculto "Urgência:"', async (nivel, texto) => {
    await renderizar(<SeloUrgencia urgencia={nivel} />);
    expect(screen.getByText(texto)).toBeOnTheScreen();
    // O leitor de tela lê o prefixo + o texto: "Urgência: Crítico".
    expect(screen.getByText('Urgência:', { exact: false })).toBeOnTheScreen();
  });

  it('o texto é caixa alta por estilo (o conteúdo continua "Crítico")', async () => {
    await renderizar(<SeloUrgencia urgencia="critico" />);
    expect(estiloDe(screen.getByText('Crítico')).textTransform).toBe('uppercase');
  });

  it('agrupa prefixo e texto num só elemento de acessibilidade (VoiceOver)', async () => {
    await renderizar(<SeloUrgencia urgencia="critico" />);
    const selo = screen.getByText('Urgência:', { exact: false }).parent;
    expect(selo?.props.accessible).toBe(true);
    expect(within(selo as never).getByText('Crítico')).toBeOnTheScreen();
  });

  it('cada nível tem uma forma própria: círculo, triângulo e octógono (não só cor)', async () => {
    const desenhos: string[] = [];
    for (const nivel of niveis) {
      await renderizar(<SeloUrgencia urgencia={nivel} />);
      // O desenho do nível: o ícone de urgencyIcon, e não outro.
      expect(formasRenderizadas()).toEqual(
        icones[urgencyIcon[nivel]].map(([, atributos]) => atributos),
      );
      desenhos.push(JSON.stringify(formasRenderizadas()));
      await screen.unmount();
    }
    expect(new Set(desenhos).size).toBe(3);
    expect(urgencyIcon).toEqual({
      normal: 'circle',
      urgente: 'triangle-alert',
      critico: 'octagon-alert',
    });
  });

  it('o ícone da forma é decorativo (o nome já está no texto)', async () => {
    await renderizar(<SeloUrgencia urgencia="critico" />);
    const [svg] = screen.container.queryAll((el) => el.type === 'RNSVGSvgView');
    expect(svg?.props.accessible).toBe(false);
    expect(svg?.props.accessibilityLabel).toBeUndefined();
  });

  it.each(niveis)('%s usa o par de cores do DS nos dois temas', async (nivel) => {
    await renderizar(<SeloUrgencia urgencia={nivel} />);
    const claro = screen.getByText('Urgência:', { exact: false }).parent;
    expect(estiloDe(claro as never)).toMatchObject({
      backgroundColor: colors.light.urgency[nivel].bg,
      borderColor: colors.light.urgency[nivel].border,
    });
    await screen.unmount();

    await renderizar(<SeloUrgencia urgencia={nivel} />, 'dark');
    const escuro = screen.getByText('Urgência:', { exact: false }).parent;
    expect(estiloDe(escuro as never)).toMatchObject({
      backgroundColor: colors.dark.urgency[nivel].bg,
      borderColor: colors.dark.urgency[nivel].border,
    });
  });

  it.each([
    ['md', 32],
    ['lg', 40],
  ] as const)('tamanho %s tem %i px de altura mínima', async (tamanho, altura) => {
    await renderizar(<SeloUrgencia urgencia="urgente" tamanho={tamanho} />);
    const selo = screen.getByText('Urgência:', { exact: false }).parent;
    expect(estiloDe(selo as never).minHeight).toBe(altura);
  });

  it('valor de urgência desconhecido cai no visual normal, sem quebrar', async () => {
    await renderizar(<SeloUrgencia urgencia={'extremo' as never} />);
    expect(screen.getByText('Normal')).toBeOnTheScreen();
  });
});
