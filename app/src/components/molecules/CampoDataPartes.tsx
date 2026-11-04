import { useImperativeHandle, useRef, type Ref } from 'react';
import { View, type TextInput, type ViewStyle } from 'react-native';

import { Texto } from '@/components/atoms/Texto';
import { moverFoco } from '@/lib/a11y';
import { propsDeCampo } from '@/lib/a11yCampo';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import { EntradaTexto, LinhaErro, useIdCampo, type PropsCampoBase } from './campoComum';

export type ParteDaData = 'dia' | 'mes' | 'ano';

/** Os três textos digitados. O campo guarda texto (ADR 0007); `montarData` converte no envio. */
export interface ValorDataPartes {
  dia: string;
  mes: string;
  ano: string;
}

export interface PropsCampoDataPartes extends PropsCampoBase {
  valor: ValorDataPartes;
  aoMudar: (valor: ValorDataPartes) => void;
  onBlur?: () => void;
  /** Leva o foco ao primeiro campo ("Dia"): o react-hook-form usa para o erro. */
  ref?: Ref<{ focus: () => void }>;
}

// As três partes: dois dígitos, dois dígitos e quatro (ano).
const PARTES = [
  { parte: 'dia', rotulo: 'Dia', maximo: 2 },
  { parte: 'mes', rotulo: 'Mês', maximo: 2 },
  { parte: 'ano', rotulo: 'Ano', maximo: 4 },
] as const;

const LARGURA_CURTA = 88;
const LARGURA_ANO = 120;

function criarEstilos({ space }: TemaVisual) {
  return {
    grupo: { gap: space[2], minWidth: 0 } satisfies ViewStyle,
    cabeca: { gap: space[1] } satisfies ViewStyle,
    partes: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] } satisfies ViewStyle,
    parte: { gap: space[2] } satisfies ViewStyle,
    curta: { width: LARGURA_CURTA } satisfies ViewStyle,
    ano: { width: LARGURA_ANO } satisfies ViewStyle,
  } as const;
}

/**
 * Data em três campos numéricos "Dia", "Mês" e "Ano" (card 031): nenhum seletor de data nativo
 * (D-PO-02). O conjunto é um `role="group"` com o nome da data (a "legenda" do `fieldset`), e a
 * ajuda e o erro são do grupo, não de cada parte: as três partes apontam para o mesmo erro
 * (`aria-describedby`) e ficam `aria-invalid` juntas. Quem valida e converte é a tela (`montarData`).
 */
export function CampoDataPartes({
  rotulo,
  ajuda,
  erro,
  id: idDado,
  desabilitado = false,
  valor,
  aoMudar,
  onBlur,
  ref,
}: PropsCampoDataPartes) {
  const estilos = useEstilos(criarEstilos);
  const id = useIdCampo(idDado);
  const grupo = propsDeCampo({ id, rotulo, erro, ajuda });
  const primeira = useRef<TextInput>(null);

  useImperativeHandle(ref, () => ({ focus: () => moverFoco(primeira) }));

  return (
    <View
      role="group"
      nativeID={id}
      aria-labelledby={grupo.rotulo.nativeID}
      aria-describedby={grupo.campo['aria-describedby']}
      aria-disabled={desabilitado || undefined}
      accessibilityLabel={rotulo}
      accessibilityHint={grupo.campo.accessibilityHint}
      style={estilos.grupo}
    >
      <View style={estilos.cabeca}>
        <Texto {...grupo.rotulo} peso="bold">
          {rotulo}
        </Texto>
        {grupo.ajuda ? (
          <Texto {...grupo.ajuda} nivel="sm" cor="secundario">
            {ajuda}
          </Texto>
        ) : null}
      </View>
      <View style={estilos.partes}>
        {PARTES.map(({ parte, rotulo: rotuloDaParte, maximo }, indice) => {
          const idParte = `${id}-${parte}`;
          const idRotuloParte = `${idParte}-rotulo`;
          return (
            <View
              key={parte}
              style={[estilos.parte, parte === 'ano' ? estilos.ano : estilos.curta]}
            >
              <Texto nativeID={idRotuloParte} peso="bold">
                {rotuloDaParte}
              </Texto>
              <EntradaTexto
                ref={indice === 0 ? primeira : undefined}
                a11y={{
                  nativeID: idParte,
                  accessibilityLabel: `${rotuloDaParte} (${rotulo})`,
                  accessibilityHint: erro,
                  'aria-labelledby': idRotuloParte,
                  // Só o erro (a ajuda é lida uma vez, no grupo): as três partes apontam para o mesmo.
                  'aria-describedby': grupo.erro?.nativeID,
                  'aria-invalid': grupo.campo['aria-invalid'],
                }}
                desabilitado={desabilitado}
                value={valor[parte]}
                onChangeText={(texto) => aoMudar({ ...valor, [parte]: texto })}
                onBlur={onBlur}
                inputMode="numeric"
                maxLength={maximo}
                autoComplete="off"
                autoCorrect={false}
              />
            </View>
          );
        })}
      </View>
      {grupo.erro && erro ? <LinhaErro nativeID={grupo.erro.nativeID}>{erro}</LinhaErro> : null}
    </View>
  );
}
