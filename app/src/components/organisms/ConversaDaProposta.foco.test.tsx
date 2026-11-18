// Foco e leitor de tela na conversa da proposta (card 042, auditoria a11y): foco depois de "Ver nova
// mensagem" e quando a conversa encerra, mensagem como um elemento só no iPhone e contador igual à
// validação. O resto está em ConversaDaProposta.test.tsx e ConversaDaProposta.rolagem.test.tsx.
import { fireEvent, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { moverFoco } from '@/lib/a11y';
import { ERRO_MENSAGEM_LONGA } from '@/lib/mensagem';
import { comTema, renderizar } from '@/test-utils/renderComTema';

import {
  ConversaDaProposta,
  type MensagemDaConversa,
  type PropsConversaDaProposta,
} from './ConversaDaProposta';

jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  moverFoco: jest.fn(),
}));

const focoMovido = moverFoco as jest.MockedFunction<typeof moverFoco>;

const EU = 'usuario-empresa';
const ELE = 'usuario-motorista';
const mensagem = (n: number, remetente_id = ELE): MensagemDaConversa => ({
  id: `m${n}`,
  remetente_id,
  texto: `Mensagem ${n}`,
  criado_em: '2026-11-04T17:10:00.000Z',
});
const historico = [mensagem(1, EU), mensagem(2)];

function props(extra: Partial<PropsConversaDaProposta> = {}): PropsConversaDaProposta {
  return {
    mensagens: historico,
    meuUsuarioId: EU,
    nomeDaOutraParte: 'João da Silva',
    encerrada: false,
    enviando: false,
    aoEnviar: jest.fn(async () => true),
    id: 'conversa-1',
    ...extra,
  };
}

const ROTULO = 'Mensagens da conversa com João da Silva';
const campo = () => screen.getByLabelText('Mensagem');
const itens = () => screen.container.queryAll((el) => el.props.role === 'listitem');
const rolarPara = (y: number) =>
  fireEvent.scroll(screen.getByLabelText(ROTULO), {
    nativeEvent: {
      contentOffset: { y },
      layoutMeasurement: { height: 340 },
      contentSize: { height: 900 },
    },
  });

const original = Platform.OS;
afterEach(() => {
  Platform.OS = original;
  delete (globalThis as { document?: unknown }).document;
});
beforeEach(() => focoMovido.mockClear());

function comoWeb() {
  Platform.OS = 'web';
  (globalThis as { document?: unknown }).document = {
    activeElement: { getAttribute: () => 'conversa-1' },
  };
}

describe('ConversaDaProposta: foco depois de "Ver nova mensagem" (WCAG 2.4.3)', () => {
  async function comNovaMensagem() {
    const tela = await renderizar(<ConversaDaProposta {...props()} />);
    await rolarPara(560);
    await rolarPara(100);
    await tela.rerender(
      comTema(<ConversaDaProposta {...props({ mensagens: [...historico, mensagem(3)] })} />),
    );
    focoMovido.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver nova mensagem' }));
  }

  it('na web o foco vai à região rolável do histórico', async () => {
    comoWeb();
    await comNovaMensagem();
    expect(focoMovido).toHaveBeenCalledTimes(1);
    const alvo = focoMovido.mock.calls[0]?.[0].current as { scrollToEnd?: unknown } | null;
    expect(typeof alvo?.scrollToEnd).toBe('function');
    expect(screen.queryByRole('button', { name: /Ver nova/ })).toBeNull();
  });

  it('no iPhone o foco vai à última mensagem', async () => {
    await comNovaMensagem();
    expect(focoMovido).toHaveBeenCalledTimes(1);
    const alvo = focoMovido.mock.calls[0]?.[0].current as {
      props?: { accessibilityLabel?: string };
      scrollToEnd?: unknown;
    } | null;
    expect(alvo).not.toBeNull();
    expect(alvo?.scrollToEnd).toBeUndefined();
    expect(alvo?.props?.accessibilityLabel).toMatch(/Mensagem 3$/);
  });
});

describe('ConversaDaProposta: conversa que encerra com ela aberta (WCAG 2.4.3)', () => {
  it('o foco vai ao título quando a proposta é encerrada (campo e botão se desligam)', async () => {
    const tela = await renderizar(<ConversaDaProposta {...props()} />);
    focoMovido.mockClear();
    await tela.rerender(comTema(<ConversaDaProposta {...props({ encerrada: true })} />));

    expect(focoMovido).toHaveBeenCalledTimes(1);
    const alvo = focoMovido.mock.calls[0]?.[0].current as { props?: { role?: string } } | null;
    expect(alvo?.props?.role).toBe('heading');
    expect(campo().props.editable).toBe(false);
  });

  it('já abrir encerrada não move o foco duas vezes', async () => {
    await renderizar(<ConversaDaProposta {...props({ encerrada: true })} />);
    expect(focoMovido).toHaveBeenCalledTimes(1);
  });
});

describe('ConversaDaProposta: cada mensagem é um elemento no iPhone', () => {
  it('no iPhone: accessible e rótulo "autor, hora: texto"', async () => {
    await renderizar(<ConversaDaProposta {...props()} />);
    const [minha, dele] = itens();
    expect(minha?.props.accessible).toBe(true);
    expect(minha?.props.accessibilityLabel).toMatch(
      /^Você, \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}: Mensagem 1$/,
    );
    expect(dele?.props.accessibilityLabel).toMatch(/^João da Silva, .*: Mensagem 2$/);
  });

  it('na web: cada texto continua sendo lido como está (sem rótulo no item)', async () => {
    comoWeb();
    await renderizar(<ConversaDaProposta {...props()} />);
    const [minha] = itens();
    expect(minha?.props.accessible).toBe(false);
    expect(minha?.props.accessibilityLabel).toBeUndefined();
  });
});

describe('ConversaDaProposta: contador igual à validação', () => {
  it('conta o texto sem espaços nas pontas, como a validação e o backend', async () => {
    await renderizar(<ConversaDaProposta {...props()} />);
    await fireEvent.changeText(campo(), '   Combinado   ');
    expect(screen.getByText('9 de 1000 caracteres')).toBeOnTheScreen();
  });

  it('1000 caracteres mais espaços no fim não dão erro nem passam do limite', async () => {
    await renderizar(<ConversaDaProposta {...props()} />);
    await fireEvent.changeText(campo(), `${'a'.repeat(1000)}   `);
    expect(screen.getByText('1000 de 1000 caracteres')).toBeOnTheScreen();
    expect(screen.queryByText(ERRO_MENSAGEM_LONGA)).toBeNull();
  });
});
