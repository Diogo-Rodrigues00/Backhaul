// SeletorLocal na web: CityCombobox do DS, padrão combobox ARIA 1.2 (ADR 0009). O foco fica no
// campo; a opção ativa é apontada por `aria-activedescendant`. Setas movem, Enter escolhe, Esc fecha.
import { useState } from 'react';
import {
  Pressable,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
  type TextInputProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { Texto } from '@/components/atoms/Texto';
import { CampoRotulado, EntradaTexto, useIdCampo } from '@/components/molecules/campoComum';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

import { CascaSeletorLocal } from './SeletorLocalCasca';
import { rotuloDaCidade, useSeletorLocal, type PropsSeletorLocal } from './SeletorLocal.logica';

export type { Local, PropsSeletorLocal } from './SeletorLocal.logica';

function criarEstilos({ border, radius, space, touch }: TemaVisual) {
  return {
    lista: {
      gap: space[1],
      padding: space[1],
      borderWidth: border.width,
      borderRadius: radius.md,
    } satisfies ViewStyle,
    opcao: {
      minHeight: touch.control,
      justifyContent: 'center',
      paddingVertical: space[2],
      paddingHorizontal: space[3],
      borderWidth: border.width,
      borderRadius: radius.sm,
    } satisfies ViewStyle,
    contagem: { minHeight: space[5] } satisfies TextStyle,
  } as const;
}

// Props de combobox que o tipo do `TextInput` do React Native não prevê; o react-native-web as repassa.
type PropsCombobox = TextInputProps & {
  'aria-controls'?: string;
  'aria-activedescendant'?: string;
  'aria-autocomplete'?: 'list';
};

// O tipo `Role` do React Native não inclui "listbox"; o react-native-web o aceita e gera o HTML.
const PROPS_LISTBOX = { role: 'listbox' } as unknown as ViewProps;

export function SeletorLocal({
  rotulo,
  valor,
  aoMudar,
  permitirGps = false,
  erro,
  id: idDado,
}: PropsSeletorLocal) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  const id = useIdCampo(idDado);
  const idLista = `${id}-lista`;
  const idOpcao = (indice: number) => `${id}-opcao-${indice}`;
  const seletor = useSeletorLocal({ valor, aoMudar, permitirGps });
  const { termo, resultados, contagem } = seletor;

  const [aberta, setAberta] = useState(false);
  const [ativo, setAtivo] = useState(0);

  const quantidade = resultados.length;
  const listaVisivel = aberta && quantidade > 0;
  const indiceAtivo = Math.min(ativo, Math.max(quantidade - 1, 0));

  function aoDigitar(texto: string) {
    seletor.setTermo(texto);
    setAberta(true);
    setAtivo(0);
  }

  // Apertar uma opção com o mouse tira o foco do campo antes do clique chegar. Se o foco foi para dentro
  // da lista, ela continua aberta (senão a opção some e o clique se perde); fora dela, fecha.
  function aoPerderFoco(evento: unknown) {
    const { relatedTarget, nativeEvent } = evento as {
      relatedTarget?: unknown;
      nativeEvent?: { relatedTarget?: unknown };
    };
    const destino = relatedTarget ?? nativeEvent?.relatedTarget;
    const lista = document.getElementById(idLista);
    if (destino instanceof Node && lista?.contains(destino)) return;
    setAberta(false);
  }

  function aoTecla(evento: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    const tecla = evento.nativeEvent.key;
    if (tecla === 'ArrowDown' || tecla === 'ArrowUp') {
      evento.preventDefault();
      if (quantidade === 0) return;
      if (!aberta) {
        setAberta(true);
        return;
      }
      const passo = tecla === 'ArrowDown' ? 1 : -1;
      setAtivo((indiceAtivo + passo + quantidade) % quantidade);
    } else if (tecla === 'Enter' && listaVisivel) {
      const cidade = resultados[indiceAtivo];
      if (cidade) {
        evento.preventDefault();
        setAberta(false);
        seletor.escolher(cidade);
      }
    } else if (tecla === 'Escape' && aberta) {
      evento.preventDefault();
      setAberta(false);
    }
  }

  const propsCombobox: PropsCombobox = {
    role: 'combobox',
    'aria-expanded': listaVisivel,
    'aria-controls': idLista,
    'aria-activedescendant': listaVisivel ? idOpcao(indiceAtivo) : undefined,
    'aria-autocomplete': 'list',
    autoComplete: 'off',
    autoCorrect: false,
    submitBehavior: 'submit',
  };

  return (
    <CascaSeletorLocal
      id={id}
      rotulo={rotulo}
      valor={valor}
      permitirGps={permitirGps}
      erro={erro}
      gps={seletor.gps}
      aoUsarGps={seletor.usarGps}
      aoTrocar={seletor.trocar}
      refTrocar={seletor.refTrocar}
    >
      <CampoRotulado
        rotulo={permitirGps ? 'Ou escolha a cidade' : rotulo}
        ajuda="Digite o nome da cidade e escolha na lista."
        erro={erro}
        id={id}
      >
        {(a11y) => (
          <View>
            <EntradaTexto
              {...propsCombobox}
              a11y={a11y}
              ref={seletor.refBusca}
              value={termo}
              onChangeText={aoDigitar}
              onKeyPress={aoTecla}
              onFocus={() => {
                if (termo.trim() !== '') setAberta(true);
              }}
              onBlur={aoPerderFoco}
            />
            {listaVisivel ? (
              <View
                {...PROPS_LISTBOX}
                nativeID={idLista}
                aria-label={`Cidades para ${rotulo}`}
                style={[estilos.lista, { borderColor: colors.text.primary }]}
              >
                {resultados.map((cidade, indice) => {
                  const ativa = indice === indiceAtivo;
                  return (
                    <Pressable
                      key={cidade.id}
                      role="option"
                      nativeID={idOpcao(indice)}
                      aria-selected={ativa}
                      tabIndex={-1}
                      onBlur={aoPerderFoco}
                      onPress={() => {
                        setAberta(false);
                        seletor.escolher(cidade);
                      }}
                      style={({ hovered }) => [
                        estilos.opcao,
                        {
                          // Ativa = âmbar + borda escura + negrito (forma e peso, não só cor).
                          backgroundColor: ativa
                            ? colors.action.fill
                            : hovered
                              ? colors.bg.sunken
                              : colors.bg.surface,
                          borderColor: ativa ? colors.action.border : 'transparent',
                        },
                      ]}
                    >
                      <Texto
                        peso={ativa ? 'bold' : 'regular'}
                        cor={ativa ? 'sobreAcao' : 'primario'}
                      >
                        {rotuloDaCidade(cidade)}
                      </Texto>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <Texto
              role="status"
              aria-live="polite"
              nivel="sm"
              cor="secundario"
              style={estilos.contagem}
            >
              {contagem}
            </Texto>
          </View>
        )}
      </CampoRotulado>
    </CascaSeletorLocal>
  );
}
