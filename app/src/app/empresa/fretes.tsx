// Meus fretes da empresa (MVP-17, CT-01 a CT-10): acompanha a entrega e paga pela plataforma.
// Atualiza sozinha a cada ~10 s com a aba visível (CT-09); a comissão só aparece como a API devolveu.
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { eFreteDaEmpresa, useMeusFretes, usePagarFrete } from '@/api/fretes';
import type { RespostaMeusFretes } from '@/api/tipos';
import { Link } from '@/components/atoms/Link';
import { Banner } from '@/components/molecules/Banner';
import { Lista } from '@/components/molecules/Lista';
import {
  CartaoFreteEmpresa,
  type PagamentoRegistrado,
} from '@/components/organisms/CartaoFreteEmpresa';
import { useCasca } from '@/components/organisms/useCasca';
import { TemplateLista, type EstadoLista } from '@/components/templates/TemplateLista';
import { useAnunciarNovidades } from '@/hooks/useAnunciarNovidades';
import { anunciar } from '@/lib/a11y';
import { descreverMudancasFretesEmpresa } from '@/lib/descreverMudancasFretes';
import { ErroApi } from '@/lib/erros';
import type { TemaVisual } from '@/state/tema/montarTema';
import { useEstilos } from '@/state/tema/useEstilos';

const ANUNCIO_PAGAMENTO = 'Pagamento registrado';

/** Só a mensagem de erro de negócio (403, 404, 409 com `erro`) aparece; 500 e falhas usam o padrão. */
function mensagemDeErro(erro: unknown): string | undefined {
  return erro instanceof ErroApi && erro.tipo === 'mensagem' ? erro.mensagens.join(' ') : undefined;
}

function criarEstilos({ space }: TemaVisual) {
  return { bloco: { gap: space[4] } } as const;
}

export default function FretesDaEmpresa() {
  const { cabecalho, abas, habilitado } = useCasca();
  const estilos = useEstilos(criarEstilos);
  const consulta = useMeusFretes({ automatico: true, habilitado });
  const pagar = usePagarFrete();
  const fretes = useMemo(
    () => (consulta.data?.fretes ?? []).filter(eFreteDaEmpresa),
    [consulta.data],
  );

  const [pagamentos, setPagamentos] = useState<Record<string, PagamentoRegistrado>>({});
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
    const { transacao } = await pagar.mutateAsync(freteId);
    // Valores exatamente como a API devolveu (D-PO-06); o resumo monta antes de o diálogo fechar.
    setPagamentos((atuais) => ({
      ...atuais,
      [freteId]: {
        valorFrete: transacao.valor_frete,
        percentualComissao: transacao.percentual_comissao,
        valorComissao: transacao.valor_comissao,
        statusPagamento: transacao.status_pagamento,
      },
    }));
    anunciar(ANUNCIO_PAGAMENTO);
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
    <TemplateLista
      titulo="Meus fretes"
      descricao="Acompanhe a entrega de cada frete e pague pela plataforma."
      cabecalho={cabecalho}
      abas={abas}
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
    </TemplateLista>
  );
}
