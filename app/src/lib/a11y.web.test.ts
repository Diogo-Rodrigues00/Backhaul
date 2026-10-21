import type { RefObject } from 'react';

import { anunciar, moverFoco } from './a11y.web';
import { ouvirAnuncios } from './a11yComum';

describe('a11y web', () => {
  it('anunciar entrega a mensagem à região viva sem mover o foco', () => {
    const ouvinte = jest.fn();
    const parar = ouvirAnuncios(ouvinte);

    anunciar('Lista atualizada');

    expect(ouvinte).toHaveBeenCalledWith('Lista atualizada');
    parar();
  });

  it('moverFoco chama focus() do elemento', () => {
    const focus = jest.fn();
    const ref = { current: { focus } } as RefObject<unknown>;

    moverFoco(ref);

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('moverFoco não falha sem elemento ou sem focus()', () => {
    expect(() => moverFoco({ current: null } as RefObject<unknown>)).not.toThrow();
    expect(() => moverFoco({ current: {} } as RefObject<unknown>)).not.toThrow();
  });
});
