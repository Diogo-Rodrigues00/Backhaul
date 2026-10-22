import { useContext } from 'react';

import {
  DisponibilidadeAtivaContext,
  type ValorDisponibilidadeAtiva,
} from './DisponibilidadeAtivaContext';

/**
 * A disponibilidade ativa do motorista e a lista dele. Só funciona dentro da área do motorista
 * (`src/app/motorista/_layout.tsx` monta o provider). "Cargas próximas" (024) e a proposta (025)
 * leem `ativa` daqui; funciona com a rota real e com o plano B (ver o provider).
 */
export function useDisponibilidadeAtiva(): ValorDisponibilidadeAtiva {
  const valor = useContext(DisponibilidadeAtivaContext);
  if (valor === null) {
    throw new Error(
      'useDisponibilidadeAtiva só funciona dentro da área do motorista (DisponibilidadeAtivaProvider).',
    );
  }
  return valor;
}
