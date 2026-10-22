import { View } from 'react-native';

import type { Urgencia } from '@/lib/rotulos';
import { brand } from '@/theme/tokens';

import { FaixaDeObra } from './FaixaDeObra';
import { ALTURA_FAIXA_URGENTE } from './faixaComum';

export interface PropsFaixaUrgencia {
  urgencia: Urgencia;
}

/**
 * Faixa no topo do cartão de carga (DS 6): Urgente tem faixa âmbar de 8 px, Crítico tem faixa de
 * obra de 12 px, Normal não tem. É reforço visual do selo de urgência (que traz texto e forma),
 * por isso não é lida pelo leitor de tela.
 */
export function FaixaUrgencia({ urgencia }: PropsFaixaUrgencia) {
  if (urgencia === 'critico') return <FaixaDeObra />;
  if (urgencia === 'urgente') {
    return (
      <View
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        style={{ height: ALTURA_FAIXA_URGENTE, backgroundColor: brand.amber }}
      />
    );
  }
  return null;
}
