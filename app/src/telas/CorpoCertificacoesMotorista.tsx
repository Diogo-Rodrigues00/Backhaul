// Corpo de "Minhas certificações" do motorista (MVP-19, card 031): a lista com a situação de cada
// certificação e o formulário que cadastra e reenvia. Sem atualização automática (o admin decide
// quando quiser): só o botão "Atualizar". Carregado por React.lazy a partir de
// `app/motorista/certificacoes.tsx` (ADR 0011).
import { useCallback, useMemo, useRef, useState } from 'react';
import { View, type Text as TextoRN, type ViewStyle } from 'react-native';

import { useCertificacoes, useMinhasCertificacoes } from '@/api/certificacoes.hooks';
import { Botao } from '@/components/atoms/Botao';
import { Titulo } from '@/components/atoms/Titulo';
import { Banner } from '@/components/molecules/Banner';
import { Lista } from '@/components/molecules/Lista';
import { CartaoCertificacao } from '@/components/organisms/CartaoCertificacao';
import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { anunciar, moverFoco } from '@/lib/a11y';
import { ErroApi } from '@/lib/erros';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

import FormularioCertificacao, { type PedidoDeReenvio } from './FormularioCertificacao';

export const MENSAGEM_ENVIADA = 'Certificação enviada. Aguardando aprovação.';

/** Só a mensagem de erro de negócio da API (404 sem perfil de motorista, 403) aparece; o resto usa o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

// Largura abaixo da qual a lista e o formulário empilham (flex-wrap, sem medir a tela).
const BASE_LISTA = 360;
const BASE_FORMULARIO = 380;

function criarEstilos({ space }: TemaVisual) {
  return {
    grade: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      gap: space[6],
    } satisfies ViewStyle,
    lista: { flexGrow: 1, flexShrink: 1, flexBasis: BASE_LISTA, minWidth: 0, gap: space[4] },
    formulario: { flexGrow: 1, flexShrink: 1, flexBasis: BASE_FORMULARIO, minWidth: 0 },
    pilha: { gap: space[4] } satisfies ViewStyle,
  } as const;
}

export default function CorpoCertificacoesMotorista() {
  const estilos = useEstilos(criarEstilos);
  const { habilitado } = useCasca();
  const minhas = useMinhasCertificacoes({ habilitado });
  const catalogo = useCertificacoes({ habilitado });
  const { refetch: recarregarMinhas } = minhas;
  const { refetch: recarregarCatalogo } = catalogo;

  const [atualizando, setAtualizando] = useState(false);
  const [reenvio, setReenvio] = useState<PedidoDeReenvio | null>(null);
  const [recente, setRecente] = useState<string | null>(null);
  const [enviada, setEnviada] = useState(false);
  const tituloDoFormulario = useRef<TextoRN>(null);
  const contadorDeReenvios = useRef(0);

  const atualizar = useCallback(async () => {
    setAtualizando(true);
    try {
      await Promise.all([recarregarMinhas(), catalogo.isError ? recarregarCatalogo() : null]);
    } finally {
      setAtualizando(false);
    }
  }, [recarregarMinhas, recarregarCatalogo, catalogo.isError]);

  // A API devolve em ordem alfabética (MVP-19): o app não reordena.
  const lista = minhas.data?.certificacoes;
  const itensDoCatalogo = useMemo(() => catalogo.data?.certificacoes ?? [], [catalogo.data]);

  let estado: EstadoLista;
  if (!habilitado) estado = 'carregando';
  else if (minhas.isError || (catalogo.isError && lista === undefined)) estado = 'erro';
  else if (lista === undefined || catalogo.data === undefined) estado = 'carregando';
  else estado = lista.length === 0 ? 'vazio' : 'pronto';
  const formularioPronto = lista !== undefined && catalogo.data !== undefined;
  const erro = minhas.isError ? minhas.error : catalogo.error;

  const pedirReenvio = (certificacaoId: string, numero: string) => {
    contadorDeReenvios.current += 1;
    setEnviada(false);
    setReenvio({ certificacaoId, numero, tentativa: contadorDeReenvios.current });
  };

  const aoEnviar = (certificacaoId: string) => {
    setReenvio(null);
    setRecente(certificacaoId);
    setEnviada(true);
    anunciar(MENSAGEM_ENVIADA);
  };

  return (
    <View style={estilos.grade}>
      <View style={estilos.lista}>
        {/* O anúncio é de `anunciar` (uma vez, sem depender de a região viva montar a tempo). */}
        {enviada ? (
          <Banner variante="ok" anunciar={false}>
            {MENSAGEM_ENVIADA}
          </Banner>
        ) : null}
        <ConteudoLista
          estado={estado}
          textoCarregando="Carregando suas certificações…"
          vazio={{
            titulo: 'Você ainda não enviou certificações',
            descricao:
              'Para ver cargas que exigem MOPP, envie sua certificação e espere o administrador aprovar.',
            acao: (
              <Botao
                tamanho="lg"
                icone="plus"
                aoPressionar={() => moverFoco(tituloDoFormulario)}
              >
                Enviar certificação
              </Botao>
            ),
            icone: 'award',
          }}
          erro={{
            mensagem: mensagemDeErro(erro),
            aoTentarDeNovo: atualizar,
            tentando: atualizando,
          }}
          aoAtualizar={atualizar}
          atualizando={atualizando}
        >
          <View style={estilos.pilha}>
            <Titulo nivel={2}>Suas certificações</Titulo>
            <Lista
              rotulo="Certificações enviadas"
              itens={lista ?? []}
              chave={(certificacao) => certificacao.id}
              renderizarItem={(certificacao) => (
                <CartaoCertificacao
                  nome={certificacao.nome}
                  numero={certificacao.numero_certificado}
                  validade={certificacao.validade}
                  situacao={certificacao.situacao}
                  recente={certificacao.certificacao_id === recente}
                  aoReenviar={() =>
                    pedirReenvio(certificacao.certificacao_id, certificacao.numero_certificado)
                  }
                />
              )}
            />
          </View>
        </ConteudoLista>
      </View>
      {formularioPronto ? (
        <View style={estilos.formulario}>
          <FormularioCertificacao
            catalogo={itensDoCatalogo}
            minhas={lista}
            reenvio={reenvio}
            aoEnviar={aoEnviar}
            aoConflito={() => void atualizar()}
            aoCancelarReenvio={() => setReenvio(null)}
            refTitulo={tituloDoFormulario}
          />
        </View>
      ) : null}
    </View>
  );
}
