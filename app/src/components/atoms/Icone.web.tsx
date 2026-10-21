// Web: <svg> direto com os paths de icones.ts. Zero biblioteca e nenhum código de
// react-native-svg no bundle web (ADR 0011).
import { createElement } from 'react';

import {
  ESPESSURA_ICONE,
  VIEWBOX_ICONE,
  tamanhoEmEm,
  type PropsDesenho,
  type PropsIcone,
} from './iconeComum';
import { icones } from './icones';

export type { PropsDesenho, PropsIcone, TamanhoIcone } from './iconeComum';

export function Desenho({
  formas,
  tamanho = 'padrao',
  cor,
  rotulo,
  viewBox = VIEWBOX_ICONE,
  espessura = ESPESSURA_ICONE,
}: PropsDesenho) {
  const lado = tamanhoEmEm(tamanho);
  const acessivel = rotulo ? { role: 'img', 'aria-label': rotulo } : { 'aria-hidden': true };

  return (
    <svg
      viewBox={viewBox}
      width={lado}
      height={lado}
      fill="none"
      stroke="currentColor"
      strokeWidth={espessura}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      // flex: none evita o desenho encolher ao lado de texto longo; a cor só entra se vier do papel.
      style={cor ? { color: cor, flex: 'none' } : { flex: 'none' }}
      {...acessivel}
    >
      {formas.map(([tag, atributos], indice) => createElement(tag, { key: indice, ...atributos }))}
    </svg>
  );
}

export function Icone({ nome, ...resto }: PropsIcone) {
  return <Desenho formas={icones[nome]} {...resto} />;
}
