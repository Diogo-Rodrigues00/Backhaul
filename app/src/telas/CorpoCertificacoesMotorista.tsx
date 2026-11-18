// Corpo de "Minhas certificações" do motorista (MVP-19, card 031): a lista com a situação de cada
// certificação e o formulário que cadastra e reenvia. Sem atualização automática (o admin decide
// quando quiser): só o botão "Atualizar". Carregado por React.lazy a partir de
// `app/motorista/certificacoes.tsx` (ADR 0011).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, type Text as TextoRN, type ViewStyle } from 'react-native';

import { useCertificacoes, useMinhasCertificacoes } from '@/api/certificacoes.hooks';
import { Botao } from '@/components/atoms/Botao';
import { Carregando } from '@/components/atoms/Carregando';
import { Titulo } from '@/components/atoms/Titulo';
import { Banner } from '@/components/molecules/Banner';
import { EstadoErro } from '@/components/molecules/EstadoErro';
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
const MENSAGEM_CATALOGO = 'Não foi possível carregar as certificações para o envio. Tente de novo.';

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
  const tituloDaLista = useRef<TextoRN>(null);
  // "Tentar de novo" desmonta o bloco do erro (e o botão focado): quando a leitura dá certo o foco
  // vai para o título que passa a ocupar o lugar (WCAG 2.4.3), em vez de cair no `body`.
  const focarListaAoCarregar = useRef(false);
  const focarFormularioAoCarregar = useRef(false);
  // O botão "Reenviar" que abriu o formulário: ao cancelar o reenvio o foco volta para ele.
  const retornoDoFoco = useRef<View | null>(null);
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

  // A lista depende só de "minhas". O catálogo só alimenta o formulário: se ele falhar, a lista
  // continua e o erro aparece no lugar do formulário (com o seu próprio "Tentar de novo").
  let estado: EstadoLista;
  if (!habilitado) estado = 'carregando';
  else if (minhas.isError) estado = 'erro';
  else if (lista === undefined) estado = 'carregando';
  else estado = lista.length === 0 ? 'vazio' : 'pronto';
  const catalogoPronto = lista !== undefined && catalogo.data !== undefined;
  const catalogoComErro = lista !== undefined && catalogo.isError && catalogo.data === undefined;

  useEffect(() => {
    if (!focarListaAoCarregar.current || estado === 'erro' || estado === 'carregando') return;
    // Lista vazia: o título "Suas certificações" não existe; o foco vai ao título do formulário (o
    // mesmo destino do botão "Enviar certificação"), quando ele já está na tela.
    if (estado === 'vazio' && !catalogoPronto && !catalogoComErro) return;
    focarListaAoCarregar.current = false;
    moverFoco(estado === 'vazio' ? tituloDoFormulario : tituloDaLista);
  }, [estado, catalogoPronto, catalogoComErro]);

  useEffect(() => {
    if (!focarFormularioAoCarregar.current || !catalogoPronto) return;
    focarFormularioAoCarregar.current = false;
    moverFoco(tituloDoFormulario);
  }, [catalogoPronto]);

  const tentarDeNovoLista = () => {
    focarListaAoCarregar.current = true;
    return atualizar();
  };

  const tentarDeNovoCatalogo = () => {
    focarFormularioAoCarregar.current = true;
    return recarregarCatalogo();
  };

  const pedirReenvio = (certificacaoId: string, numero: string, origem: View | null) => {
    contadorDeReenvios.current += 1;
    retornoDoFoco.current = origem;
    setEnviada(false);
    setReenvio({ certificacaoId, numero, tentativa: contadorDeReenvios.current });
  };

  const cancelarReenvio = () => {
    setReenvio(null);
    moverFoco(retornoDoFoco);
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
              <Botao tamanho="lg" icone="plus" aoPressionar={() => moverFoco(tituloDoFormulario)}>
                Enviar certificação
              </Botao>
            ),
            icone: 'award',
          }}
          erro={{
            mensagem: mensagemDeErro(minhas.error),
            aoTentarDeNovo: tentarDeNovoLista,
            tentando: atualizando,
          }}
          aoAtualizar={atualizar}
          atualizando={atualizando}
        >
          <View style={estilos.pilha}>
            <Titulo nivel={2} ref={tituloDaLista} tabIndex={-1}>
              Suas certificações
            </Titulo>
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
                  aoReenviar={(origem) =>
                    pedirReenvio(
                      certificacao.certificacao_id,
                      certificacao.numero_certificado,
                      origem,
                    )
                  }
                />
              )}
            />
          </View>
        </ConteudoLista>
      </View>
      {catalogoPronto ? (
        <View style={estilos.formulario}>
          <FormularioCertificacao
            catalogo={itensDoCatalogo}
            minhas={lista}
            reenvio={reenvio}
            aoEnviar={aoEnviar}
            aoConflito={() => void atualizar()}
            aoCancelarReenvio={cancelarReenvio}
            refTitulo={tituloDoFormulario}
          />
        </View>
      ) : null}
      {catalogoComErro ? (
        <View style={[estilos.formulario, estilos.pilha]}>
          <Titulo nivel={2} ref={tituloDoFormulario} tabIndex={-1}>
            Enviar certificação
          </Titulo>
          <EstadoErro
            mensagem={mensagemDeErro(catalogo.error) ?? MENSAGEM_CATALOGO}
            aoTentarDeNovo={() => void tentarDeNovoCatalogo()}
            tentando={catalogo.isFetching}
          />
        </View>
      ) : null}
      {lista !== undefined && !catalogoPronto && !catalogoComErro ? (
        <View style={estilos.formulario}>
          <Carregando texto="Carregando o formulário…" />
        </View>
      ) : null}
    </View>
  );
}
