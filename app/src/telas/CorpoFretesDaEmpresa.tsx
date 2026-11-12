// Corpo de "Meus fretes" da empresa (MVP-17, CT-01 a CT-10): acompanha a entrega e paga pela
// plataforma. Atualiza sozinho a cada ~10 s com a aba visível (CT-09); a comissão só aparece como a
// API devolveu. Abre por React.lazy (`CorpoFretesDaEmpresa.carregar.ts`), fora do JS inicial da rota.
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { eFreteDaEmpresa } from '@/api/fretes';
import { useMeusFretes, usePagarFrete } from '@/api/fretes.hooks';
import type { RespostaMeusFretes } from '@/api/tipos';
import { Link } from '@/components/atoms/Link';
import { Banner } from '@/components/molecules/Banner';
import { Lista } from '@/components/molecules/Lista';
import {
  CartaoFreteEmpresa,
  type PagamentoRegistrado,
} from '@/components/organisms/CartaoFreteEmpresa';
import { useCasca } from '@/components/organisms/useCasca';
import { ConteudoLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { useAnunciarNovidades } from '@/hooks/useAnunciarNovidades';
import { anunciar } from '@/lib/a11y';
import { descreverMudancasFretesEmpresa } from '@/lib/descreverMudancasFretes';
import { ErroApi } from '@/lib/erros';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

const ANUNCIO_PAGAMENTO = 'Pagamento registrado';
const ANUNCIO_PIX_GERADO = 'Pix gerado. Aguardando confirmação do pagamento';
// Transação pendente mas o Pix veio malformado (`lerPix` recusou): o pagamento não está "registrado".
const ANUNCIO_PIX_INDISPONIVEL =
  'Pagamento iniciado. O código Pix não ficou disponível; aguarde a confirmação.';
const INTERVALO_PIX_MS = 5_000;

/** Só a mensagem de erro de negócio (403, 404, 409 com `erro`) aparece; 500 e falhas usam o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

function criarEstilos({ space }: TemaVisual) {
  return { bloco: { gap: space[4] } } as const;
}

export default function CorpoFretesDaEmpresa() {
  const { habilitado } = useCasca();
  const estilos = useEstilos(criarEstilos);
  const pagar = usePagarFrete();
  // O Pix e o pagamento ficam só neste estado de tela: somem ao sair ou recarregar (dado de cobrança).
  const [pagamentos, setPagamentos] = useState<Record<string, PagamentoRegistrado>>({});
  // Enquanto algum Pix espera confirmação a lista vem a cada 5 s (e não 10 s); só com a aba visível.
  const [pixPendente, setPixPendente] = useState(false);
  const consulta = useMeusFretes({
    automatico: true,
    habilitado,
    intervaloMs: pixPendente ? INTERVALO_PIX_MS : undefined,
  });
  const fretes = useMemo(
    () => (consulta.data?.fretes ?? []).filter(eFreteDaEmpresa),
    [consulta.data],
  );
  const aguardandoPix = fretes.some(
    (frete) =>
      pagamentos[frete.id]?.pix !== undefined &&
      (frete.status_pagamento ?? pagamentos[frete.id]?.statusPagamento) === 'pendente',
  );
  if (aguardandoPix !== pixPendente) setPixPendente(aguardandoPix);
  const [conflito, setConflito] = useState<string | null>(null);
  const [novidade, setNovidade] = useState<string | undefined>(undefined);

  // Anuncia (sem mover o foco) e mostra na barra a mudança de status feita pelo motorista.
  const descrever = useCallback(
    (anterior: RespostaMeusFretes | undefined, atual: RespostaMeusFretes | undefined) => {
      const texto = descreverMudancasFretesEmpresa(anterior, atual);
      if (texto) setNovidade(texto);
      return texto;
    },
    [],
  );
  useAnunciarNovidades(consulta.data, descrever);

  async function pagarFrete(freteId: string) {
    setConflito(null);
    const { transacao, pix } = await pagar.mutateAsync(freteId);
    // Valores exatamente como a API devolveu (D-PO-06); o resumo monta antes de o diálogo fechar.
    setPagamentos((atuais) => ({
      ...atuais,
      [freteId]: {
        valorFrete: transacao.valor_frete,
        percentualComissao: transacao.percentual_comissao,
        valorComissao: transacao.valor_comissao,
        statusPagamento: transacao.status_pagamento,
        pix: pix
          ? {
              copiaECola: pix.copia_e_cola,
              qrCodeBase64: pix.qr_code_base64,
              expiraEm: pix.expira_em,
            }
          : undefined,
      },
    }));
    // Com Pix, o painel é o aviso (ainda não pagou); sem Pix (modo simulado), o pagamento já está feito,
    // salvo se a transação seguiu `pendente` (Pix ilegível): aí o aviso é o do cartão, não "registrado".
    anunciar(
      pix
        ? ANUNCIO_PIX_GERADO
        : transacao.status_pagamento === 'pendente'
          ? ANUNCIO_PIX_INDISPONIVEL
          : ANUNCIO_PAGAMENTO,
    );
  }

  function aoConflito(mensagem: string) {
    setConflito(mensagem);
    void consulta.refetch();
  }

  const estado: EstadoLista = consulta.isError
    ? 'erro'
    : consulta.isPending
      ? 'carregando'
      : fretes.length === 0
        ? 'vazio'
        : 'pronto';

  return (
    <ConteudoLista
      estado={estado}
      textoCarregando="Carregando fretes…"
      vazio={{
        titulo: 'Nenhum frete ainda',
        descricao: 'Aceite uma proposta para criar um frete.',
        acao: <Link href="/empresa/cargas">Minhas cargas</Link>,
        icone: 'truck',
      }}
      erro={{ mensagem: mensagemDeErro(consulta.error) }}
      novidade={{ titulo: novidade, atualizadoEm: consulta.dataUpdatedAt }}
      aoAtualizar={() => consulta.refetch()}
      atualizando={consulta.isFetching}
    >
      <View style={estilos.bloco}>
        {conflito ? (
          <Banner variante="aviso" titulo="Não foi possível pagar este frete">
            {conflito}
          </Banner>
        ) : null}
        <Lista
          rotulo="Fretes da empresa"
          itens={fretes}
          chave={(frete) => frete.id}
          renderizarItem={(frete) => (
            <CartaoFreteEmpresa
              id={frete.id}
              tipoCarga={frete.tipo_carga}
              valorFinal={frete.valor_final}
              statusEntrega={frete.status_entrega}
              coletaEm={frete.coleta_em}
              entregaEm={frete.entrega_em}
              statusPagamento={frete.status_pagamento}
              motorista={{
                nome: frete.motorista.nome_completo,
                veiculo: frete.motorista.veiculo_tipo,
                placa: frete.motorista.veiculo_placa,
              }}
              pagamento={pagamentos[frete.id]}
              aoPagar={() => pagarFrete(frete.id)}
              aoConflito={aoConflito}
            />
          )}
        />
      </View>
    </ConteudoLista>
  );
}
