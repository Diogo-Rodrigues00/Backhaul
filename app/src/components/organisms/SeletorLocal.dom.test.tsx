/**
 * @jest-environment <rootDir>/jest/ambiente-jsdom.js
 * @jest-environment-options {"customExportConditions": ["node", "node-addons"]}
 */
// O SeletorLocal no DOM de verdade (jsdom + react-native-web), que é o que o navegador recebe:
// combobox ARIA 1.2 operado só por teclado (setas, Enter, Esc), `aria-activedescendant`, contagem em
// `role="status"` e axe com a lista aberta. O Jest roda como iPhone; aqui `react-native` vira o web.
import { act, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';

import { montarTema } from '@/state/tema/montarTema';
import { TemaContext } from '@/state/tema/TemaProvider';

import { SeletorLocal } from './SeletorLocal.web';
import type { Local } from './SeletorLocal.logica';

// axe-core vem junto do @axe-core/playwright (devDependency do e2e).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const axe = require('axe-core') as typeof import('axe-core');

const mockPermissao = jest.fn();
const mockPosicao = jest.fn();
jest.mock('react-native', () => jest.requireActual('react-native-web'));
jest.mock('./../../hooks/useMovimentoReduzido', () => ({ useMovimentoReduzido: () => false }));
jest.mock('@/components/atoms/Icone', () => jest.requireActual('@/components/atoms/Icone.web'));
jest.mock('@/lib/a11y', () => jest.requireActual('@/lib/a11y.web'));
jest.mock('@/lib/armazenamento', () => ({ CHAVES: { tema: 'backhaul.tema' } }));
jest.mock('./SeletorLocal.expoLocation', () => ({
  carregarExpoLocation: () =>
    Promise.resolve({
      requestForegroundPermissionsAsync: (...args: unknown[]) => mockPermissao(...args),
      getCurrentPositionAsync: (...args: unknown[]) => mockPosicao(...args),
      Accuracy: { Balanced: 3 },
    }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Controlado({
  permitirGps = false,
  erro,
  aoMudar = () => {},
}: {
  permitirGps?: boolean;
  erro?: string;
  aoMudar?: (local: Local | null) => void;
}) {
  const [valor, setValor] = useState<Local | null>(null);
  return (
    <SeletorLocal
      id="origem"
      rotulo="Origem"
      valor={valor}
      permitirGps={permitirGps}
      erro={erro}
      aoMudar={(novo) => {
        setValor(novo);
        aoMudar(novo);
      }}
    />
  );
}

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

function achar<T extends Element>(seletor: string): T {
  const el = contêiner.querySelector<T>(seletor);
  if (!el) throw new Error(`Não encontrado: ${seletor}`);
  return el;
}

const campo = () => achar<HTMLInputElement>('input');
const opcoes = () => Array.from(contêiner.querySelectorAll<HTMLElement>('[role="option"]'));
const ativa = () => document.getElementById(campo().getAttribute('aria-activedescendant') ?? '');

async function digitar(texto: string) {
  await act(async () => {
    campo().focus();
    const definir = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    definir.call(campo(), texto);
    campo().dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function tecla(key: string) {
  await act(async () => {
    campo().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}

async function passarTempo(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

const status = () => achar<HTMLElement>('[role="status"]').textContent;

/** axe sobre a página inteira. Contraste não roda no jsdom (sem layout): fica com o Lighthouse/Playwright. */
async function violacoesDoAxe() {
  const resultado = await axe.run(document.body, {
    // `region` é regra de página (landmarks): o organismo vive dentro do <main> do TemplateTela.
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  });
  return resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`);
}

beforeEach(() => {
  jest.useFakeTimers();
  mockPermissao.mockReset();
  mockPosicao.mockReset();
  contêiner = document.createElement('div');
  document.body.appendChild(contêiner);
  raiz = createRoot(contêiner);
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  contêiner.remove();
  jest.useRealTimers();
});

describe('SeletorLocal na web: combobox ARIA 1.2', () => {
  it('o <input> é um combobox fechado, nomeado pelo rótulo, com lista associada', async () => {
    await montar(<Controlado />);
    const entrada = campo();
    expect(entrada.getAttribute('role')).toBe('combobox');
    expect(entrada.getAttribute('aria-expanded')).toBe('false');
    expect(entrada.getAttribute('aria-autocomplete')).toBe('list');
    expect(entrada.getAttribute('aria-controls')).toBe('origem-lista');
    expect(entrada.hasAttribute('aria-activedescendant')).toBe(false);
    const nome = document.getElementById(entrada.getAttribute('aria-labelledby') ?? '');
    expect(nome?.textContent).toBe('Origem');
    expect(contêiner.querySelector('[role="listbox"]')).toBeNull();
  });

  it('digitar abre a lista (role=listbox) com a primeira opção ativa', async () => {
    await montar(<Controlado />);
    await digitar('uberl');
    expect(campo().getAttribute('aria-expanded')).toBe('true');
    const lista = achar<HTMLElement>('[role="listbox"]');
    expect(lista.id).toBe('origem-lista');
    expect(opcoes().map((o) => o.textContent)).toEqual(['Uberlândia - MG']);
    expect(ativa()).toBe(opcoes()[0]);
    expect(opcoes()[0]!.getAttribute('aria-selected')).toBe('true');
  });

  it('a busca ignora acento e maiúscula ("UBERLANDIA" acha Uberlândia)', async () => {
    await montar(<Controlado />);
    await digitar('UBERLANDIA');
    expect(opcoes().map((o) => o.textContent)).toEqual(['Uberlândia - MG']);
  });

  it('setas movem a opção ativa (aria-activedescendant muda) e dão a volta', async () => {
    await montar(<Controlado />);
    await digitar('a');
    const lista = opcoes();
    expect(lista.length).toBeGreaterThan(2);
    expect(lista.length).toBeLessThanOrEqual(8);

    await tecla('ArrowDown');
    expect(ativa()).toBe(lista[1]);
    expect(lista[1]!.getAttribute('aria-selected')).toBe('true');
    expect(lista[0]!.getAttribute('aria-selected')).toBe('false');

    await tecla('ArrowDown');
    expect(ativa()).toBe(lista[2]);
    await tecla('ArrowUp');
    expect(ativa()).toBe(lista[1]);
    await tecla('ArrowUp');
    await tecla('ArrowUp');
    expect(ativa()).toBe(lista[lista.length - 1]);
    await tecla('ArrowDown');
    expect(ativa()).toBe(lista[0]);
  });

  it('Enter escolhe a opção ativa: avisa o pai, mostra "Selecionado" e leva o foco ao "Trocar"', async () => {
    const aoMudar = jest.fn();
    await montar(<Controlado aoMudar={aoMudar} />);
    await digitar('a');
    await tecla('ArrowDown');
    const esperado = opcoes()[1]!.textContent;
    await tecla('Enter');

    expect(aoMudar).toHaveBeenCalledWith(
      expect.objectContaining({ rotulo: esperado, origem: 'cidade' }),
    );
    expect(contêiner.textContent).toContain(`Selecionado: ${esperado}`);
    expect(contêiner.querySelector('input')).toBeNull();
    const trocar = achar<HTMLElement>('[role="button"]');
    expect(trocar.textContent).toBe('Trocar');
    expect(document.activeElement).toBe(trocar);
  });

  it('"Trocar" volta ao campo de busca com o foco nele', async () => {
    const aoMudar = jest.fn();
    await montar(<Controlado aoMudar={aoMudar} />);
    await digitar('uberl');
    await tecla('Enter');
    await act(async () => achar<HTMLElement>('[role="button"]').click());
    expect(aoMudar).toHaveBeenLastCalledWith(null);
    expect(campo().value).toBe('');
    expect(document.activeElement).toBe(campo());
  });

  it('Esc fecha a lista e mantém o texto digitado', async () => {
    await montar(<Controlado />);
    await digitar('uberl');
    expect(campo().getAttribute('aria-expanded')).toBe('true');
    await tecla('Escape');
    expect(campo().getAttribute('aria-expanded')).toBe('false');
    expect(contêiner.querySelector('[role="listbox"]')).toBeNull();
    expect(campo().value).toBe('uberl');
    expect(campo().hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('ArrowDown com a lista fechada abre de novo', async () => {
    await montar(<Controlado />);
    await digitar('uberl');
    await tecla('Escape');
    await tecla('ArrowDown');
    expect(campo().getAttribute('aria-expanded')).toBe('true');
  });

  it('tocar numa opção com o mouse escolhe a cidade', async () => {
    const aoMudar = jest.fn();
    await montar(<Controlado aoMudar={aoMudar} />);
    await digitar('uberl');
    await act(async () => opcoes()[0]!.click());
    expect(aoMudar).toHaveBeenCalledWith(expect.objectContaining({ rotulo: 'Uberlândia - MG' }));
  });

  it('as opções ocupam pelo menos 48 px de altura (alvo de toque)', async () => {
    await montar(<Controlado />);
    await digitar('uberl');
    const estilos = getComputedStyle(opcoes()[0]!);
    expect(parseFloat(estilos.minHeight)).toBeGreaterThanOrEqual(48);
  });
});

describe('SeletorLocal na web: contagem de resultados', () => {
  it('só anuncia 300 ms depois da última tecla, em role="status"', async () => {
    await montar(<Controlado />);
    expect(status()).toBe('');
    await digitar('ub');
    await passarTempo(200);
    await digitar('ube');
    await passarTempo(200);
    expect(status()).toBe('');
    await passarTempo(100);
    expect(status()).toMatch(/^\d+ resultados?$/);
    expect(achar('[role="status"]').getAttribute('aria-live')).toBe('polite');
  });

  it('sem resultado: lista fechada e "Nenhuma cidade encontrada. Tente outro nome."', async () => {
    await montar(<Controlado />);
    await digitar('zzzz');
    await passarTempo(300);
    expect(status()).toBe('Nenhuma cidade encontrada. Tente outro nome.');
    expect(campo().getAttribute('aria-expanded')).toBe('false');
    expect(contêiner.querySelector('[role="listbox"]')).toBeNull();
  });
});

describe('SeletorLocal na web: erro e GPS', () => {
  it('o erro do formulário fica associado ao campo (aria-describedby e aria-invalid)', async () => {
    await montar(<Controlado erro="Escolha o local de origem." />);
    const ids = (campo().getAttribute('aria-describedby') ?? '').split(' ');
    const textos = ids.map((id) => document.getElementById(id)?.textContent);
    expect(textos).toContain('Escolha o local de origem.');
    expect(campo().getAttribute('aria-invalid')).toBe('true');
  });

  it('sem permitirGps não existe o botão "Usar minha localização"', async () => {
    await montar(<Controlado />);
    expect(contêiner.textContent).not.toContain('Usar minha localização');
  });

  it('com permitirGps: botão, ajuda e o campo vira "Ou escolha a cidade"', async () => {
    await montar(<Controlado permitirGps />);
    expect(contêiner.textContent).toContain('Usar minha localização');
    expect(contêiner.textContent).toContain('O navegador vai pedir sua permissão');
    const nome = document.getElementById(campo().getAttribute('aria-labelledby') ?? '');
    expect(nome?.textContent).toBe('Ou escolha a cidade');
    expect(achar('[role="group"]').getAttribute('aria-labelledby')).toBe('origem-grupo');
  });

  it('GPS concedido escolhe "Minha localização atual" com a cidade mais próxima', async () => {
    mockPermissao.mockResolvedValue({ status: 'granted' });
    mockPosicao.mockResolvedValue({ coords: { latitude: -18.95, longitude: -48.3 } });
    const aoMudar = jest.fn();
    await montar(<Controlado permitirGps aoMudar={aoMudar} />);
    const botao = Array.from(contêiner.querySelectorAll<HTMLElement>('[role="button"]')).find((b) =>
      b.textContent?.includes('Usar minha localização'),
    )!;
    await act(async () => botao.click());
    expect(aoMudar).toHaveBeenCalledWith(
      expect.objectContaining({
        origem: 'gps',
        rotulo: 'Minha localização atual (perto de Uberlândia - MG)',
      }),
    );
    expect(contêiner.textContent).toContain(
      'Selecionado: Minha localização atual (perto de Uberlândia - MG)',
    );
  });

  it('GPS negado: aviso explicando e o combobox continua', async () => {
    mockPermissao.mockResolvedValue({ status: 'denied' });
    await montar(<Controlado permitirGps />);
    const botao = Array.from(contêiner.querySelectorAll<HTMLElement>('[role="button"]')).find((b) =>
      b.textContent?.includes('Usar minha localização'),
    )!;
    await act(async () => botao.click());
    expect(contêiner.textContent).toContain('Não foi possível usar sua localização.');
    await digitar('uberl');
    expect(opcoes()).toHaveLength(1);
  });
});

describe('SeletorLocal na web: axe', () => {
  it('lista aberta com a opção ativa, sem violações', async () => {
    // O axe usa temporizadores de verdade: sem relógio falso nestes testes.
    jest.useRealTimers();
    await montar(<Controlado permitirGps erro="Escolha o local de origem." />);
    await digitar('a');
    await tecla('ArrowDown');
    await act(async () => {
      await new Promise((resolver) => setTimeout(resolver, 350));
    });
    expect(status()).toMatch(/resultados$/);
    expect(opcoes().length).toBeGreaterThan(1);
    expect(await violacoesDoAxe()).toEqual([]);
  });

  it('campo vazio, sem resultado, aviso de GPS e local escolhido, sem violações', async () => {
    jest.useRealTimers();
    mockPermissao.mockResolvedValue({ status: 'denied' });
    await montar(<Controlado permitirGps />);
    expect(await violacoesDoAxe()).toEqual([]);

    const botao = Array.from(contêiner.querySelectorAll<HTMLElement>('[role="button"]')).find((b) =>
      b.textContent?.includes('Usar minha localização'),
    )!;
    await act(async () => botao.click());
    await digitar('zzzz');
    expect(await violacoesDoAxe()).toEqual([]);

    await digitar('uberl');
    await tecla('Enter');
    expect(await violacoesDoAxe()).toEqual([]);
  });
});
