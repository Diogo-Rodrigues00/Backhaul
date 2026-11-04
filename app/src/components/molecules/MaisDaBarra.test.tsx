import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { Platform, StyleSheet } from 'react-native';

import { moverFoco } from '@/lib/a11y';
import { renderizarComRota } from '@/test-utils/renderComRota';
import { brand } from '@/theme/tokens';

import { MaisDaBarra, type DestinoDoMais } from './MaisDaBarra';

jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  moverFoco: jest.fn(),
}));

const focoMovido = moverFoco as jest.MockedFunction<typeof moverFoco>;
const rotas = ['motorista/disponibilidades', 'motorista/fretes'];

const destinos: readonly DestinoDoMais[] = [
  { href: '/motorista/disponibilidades', rotulo: 'Disponibilidade', icone: 'locate', atual: false },
];

const botaoMais = () => screen.getByRole('button', { name: 'Mais' });
// Web: `aria-expanded` no DOM. iPhone: o React Native leva o mesmo estado para `accessibilityState`.
const expandido = () =>
  botaoMais().props['aria-expanded'] ?? botaoMais().props.accessibilityState?.expanded;

beforeEach(() => focoMovido.mockClear());
afterEach(() => jest.restoreAllMocks());

describe('MaisDaBarra', () => {
  it('fechado: é um botão "Mais" com aria-expanded=false e os links não estão na página', async () => {
    await renderizarComRota(<MaisDaBarra destinos={destinos} />, { rotas });
    expect(expandido()).toBe(false);
    expect(screen.queryByRole('link', { name: 'Disponibilidade' })).toBeNull();
  });

  it('abre ao tocar: aria-expanded=true e os destinos viram links', async () => {
    await renderizarComRota(<MaisDaBarra destinos={destinos} />, { rotas });
    await act(async () => fireEvent.press(botaoMais()));
    expect(expandido()).toBe(true);
    expect(screen.getByRole('link', { name: 'Disponibilidade' }).props.href).toBe(
      '/motorista/disponibilidades',
    );
  });

  it('tocar de novo fecha o painel', async () => {
    await renderizarComRota(<MaisDaBarra destinos={destinos} />, { rotas });
    await act(async () => fireEvent.press(botaoMais()));
    await act(async () => fireEvent.press(botaoMais()));
    expect(expandido()).toBe(false);
    expect(screen.queryByRole('link', { name: 'Disponibilidade' })).toBeNull();
  });

  it('na web liga o botão ao painel com aria-controls (o mesmo id do painel)', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await renderizarComRota(<MaisDaBarra destinos={destinos} />, { rotas });
    await act(async () => fireEvent.press(botaoMais()));
    const controlado = botaoMais().props['aria-controls'];
    expect(controlado).toBeTruthy();
    const painel = screen.container.queryAll((el) => el.props.nativeID === controlado);
    expect(painel.length).toBeGreaterThan(0);
  });

  it('página atual dentro do "Mais": o link tem aria-current e o botão fica marcado em âmbar', async () => {
    const comAtual: readonly DestinoDoMais[] = [{ ...destinos[0]!, atual: true }];
    await renderizarComRota(<MaisDaBarra destinos={comAtual} />, { rotas });
    const estiloBotao = StyleSheet.flatten(botaoMais().props.style);
    expect(estiloBotao).toMatchObject({ borderTopColor: brand.amber });
    await act(async () => fireEvent.press(botaoMais()));
    expect(screen.getByRole('link', { name: 'Disponibilidade' }).props['aria-current']).toBe(
      'page',
    );
  });

  it('na web, Esc fecha o painel e devolve o foco ao botão', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await renderizarComRota(<MaisDaBarra destinos={destinos} />, { rotas });
    await act(async () => fireEvent.press(botaoMais()));
    const painel = screen.getByRole('link', { name: 'Disponibilidade' });

    await act(async () => fireEvent(painel, 'keyDown', { key: 'Escape' }));

    expect(expandido()).toBe(false);
    expect(screen.queryByRole('link', { name: 'Disponibilidade' })).toBeNull();
    expect(focoMovido).toHaveBeenCalledTimes(1);
  });

  it('outras teclas não fecham o painel', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await renderizarComRota(<MaisDaBarra destinos={destinos} />, { rotas });
    await act(async () => fireEvent.press(botaoMais()));
    await act(async () => fireEvent(botaoMais(), 'keyDown', { key: 'Enter' }));
    expect(expandido()).toBe(true);
    expect(focoMovido).not.toHaveBeenCalled();
  });

  it('iPhone: tocar fora do painel (no fundo) fecha, e o fundo só existe com o painel aberto', async () => {
    await renderizarComRota(<MaisDaBarra destinos={destinos} />, { rotas });
    expect(screen.queryByTestId('mais-fundo')).toBeNull();
    await act(async () => fireEvent.press(botaoMais()));
    // O fundo é escondido do leitor de tela (accessibilityElementsHidden): a consulta precisa ver o escondido.
    const fundo = screen.getByTestId('mais-fundo', { includeHiddenElements: true });
    await act(async () => fireEvent.press(fundo));
    expect(expandido()).toBe(false);
    expect(screen.queryByRole('link', { name: 'Disponibilidade' })).toBeNull();
    expect(focoMovido).not.toHaveBeenCalled();
  });

  it('o painel é uma lista e cada destino é um item dela', async () => {
    await renderizarComRota(<MaisDaBarra destinos={destinos} />, { rotas });
    await act(async () => fireEvent.press(botaoMais()));
    const [painel] = screen.container.queryAll((el) => el.props.role === 'list');
    expect(painel).toBeTruthy();
    expect(within(painel!).getAllByRole('link')).toHaveLength(1);
  });
});
