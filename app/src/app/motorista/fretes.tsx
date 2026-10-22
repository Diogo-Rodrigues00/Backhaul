// Meus fretes do motorista (MVP-16, card 027, D-PO-07 e D-PO-09, CT-09). Atualiza sozinha a cada
// 10 s com a aba visível: o pagamento feito pela empresa aparece e é anunciado sem mover o foco.
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { View } from 'react-native';

import { eFreteDoMotorista, useAtualizarStatusFrete, useMeusFretes } from '@/api/fretes';
import { chaves } from '@/api/chaves';
import type { RespostaMeusFretes, RespostaStatusFrete } from '@/api/tipos';
import { Link } from '@/components/atoms/Link';
import { Lista } from '@/components/molecules/Lista';
import { CartaoFreteMotorista, type AvisoFrete } from '@/components/organisms/CartaoFreteMotorista';
import { DialogoConfirmacao } from '@/components/organisms/DialogoConfirmacao';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { useAnunciarNovidades } from '@/hooks/useAnunciarNovidades';
import { anunciar } from '@/lib/a11y';
import { aplicarStatusFrete, descreverMudancasFretes } from '@/lib/descreverMudancasFretes';
import { ErroApi, MENSAGEM_FALHA } from '@/lib/erros';
import { proximoPassoFrete } from '@/lib/rotulos';

// Título e frase fixos: estão no HTML estático e são o LCP (ADR 0011).
const TITULO = 'Meus fretes';
const DESCRICAO = 'Acompanhe cada frete, inicie o transporte e confirme a entrega.';

type Destino = 'em_transito' | 'entregue';

interface Pedido {
  freteId: string;
  tipoCarga: string;
  destino: Destino;
}

/** Só a mensagem de erro de negócio da API (404, 409 com `erro`) aparece; o resto usa o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

function mensagemDoErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.mensagens.join(' ') : MENSAGEM_FALHA;
}

function eStatus(erro: unknown, status: number): boolean {
  return erro instanceof ErroApi && erro.status === status;
}

// Textos do diálogo (protótipo): o tipo da carga no título deixa claro qual frete vai mudar.
function textoDoDialogo(pedido: Pedido | null) {
  if (pedido === null) return { titulo: '', descricao: '', rotulo: '', carregando: '' };
  if (pedido.destino === 'em_transito') {
    return {
      titulo: `Iniciar o transporte de ${pedido.tipoCarga}?`,
      descricao: 'O status passa para Em trânsito e a hora de coleta é registrada.',
      rotulo: 'Iniciar transporte',
      carregando: 'Iniciando…',
    };
  }
  return {
    titulo: `Confirmar a entrega de ${pedido.tipoCarga}?`,
    descricao:
      'O status passa para Entregue. Se a empresa já pagou, o valor é liberado para você. Não dá para desfazer.',
    rotulo: 'Confirmar entrega',
    carregando: 'Confirmando…',
  };
}

/** Frases depois do 200: o anúncio da região viva e o texto do aviso no cartão. */
function resultadoDoPasso(destino: Destino, frete: RespostaStatusFrete['frete']) {
  if (destino === 'em_transito') {
    return { anuncio: 'Transporte iniciado', aviso: 'O frete está em trânsito.' };
  }
  const liberado = frete.status_pagamento === 'liberado';
  return {
    anuncio: liberado
      ? 'Entrega confirmada. Pagamento liberado ao motorista'
      : 'Entrega confirmada',
    aviso: liberado
      ? 'Entrega confirmada. Pagamento liberado ao motorista.'
      : 'Entrega confirmada.',
  };
}

export default function MeusFretes() {
  const { cabecalho, abas, habilitado } = useCasca();
  const cliente = useQueryClient();
  const consulta = useMeusFretes({ automatico: true, habilitado });
  const avancar = useAtualizarStatusFrete();
  const { refetch } = consulta;

  // O mesmo `GET /fretes/meus` serve a empresa; aqui só interessa a forma do motorista (`empresa`).
  const dados = consulta.data;
  const lista = useMemo(() => dados?.fretes.filter(eFreteDoMotorista), [dados]);

  // Pagamento feito pela empresa (CT-09): a frase vai à barra de novidades e à região viva.
  const [novidade, setNovidade] = useState('');
  useAnunciarNovidades(lista, (anterior, atual) => {
    const texto = descreverMudancasFretes(anterior, atual);
    setNovidade(texto ?? '');
    return texto;
  });

  const [atualizando, setAtualizando] = useState(false);
  const atualizar = useCallback(async () => {
    setAtualizando(true);
    try {
      await refetch();
    } finally {
      setAtualizando(false);
    }
  }, [refetch]);

  // Confirmação (D-PO-09). Ao cancelar o foco volta ao botão que abriu o diálogo; depois de uma
  // ação (ou do 409) volta ao cartão do frete, que existe mesmo quando o botão some.
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [aberto, setAberto] = useState(false);
  const [erroDoDialogo, setErroDoDialogo] = useState<string | undefined>();
  const [avisos, setAvisos] = useState<Readonly<Record<string, AvisoFrete>>>({});
  const retornoDoFoco = useRef<unknown>(null);
  const cartoes = useRef(new Map<string, View>());

  const definirAviso = (freteId: string, aviso: AvisoFrete | null) =>
    setAvisos((atuais) => {
      const { [freteId]: _anterior, ...resto } = atuais;
      return aviso ? { ...resto, [freteId]: aviso } : resto;
    });

  const abrirDialogo = (
    freteId: string,
    tipoCarga: string,
    destino: Destino,
    origem: View | null,
  ) => {
    retornoDoFoco.current = origem;
    setErroDoDialogo(undefined);
    definirAviso(freteId, null);
    setPedido({ freteId, tipoCarga, destino });
    setAberto(true);
  };

  const confirmar = async () => {
    if (pedido === null) return;
    const { freteId, destino } = pedido;
    let resposta: RespostaStatusFrete;
    try {
      resposta = await avancar.mutateAsync({ freteId, status: destino });
    } catch (erro) {
      if (eStatus(erro, 409)) {
        // Transição que a API não permite (o frete já andou em outro aparelho): mostra o motivo e recarrega.
        retornoDoFoco.current = cartoes.current.get(freteId) ?? null;
        definirAviso(freteId, { variante: 'erro', texto: mensagemDoErro(erro) });
        setAberto(false);
        void atualizar();
      } else {
        setErroDoDialogo(mensagemDoErro(erro));
      }
      return;
    }

    // Status, datas e pagamento do cartão vêm da resposta, sem esperar a próxima leitura.
    cliente.setQueryData<RespostaMeusFretes>(chaves.fretes.meus(), (atual) =>
      atual ? { fretes: aplicarStatusFrete(atual.fretes, resposta.frete) } : atual,
    );
    const { anuncio, aviso } = resultadoDoPasso(destino, resposta.frete);
    definirAviso(freteId, { variante: 'ok', titulo: 'Status atualizado.', texto: aviso });
    retornoDoFoco.current = cartoes.current.get(freteId) ?? null;
    setAberto(false);
    anunciar(anuncio);
  };

  let estado: EstadoLista;
  if (!habilitado) estado = 'carregando';
  else if (lista === undefined) estado = consulta.isError ? 'erro' : 'carregando';
  else estado = lista.length === 0 ? 'vazio' : 'pronto';

  const textos = textoDoDialogo(pedido);

  return (
    <>
      <TemplateLista
        titulo={TITULO}
        descricao={DESCRICAO}
        cabecalho={cabecalho}
        abas={abas}
        estado={estado}
        textoCarregando="Carregando fretes…"
        vazio={{
          titulo: 'Nenhum frete ainda',
          descricao: 'Quando uma empresa aceitar a sua proposta, o frete aparece aqui.',
          acao: <Link href="/motorista/propostas">Ver minhas propostas</Link>,
          icone: 'truck',
        }}
        erro={{
          mensagem: mensagemDeErro(consulta.error),
          aoTentarDeNovo: atualizar,
          tentando: atualizando,
        }}
        aoAtualizar={atualizar}
        atualizando={atualizando}
        novidade={{ titulo: novidade, atualizadoEm: consulta.dataUpdatedAt }}
      >
        <Lista
          rotulo="Fretes"
          itens={lista ?? []}
          chave={(frete) => frete.id}
          renderizarItem={(frete) => {
            const aoAvancar = (origem: View | null) => {
              const passo = proximoPassoFrete(frete.status_entrega);
              if (passo) abrirDialogo(frete.id, frete.tipo_carga, passo.status, origem);
            };
            return (
              <CartaoFreteMotorista
                ref={(no) => {
                  if (no) cartoes.current.set(frete.id, no);
                  else cartoes.current.delete(frete.id);
                }}
                tipoCarga={frete.tipo_carga}
                empresa={frete.empresa.razao_social}
                valorFinal={frete.valor_final}
                statusEntrega={frete.status_entrega}
                coletaEm={frete.coleta_em}
                entregaEm={frete.entrega_em}
                statusPagamento={frete.status_pagamento}
                aviso={avisos[frete.id]}
                aoAvancar={aoAvancar}
              />
            );
          }}
        />
      </TemplateLista>

      <DialogoConfirmacao
        aberto={aberto}
        titulo={textos.titulo}
        descricao={textos.descricao}
        rotuloConfirmar={textos.rotulo}
        rotuloCarregando={textos.carregando}
        carregando={avancar.isPending}
        erro={erroDoDialogo}
        aoConfirmar={confirmar}
        aoFechar={() => setAberto(false)}
        refRetorno={retornoDoFoco}
      />
    </>
  );
}
