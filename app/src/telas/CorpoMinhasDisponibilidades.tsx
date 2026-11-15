// Corpo de "Minhas disponibilidades" do motorista (MVP-11, CT-01 a CT-10; cancelar: MVP-22, card 034).
// Abre por React.lazy (`CorpoMinhasDisponibilidades.carregar.ts`), fora do JS inicial da rota, já com o
// cliente de dados: a mutation de cancelar precisa dele (ADR 0004, adendo). A lista e a ativa vêm do
// provider da área (DisponibilidadeAtivaProvider), que também cuida do plano B. Sem atualização
// automática: só "Atualizar".
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { useCancelarDisponibilidade } from '@/api/cancelarDisponibilidade.hooks';
import { Link } from '@/components/atoms/Link';
import { Banner } from '@/components/molecules/Banner';
import { Lista } from '@/components/molecules/Lista';
import {
  CartaoDisponibilidade,
  rotuloLocalDisponibilidade,
} from '@/components/organisms/CartaoDisponibilidade';
import { DialogoConfirmacao } from '@/components/organisms/DialogoConfirmacao';
import { ConteudoLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { anunciar } from '@/lib/a11y';
import type { Disponibilidade } from '@/lib/disponibilidadeAtiva';
import { ErroApi, MENSAGEM_FALHA } from '@/lib/erros';
import { useDisponibilidadeAtiva } from '@/state/disponibilidade-ativa/useDisponibilidadeAtiva';

/** Só a mensagem de erro de negócio (403, 404, 409 com `erro`) aparece; 500 e falhas usam o padrão. */
function mensagemDeErroDaLista(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

/** Texto do diálogo e do aviso: a mensagem da API (409, 404) ou a frase padrão de falha. */
function mensagemDeErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.mensagens.join(' ') : MENSAGEM_FALHA;
}

function eStatus(erro: unknown, status: number): boolean {
  return erro instanceof ErroApi && erro.status === status;
}

/** "perto de Araguari - MG", com a inicial minúscula, para frases e anúncios. */
function descreverLocal(disponibilidade: Disponibilidade): string {
  const local = rotuloLocalDisponibilidade(disponibilidade.local);
  return `${local.charAt(0).toLowerCase()}${local.slice(1)}`;
}

interface Pedido {
  id: string;
  /** Era a ativa: ao cancelar, a troca é anunciada. */
  eraAtiva: boolean;
}

/** Aviso acima da lista: confirma o cancelamento ou explica por que não foi possível. */
interface Aviso {
  variante: 'ok' | 'erro';
  titulo: string;
  texto?: string;
}

export default function CorpoMinhasDisponibilidades() {
  const {
    ativa,
    carregando,
    disponibilidades,
    erro,
    definirAtiva,
    marcarCancelada,
    atualizar,
    atualizando,
  } = useDisponibilidadeAtiva();
  const cancelar = useCancelarDisponibilidade();

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erroDoDialogo, setErroDoDialogo] = useState<string | undefined>();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  // Ao fechar o diálogo, o foco vai ao aviso (depois de cancelar). Sem aviso, volta a quem abriu.
  const refAviso = useRef<View>(null);

  const estado: EstadoLista = erro
    ? 'erro'
    : carregando
      ? 'carregando'
      : disponibilidades.length === 0
        ? 'vazio'
        : 'pronto';

  const publicar = (
    <Link href="/motorista/disponibilidades/nova" aparencia={{ icone: 'plus' }}>
      Publicar disponibilidade
    </Link>
  );

  // Anuncia na região viva (sem mover o foco): quem usa leitor de tela precisa saber que mudou.
  const usar = (id: string) => {
    const escolhida = disponibilidades.find((item) => item.id === id);
    definirAtiva(id);
    if (escolhida) anunciar(`Disponibilidade ativa: ${descreverLocal(escolhida)}`);
  };

  const pedirCancelamento = (id: string) => {
    const alvo = disponibilidades.find((item) => item.id === id);
    if (alvo === undefined) return;
    // Um aviso antigo sai antes do diálogo: assim, "Voltar" devolve o foco ao botão, não ao aviso.
    setAviso(null);
    setErroDoDialogo(undefined);
    setPedido({ id, eraAtiva: ativa?.id === id });
    setAberto(true);
  };

  const confirmar = async () => {
    if (pedido === null) return;
    try {
      await cancelar.mutateAsync(pedido.id);
    } catch (falha) {
      // 409: já não está aberta. 404: não existe ou é de outro motorista. Nos dois casos a lista é relida
      // e a cópia local (plano B) sai, se for ela. O foco vai ao aviso com a mensagem da API.
      if (eStatus(falha, 409) || eStatus(falha, 404)) {
        marcarCancelada(pedido.id);
        setAviso({
          variante: 'erro',
          titulo: 'Não foi possível cancelar.',
          texto: mensagemDeErro(falha),
        });
        setAberto(false);
        void atualizar();
      } else {
        setErroDoDialogo(mensagemDeErro(falha));
      }
      return;
    }

    // A ativa é recalculada agora, sem esperar a releitura: a próxima aberta e no prazo, ou nenhuma.
    const nova = marcarCancelada(pedido.id);
    const textoDaAtiva = nova
      ? `Ativa agora: ${descreverLocal(nova)}`
      : 'Nenhuma disponibilidade ativa.';
    setAviso({
      variante: 'ok',
      titulo: 'Disponibilidade cancelada.',
      texto: pedido.eraAtiva ? textoDaAtiva : undefined,
    });
    setAberto(false);
    if (pedido.eraAtiva) {
      anunciar(
        nova ? `Disponibilidade ativa: ${descreverLocal(nova)}` : 'Nenhuma disponibilidade ativa.',
      );
    }
  };

  return (
    <>
      {aviso ? (
        <View ref={refAviso} tabIndex={-1}>
          <Banner
            variante={aviso.variante}
            titulo={aviso.titulo}
            // O sucesso recebe o foco, que o leitor de tela lê; por isso não se repete numa região viva.
            anunciar={aviso.variante === 'erro'}
          >
            {aviso.texto}
          </Banner>
        </View>
      ) : null}

      <ConteudoLista
        estado={estado}
        textoCarregando="Carregando disponibilidades…"
        vazio={{
          titulo: 'Nenhuma disponibilidade publicada',
          descricao: 'Publique uma disponibilidade para ver as cargas perto de você.',
          acao: publicar,
          icone: 'locate',
        }}
        erro={{ mensagem: mensagemDeErroDaLista(erro) }}
        aoAtualizar={() => atualizar()}
        atualizando={atualizando}
      >
        <Lista
          rotulo="Disponibilidades publicadas"
          itens={disponibilidades}
          chave={(item) => item.id}
          renderizarItem={(item) => (
            <CartaoDisponibilidade
              id={item.id}
              local={item.local}
              raioKm={item.raio_busca_km}
              urgencia={item.urgencia}
              status={item.status}
              expiraEm={item.expira_em}
              propostasPendentes={item.propostas_pendentes}
              ativa={ativa?.id === item.id}
              aoUsar={usar}
              aoCancelar={pedirCancelamento}
            />
          )}
        />
      </ConteudoLista>

      <DialogoConfirmacao
        aberto={aberto}
        titulo="Cancelar esta disponibilidade?"
        descricao="Você sai da busca e as propostas pendentes feitas com ela serão recusadas. Não dá para desfazer."
        rotuloConfirmar="Cancelar disponibilidade"
        rotuloCancelar="Voltar"
        rotuloCarregando="Cancelando…"
        variante="perigo"
        carregando={cancelar.isPending}
        erro={erroDoDialogo}
        aoConfirmar={confirmar}
        aoFechar={() => setAberto(false)}
        refRetorno={refAviso}
      />
    </>
  );
}
