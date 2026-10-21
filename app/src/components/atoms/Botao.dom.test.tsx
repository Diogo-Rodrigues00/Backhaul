/**
 * @jest-environment <rootDir>/jest/ambiente-jsdom.js
 * @jest-environment-options {"customExportConditions": ["node", "node-addons"]}
 */
// Botao no DOM de verdade (jsdom + react-native-web): o efeito do `aria-disabled` em `carregando`
// (o react-native-web amarra `aria-disabled` ao `disabled` do <button>, que tiraria o foco) e o
// merge do ref externo com o interno. O Jest roda como iPhone; aqui `react-native` vira o web.
import { act, createRef, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { montarTema } from '@/state/tema/montarTema';
import { TemaContext } from '@/state/tema/TemaProvider';

import { Botao } from './Botao';

jest.mock('react-native', () => jest.requireActual('react-native-web'));
// Na web o Metro escolhe Icone.web (<svg>); o Jest escolheria o do iPhone.
// O movimento reduzido já tem teste próprio; o jsdom não tem matchMedia, que o react-native-web usa.
jest.mock('@/hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: () => false }));
jest.mock('./Icone', () => jest.requireActual('./Icone.web'));
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

async function montar(ui: ReactElement) {
  await act(async () => raiz.render(comTema(ui)));
}

function botao() {
  const el = contêiner.querySelector('button');
  if (!el) throw new Error('<button> não renderizado');
  return el;
}

beforeEach(() => {
  contêiner = document.createElement('div');
  document.body.appendChild(contêiner);
  raiz = createRoot(contêiner);
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  contêiner.remove();
});

describe('Botao em carregando (web)', () => {
  it('aria-disabled sem disabled: o botão continua focável e mantém o foco', async () => {
    await montar(<Botao>Publicar</Botao>);
    await act(async () => botao().focus());
    expect(document.activeElement).toBe(botao());

    await montar(<Botao carregando>Publicar</Botao>);
    expect(botao().getAttribute('aria-disabled')).toBe('true');
    expect(botao().getAttribute('aria-busy')).toBe('true');
    expect(botao().disabled).toBe(false);
    expect(botao().tabIndex).not.toBe(-1);
    expect(document.activeElement).toBe(botao());
  });

  it('o atributo some quando o envio termina', async () => {
    await montar(<Botao carregando>Publicar</Botao>);
    expect(botao().getAttribute('aria-disabled')).toBe('true');

    await montar(<Botao>Publicar</Botao>);
    expect(botao().hasAttribute('aria-disabled')).toBe(false);
    expect(botao().hasAttribute('aria-busy')).toBe(false);
  });

  it('desabilitado de verdade continua com disabled e aria-disabled, em carregando ou não', async () => {
    await montar(<Botao desabilitado>Salvar</Botao>);
    expect(botao().disabled).toBe(true);
    expect(botao().getAttribute('aria-disabled')).toBe('true');

    await montar(
      <Botao desabilitado carregando>
        Salvar
      </Botao>,
    );
    await montar(<Botao desabilitado>Salvar</Botao>);
    expect(botao().disabled).toBe(true);
    expect(botao().getAttribute('aria-disabled')).toBe('true');
  });
});

describe('Botao: ref externo', () => {
  it('ref de objeto aponta para o <button> e o efeito do aria-disabled continua valendo', async () => {
    const ref = createRef<unknown>();
    await montar(
      <Botao ref={ref as never} carregando>
        Publicar
      </Botao>,
    );
    expect(ref.current).toBe(botao());
    expect(botao().getAttribute('aria-disabled')).toBe('true');
  });

  it('ref de função recebe o elemento e null ao desmontar', async () => {
    const recebidos: unknown[] = [];
    await montar(<Botao ref={(no) => void recebidos.push(no)}>Publicar</Botao>);
    expect(recebidos[0]).toBe(botao());

    await act(async () => raiz.render(comTema(<div />)));
    expect(recebidos[recebidos.length - 1]).toBeNull();
  });

  it('devolver o foco ao botão que abriu o diálogo funciona pelo ref', async () => {
    const ref = createRef<{ focus: () => void }>();
    await montar(<Botao ref={ref as never}>Abrir</Botao>);
    expect(document.activeElement).not.toBe(botao());
    await act(async () => ref.current?.focus());
    expect(document.activeElement).toBe(botao());
  });
});
