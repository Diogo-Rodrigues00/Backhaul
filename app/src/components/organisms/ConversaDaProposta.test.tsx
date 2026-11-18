import { fireEvent, screen } from '@testing-library/react-native';

import { moverFoco } from '@/lib/a11y';
import { ERRO_CONTATO_NA_MENSAGEM, ERRO_MENSAGEM_VAZIA } from '@/lib/mensagem';
import { renderizar } from '@/test-utils/renderComTema';

import {
  ConversaDaProposta,
  MOTIVO_CONVERSA_ENCERRADA,
  type PropsConversaDaProposta,
} from './ConversaDaProposta';

jest.mock('@/lib/a11y', () => ({
  ...jest.requireActual('@/lib/a11y'),
  moverFoco: jest.fn(),
}));

const focoMovido = moverFoco as jest.MockedFunction<typeof moverFoco>;

const EU = 'usuario-empresa';
const ELE = 'usuario-motorista';
const historico = [
  {
    id: 'm1',
    remetente_id: EU,
    texto: 'Você consegue chegar às 14h?',
    criado_em: '2026-11-04T17:00:00.000Z',
  },
  {
    id: 'm2',
    remetente_id: ELE,
    texto: 'Consigo, portão 2.',
    criado_em: '2026-11-04T17:05:00.000Z',
  },
];

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
const papel = (nome: string) => screen.container.queryAll((el) => el.props.role === nome);

beforeEach(() => focoMovido.mockClear());

describe('ConversaDaProposta: leitura', () => {
  it('título h4 "Conversa com <nome>" e foco no título ao abrir', async () => {
    await renderizar(<ConversaDaProposta {...props()} />);
    const titulo = screen.getByRole('heading', { name: 'Conversa com João da Silva' });
    expect(titulo.props['aria-level']).toBe(4);
    expect(focoMovido).toHaveBeenCalledTimes(1);
  });

  it('histórico em lista (não é log): autor em texto, "Você" para as minhas, e a hora', async () => {
    await renderizar(<ConversaDaProposta {...props()} />);
    const [lista] = papel('list');
    expect(lista).toBeDefined();
    expect(papel('log')).toHaveLength(0);
    expect(papel('listitem')).toHaveLength(2);
    expect(screen.getByText('Você')).toBeOnTheScreen();
    // O nome aparece no título e como autor.
    expect(screen.getAllByText('João da Silva').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Você consegue chegar às 14h?')).toBeOnTheScreen();
    expect(screen.getByText('Consigo, portão 2.')).toBeOnTheScreen();
    expect(screen.getAllByText(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/)).toHaveLength(2);
  });

  it('sem saber quem sou eu, ninguém vira "Você"', async () => {
    await renderizar(<ConversaDaProposta {...props({ meuUsuarioId: null })} />);
    expect(screen.queryByText('Você')).toBeNull();
  });

  it('vazio: "Nenhuma mensagem ainda" com orientação', async () => {
    await renderizar(<ConversaDaProposta {...props({ mensagens: [] })} />);
    expect(screen.getByText('Nenhuma mensagem ainda')).toBeOnTheScreen();
    expect(screen.getByText(/Comece a conversa/)).toBeOnTheScreen();
  });

  it('carregando: aviso em texto e sem campo', async () => {
    await renderizar(<ConversaDaProposta {...props({ mensagens: undefined, carregando: true })} />);
    expect(screen.getByText('Carregando a conversa…')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Mensagem')).toBeNull();
  });

  it('erro ao ler: mensagem dentro da conversa e "Tentar de novo"', async () => {
    const tentar = jest.fn();
    await renderizar(
      <ConversaDaProposta
        {...props({
          mensagens: undefined,
          erroDeCarga: 'Algo deu errado.',
          aoTentarDeNovo: tentar,
        })}
      />,
    );
    expect(screen.getByText('Algo deu errado.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Mensagem')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(tentar).toHaveBeenCalledTimes(1);
  });
});

describe('ConversaDaProposta: encerrada', () => {
  it('histórico legível, campo e botão desligados e o motivo em texto ligado ao campo', async () => {
    await renderizar(<ConversaDaProposta {...props({ encerrada: true })} />);
    expect(screen.getByText('Consigo, portão 2.')).toBeOnTheScreen();
    expect(MOTIVO_CONVERSA_ENCERRADA).toBe(
      'Esta proposta foi encerrada. Você ainda pode ler a conversa.',
    );
    const motivo = screen.getByText(MOTIVO_CONVERSA_ENCERRADA);
    expect(campo().props['aria-describedby']).toContain(motivo.props.nativeID);
    expect(campo().props.editable).toBe(false);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
    expect(screen.queryByText(/de 1000 caracteres/)).toBeNull();
  });
});

describe('ConversaDaProposta: envio', () => {
  it('contador "N de 1000 caracteres" ligado ao campo como ajuda', async () => {
    await renderizar(<ConversaDaProposta {...props()} />);
    expect(screen.getByText('0 de 1000 caracteres')).toBeOnTheScreen();
    await fireEvent.changeText(campo(), 'Combinado');
    const contador = screen.getByText('9 de 1000 caracteres');
    expect(campo().props['aria-describedby']).toBe(contador.props.nativeID);
  });

  it('sucesso: envia o texto aparado, limpa o campo e devolve o foco a ele', async () => {
    const aoEnviar = jest.fn(async () => true);
    await renderizar(<ConversaDaProposta {...props({ aoEnviar })} />);
    await fireEvent.changeText(campo(), '  Chego às 14h no portão 2  ');
    focoMovido.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(aoEnviar).toHaveBeenCalledWith('Chego às 14h no portão 2');
    expect(campo().props.value).toBe('');
    expect(focoMovido).toHaveBeenCalled();
  });

  it('recusada pela API: o texto continua no campo', async () => {
    const aoEnviar = jest.fn(async () => false);
    await renderizar(
      <ConversaDaProposta
        {...props({ aoEnviar, erroDoCampo: 'texto deve ter no máximo 1000 caracteres' })}
      />,
    );
    await fireEvent.changeText(campo(), 'Chego às 14h');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(aoEnviar).toHaveBeenCalledTimes(1);
    expect(campo().props.value).toBe('Chego às 14h');
    const erro = screen.getByText('texto deve ter no máximo 1000 caracteres');
    expect(campo().props['aria-invalid']).toBe(true);
    expect(campo().props['aria-describedby']).toContain(erro.props.nativeID);
  });

  it('vazio é barrado antes do envio, com erro no campo', async () => {
    const aoEnviar = jest.fn(async () => true);
    await renderizar(<ConversaDaProposta {...props({ aoEnviar })} />);
    await fireEvent.changeText(campo(), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));
    expect(aoEnviar).not.toHaveBeenCalled();
    expect(screen.getByText(ERRO_MENSAGEM_VAZIA)).toBeOnTheScreen();
    expect(campo().props['aria-invalid']).toBe(true);
  });

  it('telefone, e-mail ou link é barrado antes do envio e o erro some ao digitar', async () => {
    const aoEnviar = jest.fn(async () => true);
    await renderizar(<ConversaDaProposta {...props({ aoEnviar })} />);
    await fireEvent.changeText(campo(), 'Me liga: (34) 99999-8888');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));
    expect(aoEnviar).not.toHaveBeenCalled();
    expect(screen.getByText(ERRO_CONTATO_NA_MENSAGEM)).toBeOnTheScreen();
    expect(campo().props.value).toBe('Me liga: (34) 99999-8888');

    await fireEvent.changeText(campo(), 'Chego às 14h');
    expect(screen.queryByText(ERRO_CONTATO_NA_MENSAGEM)).toBeNull();
  });

  it('mais de 1000 caracteres é barrado antes do envio', async () => {
    const aoEnviar = jest.fn(async () => true);
    await renderizar(<ConversaDaProposta {...props({ aoEnviar })} />);
    await fireEvent.changeText(campo(), 'a'.repeat(1001));
    expect(screen.getByText('1001 de 1000 caracteres')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));
    expect(aoEnviar).not.toHaveBeenCalled();
    expect(screen.getByText('Use no máximo 1000 caracteres.')).toBeOnTheScreen();
  });

  it('avisa quando a pessoa mexe no texto (a tela apaga o erro da API)', async () => {
    const aoMudarTexto = jest.fn();
    await renderizar(<ConversaDaProposta {...props({ aoMudarTexto })} />);
    await fireEvent.changeText(campo(), 'a');
    expect(aoMudarTexto).toHaveBeenCalledTimes(1);
  });

  it('enviando: o botão mostra o progresso e o campo fica só para leitura', async () => {
    await renderizar(<ConversaDaProposta {...props({ enviando: true })} />);
    expect(screen.getByText('Enviando…')).toBeOnTheScreen();
    expect(campo().props.readOnly).toBe(true);
  });
});
