// Web: `<dl>`, `<dt>` e `<dd>` de verdade (DS 5.2, ADR 0009). Cada item vai dentro de um `<div>`,
// que a HTML aceita como grupo dentro de `<dl>`, e o leitor de tela lê rótulo e valor em par.
import type { CSSProperties } from 'react';

import { Texto } from '@/components/atoms/Texto';
import { space } from '@/theme/tokens';

import { LARGURA_MINIMA_ITEM, type PropsListaDeFatos } from './listaDeFatosComum';

export type { ItemDeFato, PropsListaDeFatos } from './listaDeFatosComum';

// Elementos HTML diretos: o estilo vai ao DOM como CSS, não pelo StyleSheet do RN.
// Margens do navegador zeradas (o dd tem recuo padrão de 40 px). Valores vêm dos tokens.
const estiloGrade: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${LARGURA_MINIMA_ITEM}px, 1fr))`,
  columnGap: space[4],
  rowGap: space[3],
  margin: 0,
  padding: 0,
};
const estiloItem: CSSProperties = { display: 'flex', flexDirection: 'column', gap: space[1] };
const estiloZerado: CSSProperties = { margin: 0, padding: 0 };

/** Fatos em grade (FactList) como `<dl>` na web. */
export function ListaDeFatos({ itens }: PropsListaDeFatos) {
  return (
    <dl style={estiloGrade}>
      {itens.map(({ rotulo, valor }, indice) => (
        <div key={`${indice}-${rotulo}`} style={estiloItem}>
          <dt style={estiloZerado}>
            <Texto nivel="sm" cor="secundario">
              {rotulo}
            </Texto>
          </dt>
          <dd style={estiloZerado}>
            {typeof valor === 'string' ? (
              <Texto nivel="base" peso="bold">
                {valor}
              </Texto>
            ) : (
              valor
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
