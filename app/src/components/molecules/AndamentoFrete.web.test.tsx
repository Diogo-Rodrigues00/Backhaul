// HTML do andamento na web: a etapa atual sai com `aria-current="step"` (não só cor) e a lista tem papel.
// O Jest roda como iPhone; aqui o `react-native` vira react-native-web só neste arquivo (mesmo recurso de htmlWeb.test).
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { montarTema } from '@/state/tema/montarTema';
import { TemaContext } from '@/state/tema/TemaProvider';

import { AndamentoFrete } from './AndamentoFrete';

jest.mock('react-native', () => jest.requireActual('react-native-web'));
// Na web o Metro escolhe Icone.web (<svg>); o Jest escolheria o do iPhone.
jest.mock('@/components/atoms/Icone', () => jest.requireActual('@/components/atoms/Icone.web'));
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

describe('AndamentoFrete na web', () => {
  it('a etapa atual leva aria-current="step" e só ela', () => {
    const marcado = html(<AndamentoFrete statusEntrega="em_transito" />);
    expect(marcado.match(/aria-current="step"/g)).toHaveLength(1);
    expect(marcado).toMatch(
      /role="listitem"[^>]*aria-current="step"|aria-current="step"[^>]*role="listitem"/,
    );
  });

  it('a lista tem papel de lista e nome', () => {
    const marcado = html(<AndamentoFrete statusEntrega="aceito" />);
    expect(marcado).toContain('role="list"');
    expect(marcado).toContain('aria-label="Andamento do frete"');
    expect(marcado.match(/role="listitem"/g)).toHaveLength(3);
  });
});
