// Corpo de "Minhas disponibilidades" do motorista (MVP-11, CT-01 a CT-10; cancelar: MVP-22, card 034).
// Abre por React.lazy (`CorpoMinhasDisponibilidades.carregar.ts`), fora do JS inicial da rota, já com o
// cliente de dados: a mutation de cancelar precisa dele (ADR 0004, adendo). A lista e a ativa vêm do
// provider da área (DisponibilidadeAtivaProvider), que também cuida do plano B. Sem atualização
// automática: só "Atualizar".
import { useEffect, useRef, useState } from 'react';
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
  // Troca de ativa a anunciar: o texto fica no ref e o contador só dispara o efeito abaixo. Sai depois
  // que a releitura termina.
  const [pedidosDeAnuncio, setPedidosDeAnuncio] = useState(0);
  const anuncioPendente = useRef<string | null>(null);
  // Ao fechar o diálogo, o foco vai ao aviso (depois de cancelar). Sem aviso, volta a quem abriu.
  const refAviso = useRef<View>(null);
  const recuperacaoFeita = useRef(false);

  // Chunk das consultas que falhou antes (sem conexão): o provider ficou em erro enquanto este corpo
  // estava fora do ar. Ao montar com o chunk de volta, relê uma vez, para um "Tentar de novo" bastar.
  useEffect(() => {
    if (!erro || recuperacaoFeita.current) return;
    recuperacaoFeita.current = true;
    void atualizar();
  }, [erro, atualizar]);

  // O "Lista atualizada" do BotaoAtualizar sai no efeito do filho, que roda antes deste efeito do pai:
  // a troca de ativa fica por último na região viva.
  useEffect(() => {
    if (anuncioPendente.current === null || atualizando) return;
    anunciar(anuncioPendente.current);
    anuncioPendente.current = null;
  }, [pedidosDeAnuncio, atualizando]);

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
    setAviso(null);
    if (escolhida) anunciar(`Disponibilidade ativa: ${descreverLocal(escolhida)}`);
  };

  const atualizarLista = () => {
    setAviso(null);
    return atualizar();
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
      // Só termina depois que a lista foi relida: o cartão já mostra "Cancelada" quando a tela segue.
      await cancelar.mutateAsync(pedido.id);
    } catch (falha) {
      // 409: já não está aberta (pode ser prazo vencido). 404: não existe ou é de outro motorista. Nos
      // dois casos não se marca nada como cancelado: sai só a escolha e a cópia local, e a lista é
      // relida para a API dizer o estado (ex.: "Expirada"). O foco vai ao aviso com a mensagem da API.
      if (eStatus(falha, 409) || eStatus(falha, 404)) {
        marcarCancelada(pedido.id);
        setAviso({
          variante: 'erro',
          titulo: 'Não foi possível cancelar.',
          texto: mensagemDeErro(falha),
        });
        setAberto(false);
        await atualizar();
      } else {
        setErroDoDialogo(mensagemDeErro(falha));
      }
      return;
    }

    // A ativa vem da lista já relida: marcarCancelada só limpa a escolha e a cópia local e devolve a
    // próxima ativa, para o texto do aviso e o anúncio.
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
      anuncioPendente.current = nova
        ? `Disponibilidade ativa: ${descreverLocal(nova)}`
        : 'Nenhuma disponibilidade ativa.';
      setPedidosDeAnuncio((n) => n + 1);
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
        aoAtualizar={atualizarLista}
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
