// HTML da rota na web: nada de `aria-label` no `<div>` genérico (axe: aria-prohibited-attr); o texto
// visível é lido na ordem certa. Os pontos de quebra (`data-bp`) saem para o CSS decidir, sem JavaScript.
// O Jest roda como iPhone; aqui o `react-native` vira react-native-web só neste arquivo.
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { montarTema } from '@/state/tema/montarTema';
import { TemaContext } from '@/state/tema/TemaProvider';

import { LinhaRota } from './LinhaRota';

jest.mock('react-native', () => jest.requireActual('react-native-web'));
jest.mock('@/lib/armazenamento', () => ({ CHAVES: { tema: 'backhaul.tema' } }));

function html(ui: ReactElement) {
  return renderToStaticMarkup(
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
    </TemaContext.Provider>,
  );
}

describe('LinhaRota na web', () => {
  const marcado = html(<LinhaRota origem="Uberlândia - MG" destino="Uberaba - MG" />);

  it('não põe aria-label no grupo (texto visível basta)', () => {
    expect(marcado).not.toContain('aria-label');
  });

  it('o texto visível sai na ordem Coleta → Entrega', () => {
    const posicaoColeta = marcado.indexOf('Coleta em');
    const posicaoEntrega = marcado.indexOf('Entrega em');
    expect(posicaoColeta).toBeGreaterThan(-1);
    expect(posicaoEntrega).toBeGreaterThan(posicaoColeta);
    expect(marcado).toContain('Uberlândia - MG');
    expect(marcado).toContain('Uberaba - MG');
  });

  it('o traço e a quebra saem com o breakpoint compacto (decide o CSS, não o JS)', () => {
    expect(marcado).toContain('data-bp="sem-compacto"');
    expect(marcado).toContain('data-bp="so-compacto"');
  });
});
