import { act, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Platform } from 'react-native';

import { anunciar } from '@/lib/a11y';
import { ouvirAnuncios } from '@/lib/anuncios';

import { RegiaoViva } from './RegiaoViva';
import { renderizar } from '@/test-utils/renderComTema';

function regiao() {
  const [no] = screen.container.queryAll((el) => el.props.role === 'status');
  if (!no) throw new Error('RegiaoViva não renderizada');
  return no;
}

function textoDaRegiao() {
  return screen.getByText(/./, { includeHiddenElements: true }).props.children as string;
}

describe('RegiaoViva', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('é uma região de status educada (aria-live polite) e começa vazia', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizar(<RegiaoViva />);
    expect(regiao().props['aria-live']).toBe('polite');
    expect(regiao().props['aria-atomic']).toBe(true);
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('recebe o que anunciar() emite e mostra o texto', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizar(<RegiaoViva />);
    await act(async () => anunciar('Lista atualizada às 14:32'));
    expect(screen.getByText('Lista atualizada às 14:32')).toBeOnTheScreen();
  });

  it('não pode receber foco (anunciar não move o foco)', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizar(<RegiaoViva />);
    await act(async () => anunciar('1 nova proposta'));
    const no = regiao();
    expect(no.props.focusable).toBeUndefined();
    expect(no.props.tabIndex).toBeUndefined();
    expect(no.props.accessible).toBeUndefined();
  });

  it('a mesma frase duas vezes muda o texto (nbsp) para ser anunciada de novo', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizar(<RegiaoViva />);
    await act(async () => anunciar('Atualizado'));
    const primeira = textoDaRegiao();
    await act(async () => anunciar('Atualizado'));
    const segunda = textoDaRegiao();
    expect(segunda).not.toBe(primeira);
    expect(segunda.trim()).toBe('Atualizado');
  });

  it('ignora mensagem vazia', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizar(<RegiaoViva />);
    await act(async () => anunciar('   '));
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('limpa a mensagem depois de um tempo, para não sobrar texto velho', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizar(<RegiaoViva />);
    await act(async () => anunciar('Frete criado'));
    expect(screen.getByText('Frete criado')).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTime(8000));
    expect(screen.queryByText('Frete criado')).toBeNull();
  });

  it('deixa de ouvir ao desmontar', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const ouvinte = jest.fn();
    const parar = ouvirAnuncios(ouvinte);
    await renderizar(<RegiaoViva />);
    await screen.unmount();
    await act(async () => anunciar('Depois de sair'));
    // Só o ouvinte do teste recebeu; a região desmontada não quebra nem reage.
    expect(ouvinte).toHaveBeenCalledWith('Depois de sair');
    parar();
  });

  it('web: continua na árvore de acessibilidade (esconder a deixaria muda)', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderizar(<RegiaoViva />);
    expect(regiao().props.accessibilityElementsHidden).toBeUndefined();
    expect(regiao().props.importantForAccessibility).toBeUndefined();
  });

  it('iPhone: o anúncio sai pelo AccessibilityInfo e a região fica escondida do VoiceOver', async () => {
    await renderizar(<RegiaoViva />);
    await act(async () => anunciar('Proposta enviada'));
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Proposta enviada');
    expect(regiao().props.importantForAccessibility).toBe('no-hide-descendants');
    expect(regiao().props.accessibilityElementsHidden).toBe(true);
  });

  it('visualmente oculta (1x1) mas sem display none', async () => {
    await renderizar(<RegiaoViva />);
    expect(regiao().props.style).toMatchObject({ width: 1, height: 1, overflow: 'hidden' });
  });
});
