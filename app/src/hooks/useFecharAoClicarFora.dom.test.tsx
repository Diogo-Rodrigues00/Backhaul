/**
 * @jest-environment <rootDir>/jest/ambiente-jsdom.js
 * @jest-environment-options {"customExportConditions": ["node", "node-addons"]}
 */
// Clique fora fecha (web), no DOM de verdade (jsdom): o `pointerdown` chega ao `document` e o hook
// decide pelo elemento de `ref`. Dentro do elemento não fecha; desligado ou desmontado não ouve nada.
import { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Platform } from 'react-native';

import { useFecharAoClicarFora } from './useFecharAoClicarFora';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Teste({ ativo, fechar }: { ativo: boolean; fechar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFecharAoClicarFora(ref, ativo, fechar);
  return (
    <div>
      <div ref={ref} id="dentro">
        <button type="button" id="botao">
          dentro
        </button>
      </div>
      <button type="button" id="fora">
        fora
      </button>
    </div>
  );
}

let contêiner: HTMLDivElement;
let raiz: ReturnType<typeof createRoot>;

function pointerDown(alvo: string) {
  document.getElementById(alvo)!.dispatchEvent(new Event('pointerdown', { bubbles: true }));
}

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'web');
  contêiner = document.createElement('div');
  document.body.appendChild(contêiner);
  raiz = createRoot(contêiner);
});

afterEach(async () => {
  await act(async () => raiz.unmount());
  contêiner.remove();
  jest.restoreAllMocks();
});

describe('useFecharAoClicarFora (web)', () => {
  it('um clique fora do elemento chama fechar', async () => {
    const fechar = jest.fn();
    await act(async () => raiz.render(<Teste ativo fechar={fechar} />));
    pointerDown('fora');
    expect(fechar).toHaveBeenCalledTimes(1);
  });

  it('um clique dentro do elemento (inclusive no botão dele) não fecha', async () => {
    const fechar = jest.fn();
    await act(async () => raiz.render(<Teste ativo fechar={fechar} />));
    pointerDown('dentro');
    pointerDown('botao');
    expect(fechar).not.toHaveBeenCalled();
  });

  it('desligado, não ouve clique nenhum', async () => {
    const fechar = jest.fn();
    await act(async () => raiz.render(<Teste ativo={false} fechar={fechar} />));
    pointerDown('fora');
    expect(fechar).not.toHaveBeenCalled();
  });

  it('desmontado, o listener sai do document', async () => {
    const fechar = jest.fn();
    await act(async () => raiz.render(<Teste ativo fechar={fechar} />));
    await act(async () => raiz.unmount());
    // Os nós já saíram do DOM: o evento vai direto ao `document`, que é onde o listener estaria.
    document.dispatchEvent(new Event('pointerdown'));
    expect(fechar).not.toHaveBeenCalled();
    // Recria a raiz para o afterEach não desmontar duas vezes.
    raiz = createRoot(contêiner);
  });
});
