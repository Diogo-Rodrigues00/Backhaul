/**
 * @jest-environment <rootDir>/jest/ambiente-jsdom.js
 * @jest-environment-options {"customExportConditions": ["node", "node-addons"]}
 */
// Fechamento do "Mais" na web, no DOM de verdade (jsdom): clique fora, Esc no `document` e saída de foco
// pelo Tab. Dentro da raiz nada fecha; desligado ou desmontado não ouve nada.
import { act, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Platform } from 'react-native';

import { useFecharAoClicarFora, type MotivoFechamento } from './useFecharAoClicarFora';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Teste({ ativo, fechar }: { ativo: boolean; fechar: (motivo: MotivoFechamento) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFecharAoClicarFora(ref, ativo, fechar);
  return (
    <div>
      <div ref={ref} id="dentro">
        <button type="button" id="botao">
          dentro
        </button>
        <button type="button" id="outro-dentro">
          outro dentro
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

const elemento = (id: string) => document.getElementById(id) as HTMLElement;

function pointerDown(alvo: string) {
  elemento(alvo).dispatchEvent(new Event('pointerdown', { bubbles: true }));
}

function pointerUp(alvo: string) {
  elemento(alvo).dispatchEvent(new Event('pointerup', { bubbles: true }));
}

/** Saída de foco de `de` para `para` (ou para lugar nenhum, com `para` = null), como o navegador faz. */
function sairDoFoco(de: string, para: string | null) {
  elemento(de).dispatchEvent(
    new FocusEvent('focusout', {
      bubbles: true,
      relatedTarget: para === null ? null : elemento(para),
    }),
  );
}

async function montar(ativo: boolean, fechar: (motivo: MotivoFechamento) => void) {
  await act(async () => raiz.render(<Teste ativo={ativo} fechar={fechar} />));
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
  describe('clique fora', () => {
    it('um clique fora do elemento fecha com o motivo "clique-fora"', async () => {
      const fechar = jest.fn();
      await montar(true, fechar);
      pointerDown('fora');
      expect(fechar).toHaveBeenCalledWith('clique-fora');
    });

    it('um clique dentro do elemento (inclusive no botão dele) não fecha', async () => {
      const fechar = jest.fn();
      await montar(true, fechar);
      pointerDown('dentro');
      pointerDown('botao');
      expect(fechar).not.toHaveBeenCalled();
    });
  });

  describe('Esc', () => {
    it('Esc fecha com o motivo "escape" mesmo com o foco fora da raiz', async () => {
      const fechar = jest.fn();
      await montar(true, fechar);
      elemento('fora').focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(fechar).toHaveBeenCalledWith('escape');
    });

    it('outras teclas não fecham', async () => {
      const fechar = jest.fn();
      await montar(true, fechar);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(fechar).not.toHaveBeenCalled();
    });
  });

  describe('saída de foco pelo Tab', () => {
    it('o foco indo para fora da raiz fecha com o motivo "foco-saiu"', async () => {
      const fechar = jest.fn();
      await montar(true, fechar);
      sairDoFoco('botao', 'fora');
      expect(fechar).toHaveBeenCalledWith('foco-saiu');
    });

    it('o foco indo para outro elemento de dentro da raiz não fecha', async () => {
      const fechar = jest.fn();
      await montar(true, fechar);
      sairDoFoco('botao', 'outro-dentro');
      expect(fechar).not.toHaveBeenCalled();
    });

    it('foco que sai sem destino (fora de qualquer elemento) fecha', async () => {
      const fechar = jest.fn();
      await montar(true, fechar);
      sairDoFoco('botao', null);
      expect(fechar).toHaveBeenCalledWith('foco-saiu');
    });

    it('foco que "some" logo depois de um toque dentro da raiz não fecha (Safari não põe foco no botão)', async () => {
      const fechar = jest.fn();
      await montar(true, fechar);
      pointerDown('botao');
      sairDoFoco('botao', null);
      expect(fechar).not.toHaveBeenCalledWith('foco-saiu');
      pointerUp('botao');
      sairDoFoco('botao', null);
      expect(fechar).toHaveBeenCalledWith('foco-saiu');
    });
  });

  it('desligado, não ouve nenhum dos três', async () => {
    const fechar = jest.fn();
    await montar(false, fechar);
    pointerDown('fora');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    sairDoFoco('botao', 'fora');
    expect(fechar).not.toHaveBeenCalled();
  });

  it('desmontado, os listeners saem do document e da raiz', async () => {
    const fechar = jest.fn();
    await montar(true, fechar);
    const dentro = elemento('dentro');
    await act(async () => raiz.unmount());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    document.dispatchEvent(new Event('pointerdown'));
    dentro.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(fechar).not.toHaveBeenCalled();
    // Recria a raiz para o afterEach não desmontar duas vezes.
    raiz = createRoot(contêiner);
  });
});
