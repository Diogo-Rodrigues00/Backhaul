// Confere o HTML que a lista de fatos gera na web: <dl>, <dt> e <dd> (DS 5.2). O Jest roda como iPhone;
// aqui o módulo `react-native` vira react-native-web só neste arquivo (mesmo recurso de htmlWeb.test).
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { montarTema } from '@/state/tema/montarTema';
import { TemaContext } from '@/state/tema/TemaProvider';

import { ListaDeFatos } from './ListaDeFatos.web';

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

describe('ListaDeFatos na web', () => {
  it('gera <dl> com um <dt> (rótulo) e um <dd> (valor) por item', () => {
    const marcado = html(
      <ListaDeFatos
        itens={[
          { rotulo: 'Peso', valor: '8.000 kg' },
          { rotulo: 'Placa', valor: 'ABC1D23' },
        ]}
      />,
    );
    expect(marcado).toMatch(/^<dl[ >]/);
    expect(marcado.match(/<dt[ >]/g)).toHaveLength(2);
    expect(marcado.match(/<dd[ >]/g)).toHaveLength(2);
    expect(marcado).toContain('8.000 kg');
    expect(marcado).toContain('ABC1D23');
  });

  it('o valor que não é texto (ex.: etiqueta) vai dentro do <dd>', () => {
    const marcado = html(
      <ListaDeFatos itens={[{ rotulo: 'Status', valor: <span>Aberta</span> }]} />,
    );
    expect(marcado).toMatch(/<dd[^>]*><span>Aberta<\/span><\/dd>/);
  });
});
