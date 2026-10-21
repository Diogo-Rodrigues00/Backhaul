// Símbolo da marca (docs/front/identidade/simbolo.svg): placa de advertência em losango âmbar com
// borda asfalto e uma seta de retorno (backhaul = a viagem de volta que não pode ir vazia).
// Cores da marca (`brand`), iguais nos dois temas. O losango do arquivo original é um quadrado
// girado 45°; aqui ele vem como path, para o mesmo desenho sair em <svg> e em react-native-svg
// sem depender de `transform`.
import { brand } from '@/theme/tokens';

import type { Forma } from './icones';

export const VIEWBOX_SIMBOLO = '0 0 48 48';

const TRACO_LOSANGO = 3;
const TRACO_SETA = 3.4;

export const simbolo: readonly Forma[] = [
  [
    'path',
    {
      d:
        'M20.464 5.616A5 5 0 0 1 27.536 5.616L42.384 20.464A5 5 0 0 1 42.384 27.536' +
        'L27.536 42.384A5 5 0 0 1 20.464 42.384L5.616 27.536A5 5 0 0 1 5.616 20.464Z',
      fill: brand.amber,
      stroke: brand.asphalt,
      strokeWidth: TRACO_LOSANGO,
    },
  ],
  ['path', { d: 'M17 32V21a7 7 0 0 1 14 0v8', stroke: brand.asphalt, strokeWidth: TRACO_SETA }],
  ['path', { d: 'M26.5 24.5 31 29l4.5-4.5', stroke: brand.asphalt, strokeWidth: TRACO_SETA }],
];
