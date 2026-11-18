// Corpo de "Aprovações" do admin (MVP-20, card 032): a fila de certificações pendentes, da mais antiga
// para a mais nova (ordem da API), com "Aprovar" e "Recusar" depois de um diálogo de confirmação. Sem
// atualização automática: só o botão "Atualizar". Nunca mostra CPF nem CNH do motorista (o fetcher
// os descarta). Carregado por React.lazy a partir de `app/admin/certificacoes.tsx` (ADR 0011).
import { useCallback, useRef, useState } from 'react';
import { View, type Text as TextoRN, type ViewStyle } from 'react-native';

import { useCertificacoesPendentes, useResponderCertificacao } from '@/api/certificacoes.hooks';
import type { AcaoCertificacao } from '@/api/tipos';
import { Link } from '@/components/atoms/Link';
import { Titulo } from '@/components/atoms/Titulo';
import { Banner, type VarianteBanner } from '@/components/molecules/Banner';
import { Lista } from '@/components/molecules/Lista';
import { CartaoCertificacaoPendente } from '@/components/organisms/CartaoCertificacaoPendente';
import { DialogoConfirmacao } from '@/components/organisms/DialogoConfirmacao';
import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { anunciar } from '@/lib/a11y';
import { ErroApi, MENSAGEM_FALHA } from '@/lib/erros';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

export const MENSAGEM_APROVADA = 'Certificação aprovada';
export const MENSAGEM_RECUSADA = 'Certificação recusada';
export const MENSAGEM_JA_DECIDIDA = 'Essa certificação já foi decidida.';

interface Pedido {
  id: string;
  acao: AcaoCertificacao;
  certificacao: string;
  motorista: string;
}

interface Aviso {
  variante: VarianteBanner;
  texto: string;
}

/** Só a mensagem de erro de negócio da API (403) aparece; o resto usa o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

function mensagemDoErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.mensagens.join(' ') : MENSAGEM_FALHA;
}

function textoDoDialogo(pedido: Pedido | null) {
  if (pedido === null) return { titulo: '', descricao: '', rotulo: '', carregando: '' };
  const quem = `${pedido.certificacao} de ${pedido.motorista}`;
  if (pedido.acao === 'aprovar') {
    return {
      titulo: `Aprovar ${quem}?`,
      descricao: 'O motorista passa a ver cargas que exigem essa certificação.',
      rotulo: 'Aprovar',
      carregando: 'Aprovando…',
    };
  }
  return {
    titulo: `Recusar ${quem}?`,
    descricao: 'O envio é apagado e o motorista pode mandar de novo.',
    rotulo: 'Recusar',
    carregando: 'Recusando…',
  };
}

function criarEstilos({ space }: TemaVisual) {
  return { corpo: { gap: space[4] } satisfies ViewStyle } as const;
}

export default function CorpoCertificacoesPendentes() {
  const estilos = useEstilos(criarEstilos);
  const { habilitado } = useCasca();
  const consulta = useCertificacoesPendentes({ habilitado });
  const responder = useResponderCertificacao();
  const { refetch } = consulta;
  const lista = consulta.data?.certificacoes;

  const [atualizando, setAtualizando] = useState(false);
  const atualizar = useCallback(async () => {
    setAtualizando(true);
    try {
      await refetch();
    } finally {
      setAtualizando(false);
    }
  }, [refetch]);

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erroDoDialogo, setErroDoDialogo] = useState<string | undefined>();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  // Quem recebe o foco quando o diálogo fecha: o botão que o abriu (cancelar) ou, depois de uma
  // decisão, o próximo cartão, ou o título da lista quando o cartão era o último.
  const retornoDoFoco = useRef<unknown>(null);
  const cartoes = useRef(new Map<string, View>());
  const tituloDaLista = useRef<TextoRN>(null);

  const abrirDialogo = (novo: Pedido, origem: View | null) => {
    retornoDoFoco.current = origem;
    setErroDoDialogo(undefined);
    setAviso(null);
    setPedido(novo);
    setAberto(true);
  };

  /** O cartão decidido sai da lista: o foco vai ao seguinte, que continua lá, ou ao título. */
  const focoDepoisDeDecidir = (id: string) => {
    const itens = lista ?? [];
    const proximo = itens[itens.findIndex((item) => item.id === id) + 1];
    retornoDoFoco.current =
      (proximo ? cartoes.current.get(proximo.id) : undefined) ?? tituloDaLista.current;
  };

  const informar = (novo: Aviso) => {
    setAviso(novo);
    anunciar(novo.texto);
  };

  const confirmar = async () => {
    if (pedido === null) return;
    const { id, acao } = pedido;
    try {
      await responder.mutateAsync({ certificacaoId: id, acao });
    } catch (erro) {
      if (erro instanceof ErroApi && erro.status === 404) {
        // Outro admin já decidiu: a fila já foi buscada de novo (onSettled do hook).
        focoDepoisDeDecidir(id);
        setAberto(false);
        informar({ variante: 'aviso', texto: MENSAGEM_JA_DECIDIDA });
      } else {
        setErroDoDialogo(mensagemDoErro(erro));
      }
      return;
    }
    focoDepoisDeDecidir(id);
    setAberto(false);
    informar({
      variante: 'ok',
      texto: acao === 'aprovar' ? MENSAGEM_APROVADA : MENSAGEM_RECUSADA,
    });
  };

  let estado: EstadoLista;
  if (!habilitado) estado = 'carregando';
  else if (lista === undefined) estado = consulta.isError ? 'erro' : 'carregando';
  else estado = lista.length === 0 ? 'vazio' : 'pronto';

  const textos = textoDoDialogo(pedido);

  return (
    <View style={estilos.corpo}>
      {/* O anúncio é de `anunciar` (uma vez, sem depender de a região viva montar a tempo). */}
      {aviso ? (
        <Banner variante={aviso.variante} anunciar={false}>
          {aviso.texto}
        </Banner>
      ) : null}
      {/* Fora do `ConteudoLista`: é o alvo estável do foco, que existe em todos os estados. */}
      <Titulo nivel={2} ref={tituloDaLista} tabIndex={-1}>
        Certificações pendentes
      </Titulo>
      <ConteudoLista
        estado={estado}
        textoCarregando="Carregando certificações pendentes…"
        vazio={{
          titulo: 'Nenhuma certificação aguardando aprovação',
          descricao: 'Quando um motorista enviar uma certificação, ela aparece aqui.',
          acao: <Link href="/admin">Ver o resumo</Link>,
          icone: 'hourglass',
        }}
        erro={{
          mensagem: mensagemDeErro(consulta.error),
          aoTentarDeNovo: atualizar,
          tentando: atualizando,
        }}
        aoAtualizar={atualizar}
        atualizando={atualizando}
      >
        <Lista
          rotulo="Certificações pendentes"
          itens={lista ?? []}
          chave={(item) => item.id}
          renderizarItem={(item) => (
            <CartaoCertificacaoPendente
              ref={(no) => {
                if (no) cartoes.current.set(item.id, no);
                else cartoes.current.delete(item.id);
              }}
              motorista={item.motorista.nome_completo}
              certificacao={item.certificacao}
              numero={item.numero_certificado}
              validade={item.validade}
              placa={item.motorista.veiculo_placa}
              enviadaEm={item.criado_em}
              aoAprovar={(origem) =>
                abrirDialogo(
                  {
                    id: item.id,
                    acao: 'aprovar',
                    certificacao: item.certificacao,
                    motorista: item.motorista.nome_completo,
                  },
                  origem,
                )
              }
              aoRecusar={(origem) =>
                abrirDialogo(
                  {
                    id: item.id,
                    acao: 'recusar',
                    certificacao: item.certificacao,
                    motorista: item.motorista.nome_completo,
                  },
                  origem,
                )
              }
            />
          )}
        />
      </ConteudoLista>

      <DialogoConfirmacao
        aberto={aberto}
        titulo={textos.titulo}
        descricao={textos.descricao}
        rotuloConfirmar={textos.rotulo}
        rotuloCarregando={textos.carregando}
        variante={pedido?.acao === 'recusar' ? 'perigo' : 'padrao'}
        carregando={responder.isPending}
        erro={erroDoDialogo}
        aoConfirmar={confirmar}
        aoFechar={() => setAberto(false)}
        refRetorno={retornoDoFoco}
      />
    </View>
  );
}
