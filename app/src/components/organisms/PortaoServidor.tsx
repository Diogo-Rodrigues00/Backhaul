import { useEffect, useRef, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { Botao } from '@/components/atoms/Botao';
import { Icone } from '@/components/atoms/Icone';
import { Banner } from '@/components/molecules/Banner';
import { EstradaAnimada } from '@/components/molecules/EstradaAnimada';
import { TemplateCentralizado } from '@/components/templates/TemplateCentralizado';
import { anunciar } from '@/lib/a11y';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';
import { useTema } from '@/state/tema/useTema';

import { Cabecalho } from './Cabecalho';

/** Mesmos valores de `EstadoPortao` em `api/saude` (organismo não importa `api`). */
export type EstadoDoPortao = 'verificando' | 'lento' | 'pronto' | 'falhou';

export interface PropsPortaoServidor {
  estado: EstadoDoPortao;
  tentativa: number;
  totalTentativas: number;
  /** Segundos entre as tentativas, para o aviso "Nova tentativa em N segundos". */
  intervaloSegundos: number;
  aoTentarDeNovo: () => void;
  children: ReactNode;
}

const LADO_ICONE_FALHA = 36;

function criarEstilos({ colors, border, space }: TemaVisual) {
  return {
    medalha: {
      width: 72,
      height: 72,
      borderRadius: 36,
      borderWidth: border.widthStrong,
      borderColor: colors.text.primary,
      backgroundColor: colors.bg.highlight,
      alignItems: 'center',
      justifyContent: 'center',
    } satisfies ViewStyle,
    aviso: { width: '100%', marginTop: space[1] } satisfies ViewStyle,
  } as const;
}

/**
 * Portão do servidor (ADR 0005, D-PO-15). `verificando` e `pronto` mostram a tela normal; a tela
 * "Conectando ao servidor" só aparece em `lento` (a verificação passou de 500 ms) e some sozinha
 * quando o servidor responde. `falhou` (90 s sem resposta) oferece "Tentar de novo".
 * Na região educada o leitor de tela ouve "Conectando ao servidor" uma vez e "Servidor conectado"
 * quando ele acorda; o contador de tentativas é só visual (não é região viva).
 */
export function PortaoServidor({
  estado,
  tentativa,
  totalTentativas,
  intervaloSegundos,
  aoTentarDeNovo,
  children,
}: PropsPortaoServidor) {
  const anterior = useRef<EstadoDoPortao | null>(null);

  useEffect(() => {
    // Um anúncio por mudança de estado: o contador de tentativas muda a cada 5 s e fica mudo.
    if (anterior.current !== 'lento' && estado === 'lento') {
      anunciar('Conectando ao servidor. Pode levar até 1 minuto.');
    } else if (anterior.current === 'lento' && estado === 'pronto') {
      anunciar('Servidor conectado.');
    }
    anterior.current = estado;
  }, [estado]);

  if (estado === 'lento') {
    return (
      <TelaConectando
        tentativa={tentativa}
        totalTentativas={totalTentativas}
        intervaloSegundos={intervaloSegundos}
      />
    );
  }
  if (estado === 'falhou') {
    return <TelaFalha aoTentarDeNovo={aoTentarDeNovo} />;
  }
  return <>{children}</>;
}

function TelaConectando({
  tentativa,
  totalTentativas,
  intervaloSegundos,
}: Pick<PropsPortaoServidor, 'tentativa' | 'totalTentativas' | 'intervaloSegundos'>) {
  const estilos = useEstilos(criarEstilos);
  return (
    <TemplateCentralizado
      titulo="Conectando ao servidor"
      descricao="O servidor pode levar até 1 minuto para acordar. Fique nesta tela, ela libera sozinha."
      cabecalho={<Cabecalho variante="simples" />}
      ilustracao={<EstradaAnimada />}
    >
      <View style={estilos.aviso}>
        <Banner
          variante="info"
          anunciar={false}
          titulo={`Tentativa ${tentativa} de ${totalTentativas}`}
        >
          {`Nova tentativa em ${intervaloSegundos} segundos.`}
        </Banner>
      </View>
    </TemplateCentralizado>
  );
}

function TelaFalha({ aoTentarDeNovo }: Pick<PropsPortaoServidor, 'aoTentarDeNovo'>) {
  const estilos = useEstilos(criarEstilos);
  const { colors } = useTema();
  return (
    <TemplateCentralizado
      titulo="Não foi possível conectar ao servidor"
      descricao="Passou de 1 minuto e o servidor não respondeu. Confira sua internet e tente de novo."
      descricaoComoAlerta
      cabecalho={<Cabecalho variante="simples" />}
      ilustracao={
        <View aria-hidden style={estilos.medalha}>
          <Icone nome="wifi-off" tamanho={LADO_ICONE_FALHA} cor={colors.text.primary} />
        </View>
      }
    >
      <Botao tamanho="lg" icone="refresh" aoPressionar={aoTentarDeNovo}>
        Tentar de novo
      </Botao>
    </TemplateCentralizado>
  );
}
