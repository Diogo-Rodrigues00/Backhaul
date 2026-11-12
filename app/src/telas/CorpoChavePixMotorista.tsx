// Corpo de "Chave Pix" do motorista (card 047): mostra a chave atual (ou "Nenhuma chave cadastrada") e o
// formulário que cadastra e troca. Sem atualização automática. Carregado por React.lazy a partir de
// `app/motorista/chave-pix.tsx` (ADR 0011).
//
// Privacidade: a chave de CPF é dado pessoal. Decisão do card: o motorista é o dono do dado e precisa
// conferir o que cadastrou, então a chave aparece inteira (sem máscara nem botão "Mostrar"), mas só
// para ele, só na memória do cache (limpo ao sair), nunca em log, armazenamento, URL ou analytics.
import { useEffect, useRef, useState } from 'react';
import { View, type Text as TextoRN, type ViewStyle } from 'react-native';

import { useChavePix } from '@/api/chavePix.hooks';
import { Carregando } from '@/components/atoms/Carregando';
import { Texto } from '@/components/atoms/Texto';
import { Titulo } from '@/components/atoms/Titulo';
import { Banner } from '@/components/molecules/Banner';
import { EstadoErro } from '@/components/molecules/EstadoErro';
import { ListaDeFatos } from '@/components/molecules/ListaDeFatos';
import { useCasca } from '@/components/organisms/useCasca';
import type { RespostaChavePix } from '@/api/tipos';
import { anunciar, moverFoco } from '@/lib/a11y';
import { rotuloTipoChavePix } from '@/lib/chavePix';
import { ErroApi } from '@/lib/erros';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import FormularioChavePix from './FormularioChavePix';

export const MENSAGEM_SALVA = 'Chave Pix salva.';
export const AVISO_SEM_CHAVE =
  'Sem uma chave Pix cadastrada você não consegue concluir a entrega de um frete.';

/** Só a mensagem de erro de negócio da API (404 sem perfil de motorista, 403) aparece; o resto usa o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

// Largura abaixo da qual a chave atual e o formulário empilham (flex-wrap, sem medir a tela).
const BASE_ATUAL = 320;
const BASE_FORMULARIO = 380;
const ALTURA_MINIMA = 360;

function criarEstilos({ space }: TemaVisual) {
  return {
    grade: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      gap: space[6],
    } satisfies ViewStyle,
    atual: { flexGrow: 1, flexShrink: 1, flexBasis: BASE_ATUAL, minWidth: 0, gap: space[4] },
    formulario: { flexGrow: 1, flexShrink: 1, flexBasis: BASE_FORMULARIO, minWidth: 0 },
    // Mesma altura do esqueleto da casca: carregando e erro não empurram a tela.
    reserva: { minHeight: ALTURA_MINIMA } satisfies ViewStyle,
  } as const;
}

export default function CorpoChavePixMotorista() {
  const estilos = useEstilos(criarEstilos);
  const { habilitado } = useCasca();
  const consulta = useChavePix({ habilitado });
  const { refetch } = consulta;

  const [tentando, setTentando] = useState(false);
  const [salva, setSalva] = useState(false);
  const tituloDaChave = useRef<TextoRN>(null);
  const tituloDoFormulario = useRef<TextoRN>(null);
  // "Tentar de novo" desmonta o bloco do erro (e o botão focado): quando a leitura dá certo o foco
  // vai para o título que passa a ocupar o lugar (WCAG 2.4.3), em vez de cair no `body`.
  const focarAoCarregar = useRef(false);

  const dados = consulta.data;
  const pronto = habilitado && dados !== undefined;

  useEffect(() => {
    if (!focarAoCarregar.current || !pronto) return;
    focarAoCarregar.current = false;
    moverFoco(tituloDaChave);
  }, [pronto]);

  const tentarDeNovo = async () => {
    focarAoCarregar.current = true;
    setTentando(true);
    try {
      await refetch();
    } finally {
      setTentando(false);
    }
  };

  const aoSalvar = () => {
    setSalva(true);
    anunciar(MENSAGEM_SALVA);
  };

  if (!habilitado || (dados === undefined && !consulta.isError)) {
    return (
      <View style={estilos.reserva}>
        <Carregando texto="Carregando sua chave Pix…" />
      </View>
    );
  }
  if (dados === undefined) {
    return (
      <View style={estilos.reserva}>
        <EstadoErro
          mensagem={mensagemDeErro(consulta.error)}
          aoTentarDeNovo={tentarDeNovo}
          tentando={tentando}
        />
      </View>
    );
  }

  // O formulário vem primeiro: no celular o botão "Salvar chave Pix" fica acima da barra inferior fixa
  // (um alvo de toque sob a barra reprova no Lighthouse), e ele já vem preenchido com a chave atual.
  return (
    <View style={estilos.grade}>
      <View style={estilos.formulario}>
        <FormularioChavePix atual={dados} aoSalvar={aoSalvar} refTitulo={tituloDoFormulario} />
      </View>
      <View style={estilos.atual}>
        <Titulo nivel={2} ref={tituloDaChave} tabIndex={-1}>
          Sua chave Pix
        </Titulo>
        {salva ? (
          <Banner variante="ok" anunciar={false}>
            {MENSAGEM_SALVA}
          </Banner>
        ) : null}
        <ChaveAtual dados={dados} />
      </View>
    </View>
  );
}

function ChaveAtual({ dados }: { dados: RespostaChavePix }) {
  if (dados.chave_pix === null) {
    return (
      <Banner variante="aviso" titulo="Nenhuma chave cadastrada">
        {AVISO_SEM_CHAVE}
      </Banner>
    );
  }
  return (
    <>
      <ListaDeFatos
        itens={[
          { rotulo: 'Tipo', valor: rotuloTipoChavePix(dados.tipo_chave_pix) },
          { rotulo: 'Chave', valor: dados.chave_pix },
        ]}
      />
      <Texto nivel="sm" cor="secundario">
        O repasse do frete vai para esta chave quando você confirma a entrega.
      </Texto>
    </>
  );
}
