// Web: faixa de obra (listras âmbar e asfalto a 135°) em CSS. Decorativa: não é lida.
import { brand } from '@/theme/tokens';

import { ALTURA_FAIXA_OBRA } from './faixaComum';

/** Faixa de obra do cartão crítico (DS 6): 12 px de altura, listras de 12 px. */
export function FaixaDeObra() {
  return (
    <div
      aria-hidden
      style={{
        display: 'block',
        flex: 'none',
        height: ALTURA_FAIXA_OBRA,
        width: '100%',
        backgroundImage: brand.hazardStripe,
      }}
    />
  );
}
