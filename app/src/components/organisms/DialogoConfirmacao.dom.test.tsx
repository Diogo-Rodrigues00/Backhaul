/**
 * @jest-environment <rootDir>/jest/ambiente-jsdom.js
 * @jest-environment-options {"customExportConditions": ["node", "node-addons"]}
 */
// DialogoConfirmacao no DOM de verdade (jsdom + react-native-web): foco inicial, Esc, devolução do
// foco (com `fade` e sem animação), papéis e rolagem. O Jest roda como iPhone; aqui `react-native`
// vira o web. O jsdom não anima: o fim da animação do `Modal` é disparado à mão.
import { act, createRef, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { montarTema } from '@/state/tema/montarTema';
import { TemaContext } from '@/state/tema/TemaProvider';

import { DialogoConfirmacao, type PropsDialogoConfirmacao } from './DialogoConfirmacao';

jest.mock('react-native', () => jest.requireActual('react-native-web'));
// Na web o Metro escolhe os arquivos `.web`; o Jest escolheria os do iPhone.
jest.mock('@/components/atoms/Icone', () => jest.requireActual('@/components/atoms/Icone.web'));
jest.mock('@/lib/a11y', () => jest.requireActual('@/lib/a11y.web'));
// O jsdom não tem matchMedia, que o react-native-web usa.
let mockMovimentoReduzido = false;
jest.mock('@/hooks/useMovimentoReduzido', () => ({
  useMovimentoReduzido: () => mockMovimentoReduzido,
}));
// O TemaProvider não é usado (só o contexto), mas importa o armazenamento do iPhone.
jest.mock('@/lib/armazenamento', () => ({ CHAVES: { tema: 'backhaul.tema' } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function comTema(ui: ReactElement) {
  return (
    <TemaContext.Provider
      value={{
        ...montarTema('light'),
        preferencia: 'sistema',
        esquema: 'light',
        alternar: () => {},
        pronto: true,
      }}
    >
      {ui}
    </TemaContext.Provider>
  );
}

let raiz: ReturnType<typeof createRoot>;
let contêiner: HTMLDivElement;

beforeEach(() => {
  mockMovimentoReduzido = false;
  contêiner = document.createElement('div');
  document.body.appendChild(contêiner);
  raiz = createRoot(contêiner);
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  contêiner.remove();
});

type Extras = Partial<Omit<PropsDialogoConfirmacao, 'aberto' | 'aoFechar'>>;

// Tela de teste: um botão que abre o diálogo (o "elemento de origem") e um segundo botão.
function Cena({ extras = {}, aoFechar }: { extras?: Extras; aoFechar?: () => void }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button id="origem" type="button" onClick={() => setAberto(true)}>
        Abrir
      </button>
      <button id="outro" type="button">
        Outro
      </button>
      <DialogoConfirmacao
        aberto={aberto}
        titulo="Aceitar proposta"
        descricao="Aceitar a proposta de João da Silva?"
        rotuloConfirmar="Aceitar proposta"
        aoConfirmar={() => {}}
        aoFechar={() => {
          aoFechar?.();
          setAberto(false);
        }}
        {...extras}
      />
    </>
  );
}

const porId = (id: string) => document.getElementById(id) as HTMLButtonElement;
const botaoPorNome = (nome: string) =>
  [...document.querySelectorAll<HTMLElement>('button, [role="button"]')].find(
    (el) => el.textContent === nome,
  ) as HTMLElement;
const caixa = () => document.querySelector<HTMLElement>('[aria-modal="true"]');

// `Modal` do react-native-web: <div animação> > [ponte, View do trap > caixa, ponte].
const divDaAnimacao = () => caixa()?.parentElement?.parentElement as HTMLElement;

async function terminarAnimacao() {
  await act(async () => {
    divDaAnimacao().dispatchEvent(new Event('animationend', { bubbles: true }));
  });
}

async function abrirPeloBotao() {
  await act(async () => raiz.render(comTema(<Cena />)));
  await act(async () => porId('origem').focus());
  await act(async () => porId('origem').click());
  if (!mockMovimentoReduzido) await terminarAnimacao();
}

async function apertarEsc() {
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }));
  });
}

describe('DialogoConfirmacao (web): foco com fade', () => {
  it('o foco inicial vai ao Cancelar', async () => {
    await abrirPeloBotao();
    expect(document.activeElement).toBe(botaoPorNome('Cancelar'));
  });

  it('Esc fecha e o foco volta ao botão que abriu', async () => {
    const aoFechar = jest.fn();
    await act(async () => raiz.render(comTema(<Cena aoFechar={aoFechar} />)));
    await act(async () => porId('origem').focus());
    await act(async () => porId('origem').click());
    await terminarAnimacao();

    await apertarEsc();
    expect(aoFechar).toHaveBeenCalledTimes(1);
    await terminarAnimacao();

    expect(caixa()).toBeNull();
    expect(document.activeElement).toBe(porId('origem'));
  });

  it('com refRetorno, o foco vai a ele e não ao botão ativo antes (defeito do fade)', async () => {
    const refRetorno = createRef<unknown>();
    await act(async () =>
      raiz.render(comTema(<Cena extras={{ refRetorno: refRetorno as never }} />)),
    );
    (refRetorno as { current: unknown }).current = porId('outro');
    await act(async () => porId('origem').focus());
    await act(async () => porId('origem').click());
    await terminarAnimacao();

    await apertarEsc();
    await terminarAnimacao();

    expect(document.activeElement).toBe(porId('outro'));
  });

  it('Cancelar fecha e devolve o foco', async () => {
    await abrirPeloBotao();
    await act(async () => botaoPorNome('Cancelar').click());
    await terminarAnimacao();
    expect(document.activeElement).toBe(porId('origem'));
  });

  it('Esc não fecha durante o envio', async () => {
    const aoFechar = jest.fn();
    await act(async () =>
      raiz.render(comTema(<Cena aoFechar={aoFechar} extras={{ carregando: true }} />)),
    );
    await act(async () => porId('origem').click());
    await terminarAnimacao();
    await apertarEsc();
    expect(aoFechar).not.toHaveBeenCalled();
    expect(caixa()).not.toBeNull();
  });
});

describe('DialogoConfirmacao (web): sem animação (movimento reduzido)', () => {
  beforeEach(() => {
    mockMovimentoReduzido = true;
  });

  it('foco inicial no Cancelar, Esc fecha e o foco volta a quem abriu', async () => {
    await abrirPeloBotao();
    expect(document.activeElement).toBe(botaoPorNome('Cancelar'));

    await apertarEsc();
    expect(caixa()).toBeNull();
    expect(document.activeElement).toBe(porId('origem'));
  });

  it('com refRetorno, o foco vai a ele', async () => {
    const refRetorno = createRef<unknown>();
    await act(async () =>
      raiz.render(comTema(<Cena extras={{ refRetorno: refRetorno as never }} />)),
    );
    (refRetorno as { current: unknown }).current = porId('outro');
    await act(async () => porId('origem').focus());
    await act(async () => porId('origem').click());
    await apertarEsc();
    expect(document.activeElement).toBe(porId('outro'));
  });
});

describe('DialogoConfirmacao (web): papéis e rolagem', () => {
  it('só a caixa do Modal é alertdialog, com nome e descrição; o conteúdo fica sem papel', async () => {
    await abrirPeloBotao();
    const dialogos = document.querySelectorAll('[role="alertdialog"], [role="dialog"]');
    expect(dialogos).toHaveLength(1);
    const alvo = dialogos[0] as HTMLElement;
    expect(alvo.getAttribute('role')).toBe('alertdialog');
    expect(alvo.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(alvo.getAttribute('aria-labelledby') ?? '')?.textContent).toBe(
      'Aceitar proposta',
    );
    expect(document.getElementById(alvo.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Aceitar a proposta de João da Silva?',
    );
    expect(document.querySelector('h2')?.getAttribute('aria-level')).toBe('2');
  });

  it('o papel continua alertdialog mesmo depois de o Modal ficar ativo', async () => {
    mockMovimentoReduzido = true;
    await abrirPeloBotao();
    await act(async () => {});
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.querySelectorAll('[role="alertdialog"]')).toHaveLength(1);
  });

  it('a rolagem é uma região focável por teclado, nomeada pelo título', async () => {
    await abrirPeloBotao();
    const titulo = document.querySelector('h2') as HTMLElement;
    const regiao = document.querySelector<HTMLElement>('[role="region"]');
    expect(regiao).not.toBeNull();
    expect(regiao?.tabIndex).toBe(0);
    expect(regiao?.getAttribute('aria-labelledby')).toBe(titulo.id);
  });

  it('o erro (role="alert") fica dentro do diálogo', async () => {
    await act(async () => raiz.render(comTema(<Cena extras={{ erro: 'Falhou.' }} />)));
    await act(async () => porId('origem').click());
    await terminarAnimacao();
    const alerta = document.querySelector('[role="alert"]');
    expect(alerta?.textContent).toBe('Falhou.');
    expect(caixa()?.contains(alerta)).toBe(true);
  });
});
