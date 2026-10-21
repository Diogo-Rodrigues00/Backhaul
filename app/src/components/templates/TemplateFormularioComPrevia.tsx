import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Responsivo } from '@/components/molecules/Responsivo';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { TemplateTela, type PropsTemplateTela } from './TemplateTela';

export interface PropsTemplateFormularioComPrevia extends Omit<PropsTemplateTela, 'children'> {
  /** O formulário (`CartaoFormulario`), na coluna principal. */
  children: ReactNode;
  /** Lateral de 340 px (prévia da carga, dicas). Some em telas até 960 px, sem JavaScript na web. */
  previa?: ReactNode;
}

const LARGURA_PREVIA = 340;

function criarEstilos({ space }: TemaVisual) {
  return {
    grade: { flexDirection: 'row', alignItems: 'flex-start', gap: space[6] } satisfies ViewStyle,
    formulario: { flex: 1, minWidth: 0 } satisfies ViewStyle,
    previa: { width: LARGURA_PREVIA, flexShrink: 0 } satisfies ViewStyle,
  } as const;
}

/**
 * Formulário logado com lateral (FormWithPreviewTemplate, DS 5.4): `TemplateTela` + grade com o
 * formulário e, ao lado, a prévia de 340 px. A lateral some no ponto em que a barra de abas assume
 * (`sem-barra`, 960 px): é o ponto de quebra do tema, em vez dos 900 px do protótipo, para a tela
 * não ter dois comportamentos próximos.
 */
export function TemplateFormularioComPrevia({
  children,
  previa,
  ...tela
}: PropsTemplateFormularioComPrevia) {
  const estilos = useEstilos(criarEstilos);

  return (
    <TemplateTela {...tela}>
      <View style={estilos.grade}>
        <View style={estilos.formulario}>{children}</View>
        {previa ? (
          <Responsivo bp="sem-barra" style={estilos.previa}>
            {previa}
          </Responsivo>
        ) : null}
      </View>
    </TemplateTela>
  );
}
