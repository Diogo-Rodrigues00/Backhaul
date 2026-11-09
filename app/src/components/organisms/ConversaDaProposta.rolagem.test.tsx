// Rolagem do histórico, "Ver nova mensagem", contador acima de 1000 e foco ao abrir na web
// (card 042, ADR 0016). O resto da conversa está em ConversaDaProposta.test.tsx.
import { fireEvent, screen } from '@testing-library/react-native';
import { Platform, ScrollView } from 'react-native';

import { moverFoco } from '@/lib/a11y';
import { ERRO_MENSAGEM_LONGA } from '@/lib/mensagem';
import { comTema, renderizar } from '@/test-utils/renderComTema';

import {
  ConversaDaProposta,
  DISTANCIA_DO_FIM_PX,
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

const campo = () => screen.getByLabelText('Mensagem');

beforeEach(() => focoMovido.mockClear());

describe('ConversaDaProposta: contador acima de 1000', () => {
  it('mostra erro com ícone e texto (não só a cor), ligado ao campo, sem esperar o envio', async () => {
    await renderizar(<ConversaDaProposta {...props()} />);
    await fireEvent.changeText(campo(), 'a'.repeat(1001));
    const erro = screen.getByText(ERRO_MENSAGEM_LONGA);
    const contador = screen.getByText('1001 de 1000 caracteres');
    expect(campo().props['aria-invalid']).toBe(true);
    expect(campo().props['aria-describedby']).toContain(erro.props.nativeID);
    // Nem o contador nem o erro são região viva: não anunciam a cada tecla.
    for (const no of [erro, contador]) {
      expect(no.props['aria-live']).toBeUndefined();
      expect(no.props.role).toBeUndefined();
    }
  });

  it('volta ao normal ao apagar o excesso', async () => {
    await renderizar(<ConversaDaProposta {...props()} />);
    await fireEvent.changeText(campo(), 'a'.repeat(1001));
    await fireEvent.changeText(campo(), 'a'.repeat(1000));
    expect(screen.queryByText(ERRO_MENSAGEM_LONGA)).toBeNull();
    expect(campo().props['aria-invalid']).toBe(false);
  });
});

describe('ConversaDaProposta: rolagem e "Ver nova mensagem"', () => {
  const ROTULO = 'Mensagens da conversa com João da Silva';
  const ALTURA_VISIVEL = 340;
  const paraOFim = jest.spyOn(ScrollView.prototype, 'scrollToEnd');

  const rolarPara = async (y: number, alturaDoConteudo = 900) => {
    await fireEvent.scroll(screen.getByLabelText(ROTULO), {
      nativeEvent: {
        contentOffset: { y },
        layoutMeasurement: { height: ALTURA_VISIVEL },
        contentSize: { height: alturaDoConteudo },
      },
    });
  };
  const crescer = async (altura: number) => {
    await fireEvent(screen.getByLabelText(ROTULO), 'contentSizeChange', 300, altura);
  };
  const comMais = (...novas: MensagemDaConversa[]) =>
    comTema(<ConversaDaProposta {...props({ mensagens: [...historico, ...novas] })} />);

  beforeEach(() => paraOFim.mockClear());

  async function abrirNoFim() {
    const tela = await renderizar(<ConversaDaProposta {...props()} />);
    await rolarPara(900 - ALTURA_VISIVEL);
    return tela;
  }

  it('perto do fim (até 48 px): a mensagem nova rola ao fim e não aparece o botão', async () => {
    const tela = await abrirNoFim();
    await rolarPara(900 - ALTURA_VISIVEL - DISTANCIA_DO_FIM_PX);
    await tela.rerender(comMais(mensagem(3)));
    paraOFim.mockClear();
    await crescer(1000);

    expect(paraOFim).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Ver nova/ })).toBeNull();
    expect(screen.getByText('Mensagem 3')).toBeOnTheScreen();
  });

  it('longe do fim: não rola, mostra "Ver nova mensagem" e o botão rola ao fim', async () => {
    const tela = await abrirNoFim();
    await rolarPara(100);
    await tela.rerender(comMais(mensagem(3)));
    paraOFim.mockClear();
    await crescer(1000);

    expect(paraOFim).not.toHaveBeenCalled();
    const botao = screen.getByRole('button', { name: 'Ver nova mensagem' });
    // Não é região viva: o anúncio é da região viva global (ADR 0016).
    expect(screen.container.queryAll((el) => el.props.role === 'log')).toHaveLength(0);

    await fireEvent.press(botao);
    expect(paraOFim).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Ver nova/ })).toBeNull();
  });

  it('várias novas: "Ver novas mensagens"', async () => {
    const tela = await abrirNoFim();
    await rolarPara(100);
    await tela.rerender(comMais(mensagem(3), mensagem(4)));
    expect(screen.getByRole('button', { name: 'Ver novas mensagens' })).toBeOnTheScreen();
  });

  it('o botão some quando a pessoa rola de volta ao fim', async () => {
    const tela = await abrirNoFim();
    await rolarPara(100);
    await tela.rerender(comMais(mensagem(3)));
    expect(screen.getByRole('button', { name: 'Ver nova mensagem' })).toBeOnTheScreen();
    await rolarPara(1000 - ALTURA_VISIVEL, 1000);
    expect(screen.queryByRole('button', { name: /Ver nova/ })).toBeNull();
  });

  it('a mensagem que eu envio leva ao fim mesmo com a pessoa lá em cima', async () => {
    const tela = await abrirNoFim();
    await rolarPara(100);
    await tela.rerender(comMais(mensagem(3, EU)));
    paraOFim.mockClear();
    await crescer(1000);
    expect(paraOFim).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Ver nova/ })).toBeNull();
  });

  it('ao abrir, rola ao fim quando o conteúdo chega', async () => {
    await renderizar(<ConversaDaProposta {...props()} />);
    paraOFim.mockClear();
    await crescer(900);
    expect(paraOFim).toHaveBeenCalled();
  });
});

describe('ConversaDaProposta: foco ao abrir na web', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
    delete (globalThis as { document?: unknown }).document;
  });
  const web = (controla: string | null) => {
    Platform.OS = 'web';
    (globalThis as { document?: unknown }).document = {
      activeElement: { getAttribute: () => controla },
    };
  };

  it('com o foco ainda no botão que abriu (aria-controls igual ao id), vai ao título', async () => {
    web('conversa-1');
    await renderizar(<ConversaDaProposta {...props()} />);
    expect(focoMovido).toHaveBeenCalledTimes(1);
  });

  it('se a pessoa já foi para outro lugar, o foco não é roubado', async () => {
    web(null);
    await renderizar(<ConversaDaProposta {...props()} />);
    expect(focoMovido).not.toHaveBeenCalled();
  });

  it('no iPhone sempre vai ao título', async () => {
    await renderizar(<ConversaDaProposta {...props()} />);
    expect(focoMovido).toHaveBeenCalledTimes(1);
  });
});
